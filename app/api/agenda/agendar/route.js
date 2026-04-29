export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import {
  listarJanelasDisponibilidade,
  listarReunioesBooked,
  criarEvento,
  contarReunioesDoMes,
  dentroDeJanela,
  colideComReuniao,
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

  const minimo = new Date(Date.now() + ANTECEDENCIA_MIN_HORAS * 60 * 60 * 1000);
  if (inicio < minimo) {
    return NextResponse.json({
      status: 'sem_vaga',
      motivo: `Horário precisa ser pelo menos ${ANTECEDENCIA_MIN_HORAS}h à frente`,
      sugestoes: [],
    });
  }

  try {
    const leadResp = await gas({ acao: 'buscarLead', idLead });
    if (leadResp.status !== 'sucesso') {
      return NextResponse.json({ status: 'erro', mensagem: 'lead não encontrado: ' + idLead }, { status: 404 });
    }
    const lead = leadResp.lead;

    const vendResp = await gas({ acao: 'listarVendedoresAtendimento' });
    if (vendResp.status !== 'sucesso') {
      return NextResponse.json({ status: 'erro', mensagem: vendResp.mensagem || 'falha ao listar vendedores' }, { status: 500 });
    }
    const vendedores = vendResp.vendedores || [];

    if (vendedores.length === 0) {
      return NextResponse.json({ status: 'sem_vaga', motivo: 'Nenhum vendedor ativo cadastrado', sugestoes: [] });
    }

    // Pra cada vendedor: lê janelas declaradas + reuniões booked no entorno do slot
    // (com folga pra capturar janelas que abrangem o slot)
    const folgaMs = 24 * 60 * 60 * 1000;
    const timeMin = new Date(inicio.getTime() - folgaMs).toISOString();
    const timeMax = new Date(fim.getTime() + folgaMs).toISOString();

    const checks = await Promise.all(
      vendedores.map(async (v) => {
        try {
          const [janelas, booked] = await Promise.all([
            listarJanelasDisponibilidade(v.email, timeMin, timeMax),
            listarReunioesBooked(v.email, timeMin, timeMax),
          ]);
          return { v, janelas, booked };
        } catch (e) {
          console.warn(`[agendar] falha ao ler calendar de ${v.email}:`, e.message);
          return { v, janelas: [], booked: [], erro: e.message };
        }
      })
    );

    // Filtra os que têm janela cobrindo o slot E sem conflito com reuniões booked
    const livres = checks.filter(({ janelas, booked }) =>
      dentroDeJanela(inicio, fim, janelas) && !colideComReuniao(inicio, fim, booked)
    );

    if (livres.length === 0) {
      const sugestoes = await gerarSugestoes(vendedores, dur);
      const response = {
        status: 'sem_vaga',
        motivo: 'Nenhum vendedor com janela declarada disponível nesse horário',
        sugestoes,
      };
      saveIdempotency(idempotencyKey, response);
      return NextResponse.json(response);
    }

    // Round-robin: menor carga no mês
    let escolhido = livres[0].v;
    if (livres.length > 1) {
      const cargas = await Promise.all(
        livres.map(async ({ v }) => {
          try {
            const n = await contarReunioesDoMes(v.email);
            return { v, n };
          } catch {
            return { v, n: Infinity };
          }
        })
      );
      cargas.sort((a, b) => a.n - b.n);
      escolhido = cargas[0].v;
    }

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

// Gera até 3 sugestões dos próximos slots livres (qualquer vendedor com janela declarada).
async function gerarSugestoes(vendedores, durMin) {
  const sugestoes = [];
  const agora = new Date();
  const timeMin = new Date(agora.getTime() + ANTECEDENCIA_MIN_HORAS * 60 * 60 * 1000).toISOString();
  const timeMax = new Date(agora.getTime() + DIAS_FRENTE * 24 * 60 * 60 * 1000).toISOString();

  // Pra cada vendedor, pega janelas + reuniões booked
  const dados = await Promise.all(
    vendedores.map(async (v) => {
      try {
        const [janelas, booked] = await Promise.all([
          listarJanelasDisponibilidade(v.email, timeMin, timeMax),
          listarReunioesBooked(v.email, timeMin, timeMax),
        ]);
        return { v, janelas, booked };
      } catch {
        return { v, janelas: [], booked: [] };
      }
    })
  );

  // Une todos os slots possíveis
  const slotsSet = new Set();
  for (const { janelas } of dados) {
    const ss = slotsDentroJanelas(janelas, durMin, ANTECEDENCIA_MIN_HORAS);
    for (const s of ss) slotsSet.add(s);
  }
  const ordenados = [...slotsSet].sort();

  for (const iso of ordenados) {
    if (sugestoes.length >= 3) break;
    const inicio = new Date(iso);
    const fim = new Date(inicio.getTime() + durMin * 60 * 1000);
    const algumLivre = dados.some(({ janelas, booked }) =>
      dentroDeJanela(inicio, fim, janelas) && !colideComReuniao(inicio, fim, booked)
    );
    if (algumLivre) sugestoes.push({ horarioISO: iso, horarioBR: formatarHorarioBR(iso) });
  }
  return sugestoes;
}
