# API de Agenda — Guia do Agente (n8n)

**Para:** Rafael / Agente WhatsApp (n8n)
**Sobre:** API de agendamento, cancelamento e reagendamento de reuniões com vendedores

---

## Visão geral

A API expõe 4 endpoints que o agente do WhatsApp pode chamar para gerenciar reuniões dos leads com os vendedores. O backend cuida de:

- Verificar se o horário pedido está dentro do plantão de algum vendedor
- Confirmar se o vendedor está realmente livre (Google Calendar)
- Escolher o vendedor de menor carga (round-robin)
- Criar evento com Google Meet automático
- Convidar lead, vendedor e suporte por email
- Atualizar o lead no CRM

---

## Autenticação

Todas as chamadas exigem o header:

```
x-agent-token: <AGENT_API_TOKEN>
```

O secret está no env var `AGENT_API_TOKEN` no Vercel (Production). Pede pro Filippe.

> Se o token estiver errado, ausente ou diferente, todos os endpoints retornam **401**.

---

## Endpoints

### 1. Agendar reunião — `POST /api/agenda/agendar`

Cria evento + atualiza o lead.

**Headers:**
```
Content-Type: application/json
x-agent-token: <SECRET>
```

**Body:**
```json
{
  "horarioISO": "2026-05-06T19:00:00-03:00",
  "idLead": "lead_1234567890",
  "idempotencyKey": "uuid-gerado-pelo-n8n",
  "durMin": 30
}
```

| Campo | Obrig | Descrição |
|---|---|---|
| `horarioISO` | sim | ISO 8601 com timezone, recomendado `-03:00` (BRT) |
| `idLead` | sim | ID do lead em `BD_Leads` (ex: `lead_xyz`). Lead **deve já existir**. |
| `idempotencyKey` | sim | UUID único da operação. Repetir a mesma chave em 1h retorna o mesmo resultado (sem criar novo evento). |
| `durMin` | não | Duração em minutos. Padrão: 30. |

**Resposta — sucesso:**
```json
{
  "status": "agendado",
  "eventId": "abc123xyz",
  "vendedor": {
    "email": "rafael@metodointento.com.br",
    "nome": "Rafael"
  },
  "horario": "2026-05-06T19:00:00-03:00",
  "horarioBR": "Terça-feira, 06/05 às 19h00",
  "meetLink": "https://meet.google.com/xxx-yyyy-zzz",
  "calendarLink": "https://calendar.google.com/event?eid=..."
}
```

**Resposta — sem vaga:**
```json
{
  "status": "sem_vaga",
  "motivo": "Vendedores de plantão estão ocupados nesse horário",
  "sugestoes": [
    { "horarioISO": "2026-05-06T19:30:00-03:00", "horarioBR": "Terça-feira, 06/05 às 19h30" },
    { "horarioISO": "2026-05-06T20:00:00-03:00", "horarioBR": "Terça-feira, 06/05 às 20h00" },
    { "horarioISO": "2026-05-07T19:00:00-03:00", "horarioBR": "Quarta-feira, 07/05 às 19h00" }
  ]
}
```

**Erros:**
- `400` — body inválido, campos faltando, horário inválido
- `401` — token inválido
- `404` — lead não encontrado
- `500` — falha interna

---

### 2. Listar sugestões — `GET /api/agenda/sugestoes?dias=3&durMin=30`

Retorna até 20 horários livres dos próximos `dias` (padrão 3, máximo 14).
Útil quando o lead pergunta "quais horários vocês têm?" sem propor um específico.

**Resposta:**
```json
{
  "status": "sucesso",
  "sugestoes": [
    { "horarioISO": "2026-05-06T19:00:00-03:00", "horarioBR": "Terça-feira, 06/05 às 19h00", "vendedoresLivres": 2 },
    ...
  ],
  "total": 18,
  "dias": 3,
  "durMin": 30
}
```

---

### 3. Cancelar reunião — `POST /api/agenda/cancelar`

Cancela evento no Calendar + limpa marcação no lead.

**Body:**
```json
{ "idLead": "lead_1234567890" }
```

**Resposta:**
```json
{ "status": "cancelado", "idLead": "lead_1234567890" }
```

> O sistema usa `gcal_event_id` armazenado no lead pra saber qual evento apagar.
> Lead também volta pra fase `Ativo WPP`.

---

### 4. Reagendar — `POST /api/agenda/reagendar`

Cancela o atual + cria novo no horário pedido. Atomicamente.

**Body:**
```json
{
  "idLead": "lead_1234567890",
  "novoHorarioISO": "2026-05-07T20:00:00-03:00",
  "idempotencyKey": "uuid-do-n8n"
}
```

**Resposta:** mesma estrutura de `/agendar` (sucesso ou sem_vaga). Se sem_vaga, o evento original permanece cancelado e o lead fica sem reunião — o agente precisa pedir nova sugestão pro lead.

---

## Fluxo recomendado no n8n

```
1. Lead manda mensagem: "quero marcar terça 19h"
   ↓
2. Agente parsea com LLM → "2026-05-06T19:00:00-03:00"
   ↓
3. Agente gera idempotencyKey (UUID v4)
   ↓
4. Agente chama POST /api/agenda/agendar
   ↓
5a. Resposta "agendado":
    → Agente: "Marquei sua reunião com {{vendedor.nome}} em {{horarioBR}}.
              Link Meet: {{meetLink}}"
    
5b. Resposta "sem_vaga":
    → Agente formata sugestões pro WPP:
       "Esse horário não tem vaga. Tenho:
        - Terça 06/05 às 19h30
        - Terça 06/05 às 20h00
        - Quarta 07/05 às 19h00
        Qual prefere?"
    → Espera resposta → volta ao passo 4
```

### Idempotency

**Importante**: gera **um UUID novo por tentativa de marcar**, não por lead. Se o lead disser depois "muda pra 20h", você gera um novo UUID. Mas se o n8n der retry da MESMA marcação por timeout, usa o mesmo UUID — assim evita marcar 2 vezes.

```js
// Pseudocódigo n8n
const idempotencyKey = crypto.randomUUID();
const tentativa = await fetch('/api/agenda/agendar', {
  method: 'POST', headers: {...}, body: JSON.stringify({...,idempotencyKey})
});
// Se der timeout, retry com MESMO idempotencyKey
```

---

## Exemplos de erro

**Token errado:**
```json
{ "status": "erro", "mensagem": "Não autorizado" }
```
→ HTTP 401

**Lead não existe:**
```json
{ "status": "erro", "mensagem": "lead não encontrado: lead_xyz" }
```
→ HTTP 404

**Horário muito próximo (< 4h):**
```json
{
  "status": "sem_vaga",
  "motivo": "Horário precisa ser pelo menos 4h à frente",
  "sugestoes": []
}
```
→ HTTP 200 (sucesso, mas sem vaga)

---

## Configuração do plantão

Cada vendedor tem `horarios_atendimento` em `BD_Vendedores` (col E), em JSON:

```json
{
  "seg": ["19:00-21:30"],
  "ter": ["19:00-21:30"],
  "qua": ["19:00-21:30"],
  "qui": [],
  "sex": [],
  "sab": [],
  "dom": []
}
```

- Chaves: `seg`, `ter`, `qua`, `qui`, `sex`, `sab`, `dom`
- Cada dia tem array de janelas no formato `"HH:MM-HH:MM"`
- Múltiplas janelas no mesmo dia: `["09:00-12:00","14:00-18:00"]`
- Vendedor sem `horarios_atendimento` (célula vazia) **não recebe reuniões**

---

## Limites e observações

- **Antecedência mínima:** 4 horas. Slots dentro de 4h são rejeitados.
- **Granularidade:** 30 em 30 minutos (19:00, 19:30, 20:00...).
- **Janela de busca de sugestões:** padrão 3 dias, máximo 14.
- **Round-robin:** quando vários vendedores cobrem o mesmo slot, o sistema escolhe o de menor número de reuniões no mês corrente.
- **Convidados sempre incluem:** lead, vendedor escolhido, `suporte@metodointento.com.br`.
- **Email de convite:** o Google Calendar envia automaticamente.
- **Idempotency cache:** 1h em memória do servidor.

---

## Suporte

Em caso de erro inesperado, manda pro Filippe:

1. Endpoint chamado
2. Body completo
3. Resposta recebida (status + body)
4. Timestamp da chamada

---

*Documento gerado por Filippe Ximenes — Intento Mentoria*
