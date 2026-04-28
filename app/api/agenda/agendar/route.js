export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import {
  freeBusyMulti,
  criarEvento,
  contarReunioesDoMes,
  dentroJanela,
  colideComBusy,
  slotsDentroJanelas,
  formatarHorarioBR,
} from '@/lib/googleCalendar';

const SUPORTE_EMAIL = 'suporte@metodointento.com.br';
const DUR_DEFAULT = 30;
const ANTECEDENCIA_MIN_HORAS = 4;
const DIAS_FRENTE = 3;
const TTL_IDEMPOTENCY_MS = 60 * 60 * 1000;

const idempotencyCache = new Map();

function checkIdempotency(key) {
  const v = idempotencyCache.get(key);
  if (!v) return null;
  if (Date.now() - v.ts > TTL_IDEMPOTENCY_MS) {
    idempotencyCache.delete(key);
    return null;
  }
  return v.response;
}
function saveIdempotency(key, response) {
  idempotencyCache.set(key, { ts: Date.now(), response });
}

async function gas(payload) {
  const res = await fetch(process.env.GOOGLE_APPSCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function POST(request) {
  // Auth
  const token = request.headers.get('x-agent-token');
  if (!token || token !== process.env.AGENT_API_TOKEN) {
    return NextResponse.json({ status: 'erro', mensagem: 'Não autorizado' }, { status: 401 });
  }

  let corpo;
  try { corpo = await request.json(); }
  catch { return NextResponse.json({ status: 'erro', mensagem: 'JSON inválido' }, { status: 400 }); }

  const { horarioISO, idLead, idempotencyKey, durMin } = corpo;
  if (!horarioISO || !idLead || !idempotencyKey) {
    return NextResponse.json({
      status: 'erro',
      mensagem: 'horarioISO, idLead e idempotencyKey são obrigatórios',
    }, { status: 400 });
  }

  const cached = checkIdempotency(idempotencyKey);
  if (cached) return NextResponse.json(cached);

  const inicio = new Date(horarioISO);
  if (isNaN(inicio.getTime())) {
    return NextResponse.json({ status: 'erro', mensagem: 'horarioISO inválido' }, { status: 400 });
  }
  const dur = durMin || DUR_DEFAULT;
  const fim = new Date(inicio.getTime() + dur * 60 * 1000);

  // Antecedência mínima
  const minimo = new Date(Date.now() + ANTECEDENCIA_MIN_HORAS * 60 * 60 * 1000);
  if (inicio < minimo) {
    return NextResponse.json({
      status: 'sem_vaga',
      motivo: `Horário precisa ser pelo menos ${ANTECEDENCIA_MIN_HORAS}h à frente`,
      sugestoes: [],
    });
  }

  try {
    // Busca lead
    const leadResp = await gas({ acao: 'buscarLead', idLead });
    if (leadResp.status !== 'sucesso') {
      return NextResponse.json({ status: 'erro', mensagem: 'lead não encontrado: ' + idLead }, { status: 404 });
    }
    const lead = leadResp.lead;

    // Busca vendedores ativos com horarios
    const vendResp = await gas({ acao: 'listarVendedoresAtendimento' });
    if (vendResp.status !== 'sucesso') {
      return NextResponse.json({ status: 'erro', mensagem: vendResp.mensagem || 'falha ao listar vendedores' }, { status: 500 });
    }
    const todosVendedores = vendResp.vendedores || [];

    // Filtra os com horarios_atendimento que cobrem o slot pedido
    const candidatos = todosVendedores.filter((v) => v.horarios && dentroJanela(v.horarios, inicio, dur));

    if (candidatos.length === 0) {
      const sugestoes = await gerarSugestoes(todosVendedores, dur);
      const response = { status: 'sem_vaga', motivo: 'Nenhum vendedor de plantão para esse horário', sugestoes };
      saveIdempotency(idempotencyKey, response);
      return NextResponse.json(response);
    }

    // freeBusy de todos os candidatos
    const emails = candidatos.map((v) => v.email);
    const busy = await freeBusyMulti(emails, inicio.toISOString(), fim.toISOString());

    // Filtra os que realmente estão livres
    const livres = candidatos.filter((v) => !colideComBusy(inicio, fim, busy[v.email] || []));

    if (livres.length === 0) {
      const sugestoes = await gerarSugestoes(todosVendedores, dur);
      const response = { status: 'sem_vaga', motivo: 'Vendedores de plantão estão ocupados nesse horário', sugestoes };
      saveIdempotency(idempotencyKey, response);
      return NextResponse.json(response);
    }

    // Round-robin: menor carga no mês
    let escolhido = livres[0];
    if (livres.length > 1) {
      const cargas = await Promise.all(
        livres.map((v) => contarReunioesDoMes(v.email).catch(() => Infinity).then((n) => ({ v, n })))
      );
      cargas.sort((a, b) => a.n - b.n);
      escolhido = cargas[0].v;
    }

    // Cria evento
    const evento = await criarEvento({
      vendedorEmail: escolhido.email,
      inicioISO: inicio.toISOString(),
      fimISO: fim.toISOString(),
      titulo: `Reunião — ${lead.nome}`,
      descricao: [
        `Lead: ${lead.nome}`,
        `Telefone: ${lead.telefone || '—'}`,
        `Email: ${lead.email || '—'}`,
        `Origem: ${lead.origem || '—'}`,
        lead.anotacoes ? `\nAnotações:\n${lead.anotacoes}` : '',
      ].filter(Boolean).join('\n'),
      convidados: [lead.email, escolhido.email, SUPORTE_EMAIL].filter(Boolean),
    });

    // Atualiza lead em BD_Leads
    await gas({
      acao: 'editarLead',
      idLead,
      vendedor: escolhido.email,
      dataProximaAcao: inicio.toISOString().slice(0, 10),
      gcalEventId: evento.eventId,
      porEmail: 'agente@sistema',
    });
    await gas({
      acao: 'moverLeadFase',
      idLead,
      novaFase: 'Reuniao agendada',
      porEmail: 'agente@sistema',
    });

    const response = {
      status: 'agendado',
      eventId: evento.eventId,
      vendedor: { email: escolhido.email, nome: escolhido.nome },
      horario: inicio.toISOString(),
      horarioBR: formatarHorarioBR(inicio.toISOString()),
      meetLink: evento.meetLink,
      calendarLink: evento.htmlLink,
    };
    saveIdempotency(idempotencyKey, response);
    return NextResponse.json(response);

  } catch (e) {
    console.error('[/api/agenda/agendar]', e);
    return NextResponse.json({ status: 'erro', mensagem: e.message }, { status: 500 });
  }
}

// Gera até 3 sugestões dos próximos slots livres em qualquer vendedor.
// Considera horarios declarados + freebusy + antecedência.
async function gerarSugestoes(vendedores, durMin) {
  const sugestoes = [];
  const slotsCandidatos = new Set();
  for (const v of vendedores) {
    if (!v.horarios) continue;
    const ss = slotsDentroJanelas(v.horarios, DIAS_FRENTE, durMin, ANTECEDENCIA_MIN_HORAS);
    for (const s of ss) slotsCandidatos.add(s);
  }
  const ordenados = [...slotsCandidatos].sort();
  if (ordenados.length === 0) return sugestoes;

  // Pega janela ampla pra checar busy
  const timeMin = ordenados[0];
  const timeMax = new Date(new Date(ordenados[ordenados.length - 1]).getTime() + durMin * 60 * 1000).toISOString();
  const emails = vendedores.filter((v) => v.horarios).map((v) => v.email);
  let busyByEmail = {};
  try { busyByEmail = await freeBusyMulti(emails, timeMin, timeMax); }
  catch (e) { console.warn('sugestoes freeBusy falhou:', e.message); }

  for (const iso of ordenados) {
    if (sugestoes.length >= 3) break;
    const inicio = new Date(iso);
    const fim = new Date(inicio.getTime() + durMin * 60 * 1000);
    // Pega vendedores cujo horario cobre + livre
    const livres = vendedores.filter((v) => v.horarios
      && dentroJanela(v.horarios, inicio, durMin)
      && !colideComBusy(inicio, fim, busyByEmail[v.email] || []));
    if (livres.length > 0) {
      sugestoes.push({ horarioISO: iso, horarioBR: formatarHorarioBR(iso) });
    }
  }
  return sugestoes;
}
