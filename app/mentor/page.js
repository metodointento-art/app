'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ModalRegistro from '../../components/ModalRegistro';

// 1. Importa a Autenticação do Firebase
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

const cardClass = "bg-white rounded-xl border border-[rgba(6,2,66,0.12)] p-6 shadow-sm";

export default function PainelGlobalMentor() {
  const router = useRouter();
  
  // Estados do Painel
  const [mentorLogado, setMentorLogado] = useState(""); // Vai guardar o "Nome" extraído do e-mail para ficar bonito na tela
  const [alunos, setAlunos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  
  // Estado do Modal (A Peça de Lego)
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 2. A MÁGICA: O Firebase assume o controle da identidade
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      // Pega o e-mail oficial (Firebase ou SessionStorage)
      const emailMentor = (user && user.email) ? user.email.toLowerCase() : sessionStorage.getItem('emailLogado');

      // Se não houver e-mail, ou se não for um e-mail oficial da equipa, rua!
      if (!emailMentor || !emailMentor.endsWith('@metodointento.com.br')) {
        router.push('/');
        return;
      }

      // Deixa o nome bonito para o "Bem-vindo" (Pega o que está antes do @ e capitaliza)
      let primeiroNome = emailMentor.split('@')[0];
      primeiroNome = primeiroNome.charAt(0).toUpperCase() + primeiroNome.slice(1);
      setMentorLogado(primeiroNome);

      // Busca os alunos no Google Sheets (passando APENAS o e-mail)
      try {
        const res = await fetch('/api/mentor', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ acao: 'listaAlunosMentor', email: emailMentor })
        });
        
        const data = await res.json();
        
        if (data.status === 'sucesso' || data.status === 200) {
          setAlunos(data.alunos || []);
        } else {
          console.error("Erro do servidor:", data.mensagem);
        }
      } catch (e) {
        console.error("Erro de conexão ao buscar alunos:", e);
      } finally {
        setCarregando(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  // =========================================================================
  // TELA DE CARREGAMENTO (Enquanto o Firebase pensa)
  // =========================================================================
  if (carregando) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-sans">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#060242] mb-4"></div>
        <p className="text-[#060242] font-bold animate-pulse">Sincronizando Painel...</p>
      </div>
    );
  }

  // =========================================================================
  // PAINEL GLOBAL (DASHBOARD)
  // =========================================================================
  return (
    <div className="min-h-screen bg-slate-50 p-4 lg:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in">
        
        {/* Cabeçalho */}
        <div className="flex justify-between items-center border-b border-slate-200 pb-4">
          <div>
            <h1 className="text-3xl font-bold text-[#060242]">Painel do Mentor</h1>
            <p className="text-slate-500 font-medium">Bem-vindo(a), {mentorLogado}</p>
          </div>
          <button onClick={() => { auth.signOut(); sessionStorage.removeItem('emailLogado'); router.push('/'); }} className="text-sm font-bold text-slate-400 hover:text-red-500 transition-colors">
            Sair
          </button>
        </div>

        {/* Botão de Ação Global */}
        <div className="flex justify-between items-end">
          <h2 className="text-xl font-bold text-[#060242]">Seus Mentorados ({alunos.length})</h2>
          <button onClick={() => setIsModalOpen(true)} className="bg-[#D4B726] hover:bg-yellow-500 text-white font-bold py-3 px-6 rounded-lg shadow-md transition-all">
            + Novo Registro Semanal
          </button>
        </div>
        
        {/* Lista de Alunos */}
        {alunos.length === 0 ? (
           <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
             <p className="text-slate-500 font-medium">Nenhum aluno sob a sua responsabilidade no momento.</p>
           </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {alunos.map(aluno => (
              <div key={aluno.id} className={cardClass + " flex flex-col justify-between hover:border-[#D4B726] transition-all"}>
                <div>
                  <h3 className="text-xl font-bold text-[#060242] mb-1">{aluno.nome}</h3>
                  <p className="text-xs text-slate-400 mb-6">{aluno.email}</p>
                </div>
                {/* Redireciona para o diário do aluno específico */}
                <div className="flex flex-col gap-2">
                  <button onClick={() => router.push(`/mentor/${aluno.id}?nome=${encodeURIComponent(aluno.nome)}`)} className="w-full bg-slate-50 border border-[#060242] text-[#060242] font-bold py-2 rounded-lg hover:bg-[#060242] hover:text-white transition-all">
                    Abrir Dados
                  </button>
                  <Link href={`/mentor/ig/painel?id=${aluno.id}&nome=${encodeURIComponent(aluno.nome)}`} className="w-full text-center text-xs text-slate-400 hover:text-[#060242] font-medium py-1.5 transition">
                    Exportar Acompanhamento →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* RENDERIZAÇÃO DA PEÇA DE LEGO (O MODAL) */}
      {isModalOpen && (
        <ModalRegistro alunos={alunos} onClose={() => setIsModalOpen(false)} />
      )}
    </div>
  );
}