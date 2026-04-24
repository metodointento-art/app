export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const dados = await request.json();
    console.log("👉 [API] Enviando para o Google a ação:", dados.acao);
    
    // O seu link atualizado:
    const GAS_URL = process.env.GOOGLE_APPSCRIPT_URL;

    const res = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados)
    });

    const respostaGoogle = await res.json();
    console.log("✅ [API] Resposta do Google:", respostaGoogle);
    
    return NextResponse.json(respostaGoogle);

  } catch (error) {
    console.error("❌ [API] Erro Crítico na Rota:", error);
    return NextResponse.json(
      { status: "erro", mensagem: "Falha na comunicação com o Google", detalhes: error.message }, 
      { status: 500 }
    );
  }
}