// app/api/submit/route.js
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const dadosFormulario = await request.json();

    // Injetamos a "acao" para o nosso Gateway no Google saber o que fazer
    const payload = {
      acao: 'onboarding',
      ...dadosFormulario
    };

    const response = await fetch(process.env.GOOGLE_APPSCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      redirect: 'follow'
    });

    const data = await response.json();

    if (data.status === 'erro') {
      return NextResponse.json({ error: data.mensagem }, { status: 400 });
    }

    return NextResponse.json(data, { status: 200 });

  } catch (error) {
    console.error('Erro na submissão do Onboarding:', error);
    return NextResponse.json({ error: 'Falha no servidor Next.js' }, { status: 500 });
  }
}