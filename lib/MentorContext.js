'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

const MentorContext = createContext(null);

export function useMentor() {
  const ctx = useContext(MentorContext);
  if (!ctx) throw new Error('useMentor precisa estar dentro de MentorProvider');
  return ctx;
}

export function MentorProvider({ children }) {
  const router = useRouter();
  const [emailMentor, setEmailMentor] = useState('');
  const [primeiroNome, setPrimeiroNome] = useState('');
  const [alunos, setAlunos] = useState([]);
  const [carregandoAlunos, setCarregandoAlunos] = useState(true);
  const prefetched = useRef(new Set());

  // Auth gate
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      const email = user?.email?.toLowerCase() || (typeof window !== 'undefined' ? sessionStorage.getItem('emailLogado') : null);
      if (!email || !email.endsWith('@metodointento.com.br')) {
        router.push('/');
        return;
      }
      setEmailMentor(email);
      const primeiro = email.split('@')[0];
      setPrimeiroNome(primeiro.charAt(0).toUpperCase() + primeiro.slice(1));
    });
    return () => unsub();
  }, [router]);

  // Carrega lista de alunos uma vez (camada 1.1 cacheia 5min)
  useEffect(() => {
    if (!emailMentor) return;
    setCarregandoAlunos(true);
    fetch('/api/mentor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acao: 'listaAlunosMentor', email: emailMentor }),
    })
      .then(r => r.json())
      .then(d => {
        if (d.status === 'sucesso' || d.status === 200) setAlunos(d.alunos || []);
      })
      .catch(() => { /* silencia */ })
      .finally(() => setCarregandoAlunos(false));
  }, [emailMentor]);

  // Prefetch dos dados de um aluno (chamado on-hover) — depende do cache do API route
  const prefetchAluno = useCallback((idPlanilha) => {
    if (!idPlanilha || prefetched.current.has(idPlanilha)) return;
    prefetched.current.add(idPlanilha);
    fetch('/api/mentor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acao: 'buscarDadosAluno', idPlanilhaAluno: idPlanilha }),
    }).catch(() => prefetched.current.delete(idPlanilha));
  }, []);

  return (
    <MentorContext.Provider value={{ emailMentor, primeiroNome, alunos, carregandoAlunos, prefetchAluno }}>
      {children}
    </MentorContext.Provider>
  );
}
