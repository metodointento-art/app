// app/api/auth/route.js
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();

    // A PEÇA QUE FALTAVA: Injetamos a "acao" para o Gateway do Google saber o que fazer
    const payload = {
      acao: 'login',
      email: body.email
    };

    const response = await fetch(process.env.GOOGLE_APPSCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      redirect: 'follow' // Necessário pois o Google faz um redirecionamento interno (302)
    });

    const data = await response.json();

    // Se o Google devolveu o erro tratado por nós
    if (data.status === 'erro') {
      return NextResponse.json({ error: data.mensagem }, { status: 400 });
    }

    return NextResponse.json(data, { status: 200 });

  } catch (error) {
    console.error('Erro na API Auth:', error);
    return NextResponse.json({ error: 'Falha no servidor Next.js' }, { status: 500 });
  }
}