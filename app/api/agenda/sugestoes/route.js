export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import {
  freeBusyMulti,
  dentroJanela,
  colideComBusy,
  slotsDentroJanelas,
  formatarHorarioBR,
} from '@/lib/googleCalendar';

const DUR_DEFAULT = 30;
const ANTECEDENCIA_MIN_HORAS = 4;
const DIAS_DEFAULT = 3;
const MAX_SUGESTOES = 20;

async function gas(payload) {
  const res = await fetch(process.env.GOOGLE_APPSCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function GET(request) {
  const token = request.headers.get('x-agent-token');
  if (!token || token !== process.env.AGENT_API_TOKEN) {
    return NextResponse.json({ status: 'erro', mensagem: 'Não autorizado' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const dias = Math.min(parseInt(searchParams.get('dias') || DIAS_DEFAULT, 10), 14);
  const dur = parseInt(searchParams.get('durMin') || DUR_DEFAULT, 10);

  try {
    const vendResp = await gas({ acao: 'listarVendedoresAtendimento' });
    if (vendResp.status !== 'sucesso') {
      return NextResponse.json({ status: 'erro', mensagem: vendResp.mensagem || 'falha ao listar vendedores' }, { status: 500 });
    }
    const vendedores = (vendResp.vendedores || []).filter((v) => v.horarios);

    if (vendedores.length === 0) {
      return NextResponse.json({ status: 'sucesso', sugestoes: [], total: 0 });
    }

    // Coleta todos os slots candidatos (união entre vendedores)
    const slotsSet = new Set();
    for (const v of vendedores) {
      const ss = slotsDentroJanelas(v.horarios, dias, dur, ANTECEDENCIA_MIN_HORAS);
      for (const s of ss) slotsSet.add(s);
    }
    const ordenados = [...slotsSet].sort();
    if (ordenados.length === 0) {
      return NextResponse.json({ status: 'sucesso', sugestoes: [], total: 0 });
    }

    // freeBusy pra todos os vendedores na janela
    const timeMin = ordenados[0];
    const timeMax = new Date(new Date(ordenados[ordenados.length - 1]).getTime() + dur * 60 * 1000).toISOString();
    const busy = await freeBusyMulti(vendedores.map((v) => v.email), timeMin, timeMax);

    const sugestoes = [];
    for (const iso of ordenados) {
      if (sugestoes.length >= MAX_SUGESTOES) break;
      const inicio = new Date(iso);
      const fim = new Date(inicio.getTime() + dur * 60 * 1000);
      const livres = vendedores.filter((v) => dentroJanela(v.horarios, inicio, dur)
        && !colideComBusy(inicio, fim, busy[v.email] || []));
      if (livres.length > 0) {
        sugestoes.push({
          horarioISO: iso,
          horarioBR: formatarHorarioBR(iso),
          vendedoresLivres: livres.length,
        });
      }
    }

    return NextResponse.json({ status: 'sucesso', sugestoes, total: sugestoes.length, dias, durMin: dur });

  } catch (e) {
    console.error('[/api/agenda/sugestoes]', e);
    return NextResponse.json({ status: 'erro', mensagem: e.message }, { status: 500 });
  }
}
