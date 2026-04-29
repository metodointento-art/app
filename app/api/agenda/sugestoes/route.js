export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import {
  listarJanelasDisponibilidade,
  listarReunioesBooked,
  dentroDeJanela,
  colideComReuniao,
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
    const vendedores = vendResp.vendedores || [];
    if (vendedores.length === 0) {
      return NextResponse.json({ status: 'sucesso', sugestoes: [], total: 0 });
    }

    const agora = new Date();
    const timeMin = new Date(agora.getTime() + ANTECEDENCIA_MIN_HORAS * 60 * 60 * 1000).toISOString();
    const timeMax = new Date(agora.getTime() + dias * 24 * 60 * 60 * 1000).toISOString();

    // Pra cada vendedor, lê janelas + reuniões booked em paralelo
    const dados = await Promise.all(
      vendedores.map(async (v) => {
        try {
          const [janelas, booked] = await Promise.all([
            listarJanelasDisponibilidade(v.email, timeMin, timeMax),
            listarReunioesBooked(v.email, timeMin, timeMax),
          ]);
          return { v, janelas, booked };
        } catch (e) {
          console.warn(`[sugestoes] erro lendo calendar de ${v.email}:`, e.message);
          return { v, janelas: [], booked: [] };
        }
      })
    );

    // Une todos os slots candidatos a partir das janelas declaradas
    const slotsSet = new Set();
    for (const { janelas } of dados) {
      const ss = slotsDentroJanelas(janelas, dur, ANTECEDENCIA_MIN_HORAS);
      for (const s of ss) slotsSet.add(s);
    }
    const ordenados = [...slotsSet].sort();
    if (ordenados.length === 0) {
      return NextResponse.json({ status: 'sucesso', sugestoes: [], total: 0, dias, durMin: dur });
    }

    const sugestoes = [];
    for (const iso of ordenados) {
      if (sugestoes.length >= MAX_SUGESTOES) break;
      const inicio = new Date(iso);
      const fim = new Date(inicio.getTime() + dur * 60 * 1000);
      const livresCount = dados.filter(({ janelas, booked }) =>
        dentroDeJanela(inicio, fim, janelas) && !colideComReuniao(inicio, fim, booked)
      ).length;
      if (livresCount > 0) {
        sugestoes.push({
          horarioISO: iso,
          horarioBR: formatarHorarioBR(iso),
          vendedoresLivres: livresCount,
        });
      }
    }

    return NextResponse.json({ status: 'sucesso', sugestoes, total: sugestoes.length, dias, durMin: dur });

  } catch (e) {
    console.error('[/api/agenda/sugestoes]', e);
    return NextResponse.json({ status: 'erro', mensagem: e.message }, { status: 500 });
  }
}
