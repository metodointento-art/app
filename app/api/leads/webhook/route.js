export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

// Aceita 2 formatos de payload do Typebot/Make:
// (A) já mapeado: { nome, tipoPerfil, nomeRelacionado, telefone, ... }
// (B) cru do Typebot do Rafael: { name, nome_acr, nome_asr, nome_pais, nome_filho,
//      nome_responsavel, phone_formatted, medicina_ou_outros, editais_interesse, etc. }
// Em (B) o webhook decide tipoPerfil/nome/nomeRelacionado e concatena os extras
// (modalidade, motivo, histórico WPP) em `anotacoes`. Tudo o que vem cru é
// preservado em dados_typebot_raw na BD_Leads.
function normalizarPayload(corpo) {
  let nome = corpo.nome || '';
  let tipoPerfil = corpo.tipoPerfil || '';
  let nomeRelacionado = corpo.nomeRelacionado || '';

  if (!nome) {
    if (corpo.nome_pais) {
      tipoPerfil = 'pai';
      nome = corpo.nome_pais;
      nomeRelacionado = corpo.nome_filho || '';
    } else if (corpo.nome_acr) {
      tipoPerfil = 'self';
      nome = corpo.nome_acr;
      nomeRelacionado = corpo.nome_responsavel || '';
    } else if (corpo.nome_asr) {
      tipoPerfil = 'self';
      nome = corpo.nome_asr;
      nomeRelacionado = '';
    } else if (corpo.name) {
      tipoPerfil = tipoPerfil || 'self';
      nome = corpo.name;
    }
  }

  if (!tipoPerfil) tipoPerfil = 'self';

  const telefone = corpo.telefone || corpo.phone_formatted || '';

  // Extras do Typebot que não cabem em colunas dedicadas vão pra anotações.
  // Preservados também em dados_typebot_raw (JSON cru).
  const linhasAnotacao = [
    corpo.anotacoes,
    corpo.esta_em ? `Modalidade: ${corpo.esta_em}` : null,
    corpo.motivo_busca ? `Motivo da busca: ${corpo.motivo_busca}` : null,
    corpo.deseja_comecar_em ? `Quer começar em: ${corpo.deseja_comecar_em}` : null,
    corpo.autoavaliacao_progresso ? `Autoavaliação progresso: ${corpo.autoavaliacao_progresso}` : null,
    corpo.finalizou_aplicacao ? `Finalizou typebot: ${corpo.finalizou_aplicacao}` : null,
    corpo.nome_asr ? '⚠ Aluno SEM responsável financeiro' : null,
    corpo.historico_conversa ? `\nHistórico WPP:\n${corpo.historico_conversa}` : null,
  ].filter(Boolean);

  return {
    nome,
    tipoPerfil,
    nomeRelacionado,
    telefone,
    email: corpo.email || '',
    cidade: corpo.cidade || '',
    estado: corpo.estado || '',
    orcamento: corpo.orcamento || corpo.orcamento_referido || '',
    tempoPreparando: corpo.tempoPreparando || corpo.estuda_ha || '',
    vestibulares: corpo.vestibulares || corpo.editais_interesse || '',
    cursoInteresse: corpo.cursoInteresse || corpo.medicina_ou_outros || '',
    origem: corpo.origem || '',
    indicadoPor: corpo.indicadoPor || corpo.mentor_indicacao || corpo.aluno_indicacao || '',
    anotacoes: linhasAnotacao.join('\n'),
    dadosTypebotRaw: corpo,
  };
}

export async function POST(request) {
  const segredo = request.headers.get('x-webhook-secret');
  const esperado = process.env.LEADS_WEBHOOK_SECRET;
  if (!esperado || segredo !== esperado) {
    return NextResponse.json({ status: 'erro', mensagem: 'Não autorizado' }, { status: 401 });
  }

  try {
    const corpo = await request.json();
    const norm = normalizarPayload(corpo);

    if (!norm.nome || !norm.telefone) {
      return NextResponse.json(
        { status: 'erro', mensagem: 'nome e telefone são obrigatórios (envie nome OU nome_acr/nome_asr/nome_pais/name + telefone OU phone_formatted)' },
        { status: 400 }
      );
    }

    const payload = {
      acao: 'criarLead',
      porEmail: 'webhook@sistema',
      vendedor: '',
      fase: 'Lead',
      ...norm,
    };

    const res = await fetch(process.env.GOOGLE_APPSCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    if (data.status === 'erro') return NextResponse.json(data, { status: 500 });
    return NextResponse.json(data);

  } catch (error) {
    console.error('[webhook leads] erro:', error);
    return NextResponse.json(
      { status: 'erro', mensagem: error.message },
      { status: 500 }
    );
  }
}
