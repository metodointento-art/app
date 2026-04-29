# API de Agenda — Guia do Agente (n8n)

**Para:** Rafael / Agente WhatsApp (n8n)
**Sobre:** API de agendamento, cancelamento e reagendamento de reuniões com vendedores

---

## Visão geral

A API expõe 4 endpoints que o agente do WhatsApp pode chamar para gerenciar reuniões dos leads com os vendedores. O backend cuida de:

- Verificar se o horário pedido cai dentro de uma **janela declarada** pelo vendedor (no Google Calendar dele)
- Confirmar que o vendedor não tem outra reunião marcada pelo nosso sistema no mesmo horário
- Escolher o vendedor de menor carga (round-robin)
- Criar evento com Google Meet automático
- Convidar lead, vendedor e suporte por email
- Atualizar o lead no CRM

---

## Como o vendedor declara disponibilidade

Cada vendedor cria eventos no **próprio Google Calendar** com o **título começando com `[Intento]`**. Esses eventos são lidos como **janelas de plantão**.

Exemplo:
- Título: `[Intento] Disponível`
- Início: terça 19:00
- Fim: terça 21:30
- Recorrência: semanal (toda terça)

> O vendedor é responsável por ajustar a recorrência/eventos quando estiver de férias, doente, etc. Não declarar uma janela = não receber reuniões nesse período.

> Vendedor também é responsável por não declarar disponibilidade quando tem outros compromissos. O sistema **não** faz duplo-check contra outros eventos do calendar — confia na declaração.

---

## Autenticação

Todas as chamadas exigem o header:

```
x-agent-token: <AGENT_API_TOKEN>
```

O secret está no env var `AGENT_API_TOKEN` no Vercel (Production). Pede pro Filippe.

> Token errado, ausente ou diferente → resposta **401**.

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
| `idempotencyKey` | sim | UUID único da operação. Repetir a mesma chave em 1h retorna o mesmo resultado. |
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
  "motivo": "Nenhum vendedor com janela declarada disponível nesse horário",
  "sugestoes": [
    { "horarioISO": "2026-05-06T19:30:00-03:00", "horarioBR": "Terça-feira, 06/05 às 19h30" },
    { "horarioISO": "2026-05-06T20:00:00-03:00", "horarioBR": "Terça-feira, 06/05 às 20h00" },
    { "horarioISO": "2026-05-07T19:00:00-03:00", "horarioBR": "Quarta-feira, 07/05 às 19h00" }
  ]
}
```

---

### 2. Listar sugestões — `GET /api/agenda/sugestoes?dias=3&durMin=30`

Retorna até 20 horários livres dos próximos `dias` (padrão 3, máximo 14). Útil quando o lead pergunta "quais horários vocês têm?".

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

```json
{ "idLead": "lead_1234567890" }
```

Resposta: `{ "status": "cancelado", "idLead": "..." }`

> Lead volta pra fase `Ativo WPP`.

---

### 4. Reagendar — `POST /api/agenda/reagendar`

```json
{
  "idLead": "lead_1234567890",
  "novoHorarioISO": "2026-05-07T20:00:00-03:00",
  "idempotencyKey": "uuid-do-n8n"
}
```

Resposta: mesma estrutura de `/agendar` (sucesso ou sem_vaga).

---

## Fluxo recomendado no n8n

```
Lead manda: "quero marcar terça 19h"
    ↓
Agente parsea o horário → "2026-05-06T19:00:00-03:00"
    ↓
Agente gera idempotencyKey (UUID v4)
    ↓
POST /api/agenda/agendar
    ↓
"agendado" → "Marquei sua reunião com X em DD/MM HH:MM. Link Meet: ..."
    ↓
"sem_vaga" → mostra sugestoes pro lead, espera escolha, repete
```

### Idempotency

Gera **um UUID novo por tentativa de marcar**, não por lead. Em retry de timeout, **mantém o mesmo UUID** pra evitar marcação duplicada.

---

## Limites e observações

- **Antecedência mínima:** 4 horas. Slots dentro de 4h são rejeitados.
- **Granularidade:** 30 em 30 minutos.
- **Janela de busca de sugestões:** padrão 3 dias, máximo 14.
- **Round-robin:** quando vários vendedores têm janela cobrindo o slot, o sistema escolhe o de menor número de reuniões marcadas no mês corrente.
- **Convidados sempre incluem:** lead, vendedor escolhido, `suporte@metodointento.com.br`.
- **Convite por email:** o Google Calendar envia automaticamente.
- **Idempotency cache:** 1h em memória do servidor.
- **Sem horário comercial fixo** — quem define é cada vendedor pelos eventos `[Intento] *` no calendar próprio. Se ninguém declarar disponibilidade, retorna sem vagas.

---

## Erros comuns

| Resposta | Causa |
|---|---|
| `401 Não autorizado` | header `x-agent-token` ausente ou errado |
| `400 horarioISO inválido` | string ISO mal formatada |
| `404 lead não encontrado` | `idLead` não existe em `BD_Leads` |
| `sem_vaga` | nenhum vendedor com janela `[Intento]` cobrindo o slot |

---

## Suporte

Em caso de erro inesperado, manda pro Filippe:

1. Endpoint chamado
2. Body completo
3. Resposta recebida (status + body)
4. Timestamp da chamada

---

*Documento gerado por Filippe Ximenes — Intento Mentoria*
