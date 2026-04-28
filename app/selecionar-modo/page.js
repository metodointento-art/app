'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { LoadingScreen } from '@/components/Loading';

const EMAILS_LIDER = ['filippe@metodointento.com.br', 'rafael@metodointento.com.br'];

export default function SelecionarModo() {
  const router = useRouter();
  const [primeiroNome, setPrimeiroNome] = useState('');
  const [autorizado, setAutorizado] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      const email = user?.email?.toLowerCase() || (typeof window !== 'undefined' ? sessionStorage.getItem('emailLogado') : null);

      if (!email) { router.push('/'); return; }

      if (!EMAILS_LIDER.includes(email)) {
        // Outro mentor → manda direto pro painel do mentor
        if (email.endsWith('@metodointento.com.br')) router.push('/mentor');
        else router.push('/painel');
        return;
      }

      const primeiro = email.split('@')[0];
      setPrimeiroNome(primeiro.charAt(0).toUpperCase() + primeiro.slice(1));
      setAutorizado(true);
    });
    return () => unsub();
  }, [router]);

  if (!autorizado) return <LoadingScreen mensagem="Carregando..." />;

  const sair = async () => {
    await auth.signOut();
    sessionStorage.removeItem('emailLogado');
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">

      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-1 h-5 bg-intento-yellow rounded-sm"/>
          <span className="font-bold text-intento-blue text-sm tracking-wider">INTENTO</span>
        </div>
        <button onClick={sair} className="text-sm font-semibold text-slate-400 hover:text-red-500 transition-colors">
          Sair
        </button>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-3xl">
          <h1 className="text-2xl font-bold text-intento-blue text-center mb-2">
            Bem-vindo, {primeiroNome}
          </h1>
          <p className="text-sm text-slate-500 font-medium text-center mb-10">
            Em qual modo você deseja entrar?
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            {/* Card Mentor */}
            <button
              onClick={() => router.push('/mentor')}
              className="bg-white rounded-2xl border-2 border-slate-200 p-8 shadow-sm hover:border-intento-blue hover:shadow-md transition-all text-left group"
            >
              <div className="w-14 h-14 rounded-full bg-intento-blue/10 group-hover:bg-intento-blue/15 flex items-center justify-center mb-5 transition-colors">
                <svg className="w-7 h-7 text-intento-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>
                </svg>
              </div>
              <h2 className="text-base font-bold text-intento-blue mb-1.5">Painel do Mentor</h2>
              <p className="text-xs text-slate-500 leading-relaxed mb-5">
                Acompanhe seus mentorados, registre encontros e analise dados individuais.
              </p>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-intento-blue group-hover:gap-2.5 transition-all">
                <span>Entrar</span>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
              </div>
            </button>

            {/* Card Líder */}
            <button
              onClick={() => router.push('/lider')}
              className="bg-white rounded-2xl border-2 border-slate-200 p-8 shadow-sm hover:border-intento-yellow hover:shadow-md transition-all text-left group"
            >
              <div className="w-14 h-14 rounded-full bg-intento-yellow/15 group-hover:bg-intento-yellow/25 flex items-center justify-center mb-5 transition-colors">
                <svg className="w-7 h-7 text-intento-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                </svg>
              </div>
              <h2 className="text-base font-bold text-intento-blue mb-1.5">Painel do Líder</h2>
              <p className="text-xs text-slate-500 leading-relaxed mb-5">
                Visão geral da operação: mentores, alunos, métricas agregadas e gestão.
              </p>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-intento-yellow group-hover:gap-2.5 transition-all">
                <span>Entrar</span>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
              </div>
            </button>

            {/* Card CRM / Vendas */}
            <button
              onClick={() => router.push('/vendas')}
              className="bg-white rounded-2xl border-2 border-slate-200 p-8 shadow-sm hover:border-emerald-500 hover:shadow-md transition-all text-left group"
            >
              <div className="w-14 h-14 rounded-full bg-emerald-500/10 group-hover:bg-emerald-500/15 flex items-center justify-center mb-5 transition-colors">
                <svg className="w-7 h-7 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                </svg>
              </div>
              <h2 className="text-base font-bold text-intento-blue mb-1.5">CRM / Vendas</h2>
              <p className="text-xs text-slate-500 leading-relaxed mb-5">
                Pipeline de leads, acompanhamento de vendedores e conversões.
              </p>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 group-hover:gap-2.5 transition-all">
                <span>Entrar</span>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
              </div>
            </button>

          </div>
        </div>
      </div>
    </div>
  );
}
