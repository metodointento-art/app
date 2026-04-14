'use client';

import { useState } from 'react';

export default function OnboardingWizard() {
  const [passoAtual, setPassoAtual] = useState(1);
  const [enviando, setEnviando] = useState(false);

  // Aqui está o nosso "Contrato de Dados" (Passo 1) transformado em código
  const [respostas, setRespostas] = useState({
    dadosPessoais: { nome: '', dataNascimento: '', telefone: '', responsavelFinanceiro: '', email: '', cidade: '', estado: '' },
    perfilAcademico: { escolaridade: '', origemEnsinoMedio: '', cota: '', fezEnemAntes: '', provasInteresse: '', cursoInteresse: '', plataformaOnline: '', historicoEstudos: '', tresMaioresObstaculos: '', expectativasMentoria: '' },
    notasAnteriores: { linguagens: '', humanas: '', natureza: '', matematica: '' },
    diagnosticoTecnica: { leituraPrevia: '', estruturaMental: '', interacaoAula: '' } // Resumido aqui para exemplo
  });

  // Função inteligente para atualizar qualquer campo dinamicamente
  const handleChange = (categoria, campo, valor) => {
    setRespostas((prev) => ({
      ...prev,
      [categoria]: { ...prev[categoria], [campo]: valor }
    }));
  };

  const proximoPasso = () => setPassoAtual((prev) => prev + 1);
  const passoAnterior = () => setPassoAtual((prev) => prev - 1);

  const finalizarOnboarding = async () => {
    setEnviando(true);
    try {
      const response = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(respostas)
      });
      
      if (response.ok) {
        alert("Sucesso! Seus dados foram enviados para o mentor.");
        // Futuramente, aqui colocaremos um redirecionamento para o Dashboard final
      } else {
        alert("Houve um erro na comunicação com o servidor.");
      }
    } catch (error) {
      alert("Erro ao conectar. Verifique sua internet.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-3xl mx-auto bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
        
        {/* Cabeçalho Premium */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-2">Onboarding Intento</h1>
          <p className="text-gray-500">Configure sua jornada para a aprovação.</p>
        </div>

        {/* Indicador de Progresso */}
        <div className="flex justify-between mb-8 border-b pb-4 text-sm font-medium text-gray-400">
          <span className={passoAtual >= 1 ? 'text-black' : ''}>1. Pessoais</span>
          <span className={passoAtual >= 2 ? 'text-black' : ''}>2. Acadêmico</span>
          <span className={passoAtual >= 3 ? 'text-black' : ''}>3. Notas</span>
          <span className={passoAtual >= 4 ? 'text-black' : ''}>4. Hábitos</span>
        </div>

        {/* CONTEÚDO: PASSO 1 */}
        {passoAtual === 1 && (
          <div className="space-y-5 animate-fadeIn">
            <h2 className="text-xl font-bold text-gray-800">Dados Pessoais</h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
              <input 
                type="text" 
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black outline-none transition"
                value={respostas.dadosPessoais.nome}
                onChange={(e) => handleChange('dadosPessoais', 'nome', e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                <input 
                  type="email" 
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black outline-none transition"
                  value={respostas.dadosPessoais.email}
                  onChange={(e) => handleChange('dadosPessoais', 'email', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp</label>
                <input 
                  type="text" 
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black outline-none transition"
                  value={respostas.dadosPessoais.telefone}
                  onChange={(e) => handleChange('dadosPessoais', 'telefone', e.target.value)}
                />
              </div>
            </div>
            {/* Você pode adicionar os outros campos de Pessoais copiando os blocos acima */}
          </div>
        )}

        {/* CONTEÚDO: PASSO 2 */}
        {passoAtual === 2 && (
          <div className="space-y-5 animate-fadeIn">
            <h2 className="text-xl font-bold text-gray-800">Perfil Acadêmico</h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Curso de Interesse</label>
              <input 
                type="text" placeholder="Ex: Medicina, Engenharia..."
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black outline-none transition"
                value={respostas.perfilAcademico.cursoInteresse}
                onChange={(e) => handleChange('perfilAcademico', 'cursoInteresse', e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quais são os três maiores obstáculos hoje?</label>
              <textarea 
                rows="3"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black outline-none transition"
                value={respostas.perfilAcademico.tresMaioresObstaculos}
                onChange={(e) => handleChange('perfilAcademico', 'tresMaioresObstaculos', e.target.value)}
              />
            </div>
          </div>
        )}

        {/* CONTEÚDO: PASSO 3 */}
        {passoAtual === 3 && (
          <div className="space-y-5 animate-fadeIn">
            <h2 className="text-xl font-bold text-gray-800">Notas do Último Simulado/ENEM</h2>
            <p className="text-sm text-gray-500 mb-4">Insira o número de acertos em cada área.</p>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Linguagens</label>
                <input type="number" max="45" className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-black"
                  value={respostas.notasAnteriores.linguagens} onChange={(e) => handleChange('notasAnteriores', 'linguagens', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Humanas</label>
                <input type="number" max="45" className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-black"
                  value={respostas.notasAnteriores.humanas} onChange={(e) => handleChange('notasAnteriores', 'humanas', e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {/* CONTEÚDO: PASSO 4 */}
        {passoAtual === 4 && (
          <div className="space-y-5 animate-fadeIn">
            <h2 className="text-xl font-bold text-gray-800">Diagnóstico de Hábitos de Estudo</h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Realizo uma leitura prévia do material antes da aula?</label>
              <select 
                className="w-full p-3 border border-gray-300 rounded-lg bg-white"
                value={respostas.diagnosticoTecnica.leituraPrevia}
                onChange={(e) => handleChange('diagnosticoTecnica', 'leituraPrevia', e.target.value)}
              >
                <option value="">Selecione uma opção...</option>
                <option value="Sempre">Sempre</option>
                <option value="Às vezes">Às vezes</option>
                <option value="Nunca">Nunca</option>
              </select>
            </div>
          </div>
        )}

        {/* BOTÕES DE NAVEGAÇÃO */}
        <div className="mt-10 pt-6 border-t flex items-center justify-between">
          {passoAtual > 1 ? (
            <button onClick={passoAnterior} className="px-6 py-2.5 text-gray-600 hover:text-black font-medium transition">
              ← Voltar
            </button>
          ) : <div />}

          {passoAtual < 4 ? (
            <button onClick={proximoPasso} className="px-8 py-2.5 bg-black text-white font-medium rounded-lg hover:bg-gray-800 transition">
              Próximo →
            </button>
          ) : (
            <button 
              onClick={finalizarOnboarding} 
              disabled={enviando}
              className={`px-8 py-2.5 font-medium rounded-lg transition ${enviando ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 text-white shadow-lg'}`}
            >
              {enviando ? 'Enviando...' : 'Finalizar Onboarding'}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
