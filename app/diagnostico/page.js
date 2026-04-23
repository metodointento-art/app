'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import questoesData from '../dados/questoes.json';

const API_URL_GOOGLE = 'https://script.google.com/macros/s/AKfycbymrGWq2BYRu1FZTmWagh9NtII6bhVEoZ2fd63x1IVqm43mz7b7NK23k1XCyxuFONPL0g/exec';

export default function DiagnosticoTeorico() {
  const [etapa, setEtapa] = useState('introducao');
  const [respostas, setRespostas] = useState({});
  const [disciplinaAtual, setDisciplinaAtual] = useState('');
  const [indiceQuestao, setIndiceQuestao] = useState(0);
  const [concluidas, setConcluidas] = useState([]);
  const [resultadoFinal, setResultadoFinal] = useState(null);
  const [emailBlindado, setEmailBlindado] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [enviadoComSucesso, setEnviadoComSucesso] = useState(false);

  const disciplinas = ['Biologia', 'Química', 'Física', 'Matemática'];
  const questoesDaVez = questoesData.filter(q => q.disciplina === disciplinaAtual);

  useEffect(() => {
    const emailLogado = sessionStorage.getItem('emailLogado');
    if (emailLogado) setEmailBlindado(emailLogado);

    const respostasSalvas = localStorage.getItem('intento_diagnostico_respostas');
    if (respostasSalvas) setRespostas(JSON.parse(respostasSalvas));

    const concluidasSalvas = localStorage.getItem('intento_diagnostico_concluidas');
    if (concluidasSalvas) setConcluidas(JSON.parse(concluidasSalvas));
  }, []);

  const selecionarOpcao = (id, opcao) => {
    const novasRespostas = { ...respostas, [id]: opcao };
    setRespostas(novasRespostas);
    localStorage.setItem('intento_diagnostico_respostas', JSON.stringify(novasRespostas));
  };

  const marcarComoConcluida = () => {
    if (!concluidas.includes(disciplinaAtual)) {
      const novasConcluidas = [...concluidas, disciplinaAtual];
      setConcluidas(novasConcluidas);
      localStorage.setItem('intento_diagnostico_concluidas', JSON.stringify(novasConcluidas));
    }
    setEtapa('selecao');
    setIndiceQuestao(0);
    window.scrollTo(0, 0);
  };

  const finalizarTesteGeral = () => {
    const acertos = { 'Biologia': 0, 'Química': 0, 'Física': 0, 'Matemática': 0 };
    questoesData.forEach(q => {
      if (respostas[q.id] && respostas[q.id] === q.gabarito) acertos[q.disciplina]++;
    });
    const porcentagens = {
      'Biologia': Math.round((acertos['Biologia'] / 45) * 100),
      'Química': Math.round((acertos['Química'] / 45) * 100),
      'Física': Math.round((acertos['Física'] / 45) * 100),
      'Matemática': Math.round((acertos['Matemática'] / 45) * 100),
    };
    const totalAcertos = Object.values(acertos).reduce((a, b) => a + b, 0);
    const porcentagemGeral = Math.round((totalAcertos / 180) * 100);
    setResultadoFinal({ detalhe: acertos, porcentagens, porcentagemGeral });
    setEtapa('resultado');
    window.scrollTo(0, 0);
  };

  const enviarParaGoogle = async () => {
    setEnviando(true);
    try {
      await fetch(API_URL_GOOGLE, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({
          tipo: 'diagnostico',
          email: emailBlindado,
          acertosBiologia: resultadoFinal.detalhe['Biologia'],
          acertosQuimica: resultadoFinal.detalhe['Química'],
          acertosFisica: resultadoFinal.detalhe['Física'],
          acertosMatematica: resultadoFinal.detalhe['Matemática']
        })
      });
      setEnviadoComSucesso(true);
      localStorage.removeItem('intento_diagnostico_respostas');
      localStorage.removeItem('intento_diagnostico_concluidas');
      const checklist = JSON.parse(localStorage.getItem('intento_checklist') || '{}');
      localStorage.setItem('intento_checklist', JSON.stringify({ ...checklist, diagnostico: true }));
    } catch (e) {
      alert("Erro na comunicação.");
    } finally {
      setEnviando(false);
    }
  };

  // TELA 1: INTRODUÇÃO
  if (etapa === 'introducao') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 py-12 font-sans">
        <div className="bg-white p-8 md:p-12 rounded-xl shadow-sm max-w-5xl w-full border border-slate-200">

          <div className="text-center mb-10 border-b border-slate-100 pb-8">
            <h1 className="text-2xl md:text-3xl font-semibold text-[#060242] mb-3 tracking-tight">Instruções para o Diagnóstico</h1>
            <p className="text-slate-400 font-medium text-base max-w-2xl mx-auto">
              Antes de começar, leia estas breves instruções. Entender o porquê e o como fará toda a diferença na precisão do seu plano.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">

            <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
              <h2 className="text-base font-semibold text-[#060242] mb-5">Por que fazer este diagnóstico?</h2>
              <ul className="space-y-5 text-sm text-slate-600 leading-relaxed">
                <li>
                  <b className="text-[#060242] block mb-1">Para criar seu "Raio-X"</b>
                  Este teste não vale nota. O objetivo é ser uma ferramenta de diagnóstico precisa para entendermos onde estão as forças e fraquezas na sua base teórica.
                </li>
                <li>
                  <b className="text-[#060242] block mb-1">Para otimizar seu tempo</b>
                  Ao identificarmos suas dificuldades conceituais, montamos um plano cirúrgico. Você estudará menos, mas estudará melhor.
                </li>
                <li>
                  <b className="text-[#060242] block mb-1">Para fortalecer a base</b>
                  Antes de resolver problemas complexos do ENEM, precisamos garantir que cada fundamento teórico esteja sólido.
                </li>
              </ul>
            </div>

            <div className="p-6">
              <h2 className="text-base font-semibold text-[#060242] mb-5">Como fazer</h2>
              <div className="space-y-5">
                {[
                  { n: '1', titulo: 'Sem consultas', desc: 'Sem livros, cadernos ou internet. O objetivo é mapear o que já está consolidado na mente.' },
                  { n: '2', titulo: 'Não "roube" de si mesmo', desc: 'Olhar gabaritos sabota seu plano. Um diagnóstico impreciso gera um planejamento ineficaz.' },
                  { n: '3', titulo: 'Foco total', desc: 'Reserve um tempo (sugerimos 2 blocos de 90 questões) num ambiente sem distrações.' },
                  { n: '4', titulo: 'Faça do início ao fim', desc: 'Responda um bloco de uma vez, sem corrigir no meio. Sua primeira intuição é valiosa.' },
                  { n: '5', titulo: 'Abrace o erro', desc: 'O erro é um "GPS" que aponta para onde direcionar a energia. Não tenha medo.' },
                ].map(item => (
                  <div key={item.n} className="flex gap-4 items-start">
                    <div className="w-6 h-6 shrink-0 rounded-full border-2 border-[#D4B726] text-[#060242] font-semibold flex items-center justify-center text-xs mt-0.5">{item.n}</div>
                    <div>
                      <p className="font-semibold text-[#060242] text-sm">{item.titulo}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          <div className="text-center">
            <button onClick={() => setEtapa('selecao')} className="bg-[#D4B726] hover:bg-yellow-500 text-white px-10 py-3 rounded-lg font-semibold text-sm transition-all w-full md:w-auto">
              Começar →
            </button>
          </div>

        </div>
      </div>
    );
  }

  // TELA 2: SELEÇÃO DE DISCIPLINA
  if (etapa === 'selecao') {
    const todosConcluidos = concluidas.length === disciplinas.length;

    return (
      <div className="min-h-screen bg-slate-50 py-12 px-4 font-sans">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-xl font-semibold text-[#060242] mb-1">Escolha uma disciplina</h2>
          <p className="text-slate-400 mb-10 font-medium text-sm">Você pode realizar os diagnósticos na ordem que preferir.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-10">
            {disciplinas.map((disc) => {
              const estaConcluida = concluidas.includes(disc);
              const foiIniciada = !estaConcluida && questoesData.some(q => q.disciplina === disc && respostas[q.id]);
              return (
                <button
                  key={disc}
                  onClick={() => { setDisciplinaAtual(disc); setEtapa('teste'); }}
                  className={`p-5 rounded-xl border transition-all flex items-center justify-between shadow-sm
                    ${estaConcluida
                      ? 'border-emerald-400/60 bg-emerald-50/50 opacity-80'
                      : foiIniciada
                        ? 'border-[#D4B726]/60 bg-amber-50/50 hover:shadow-md'
                        : 'border-slate-200 bg-white hover:border-[#060242]/30 hover:shadow-md'
                    }`}
                >
                  <div className="text-left">
                    <p className={`text-[10px] font-medium uppercase tracking-wider mb-1 ${estaConcluida ? 'text-emerald-600' : foiIniciada ? 'text-amber-600' : 'text-slate-400'}`}>
                      {estaConcluida ? 'Concluído' : foiIniciada ? 'Retome de onde parou' : 'Disponível'}
                    </p>
                    <h3 className="text-base font-semibold text-[#060242]">{disc}</h3>
                  </div>
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors text-sm
                    ${estaConcluida ? 'bg-emerald-500 text-white' : foiIniciada ? 'bg-[#D4B726] text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-[#060242] group-hover:text-white'}`}>
                    {estaConcluida ? '✓' : '→'}
                  </div>
                </button>
              );
            })}
          </div>

          {todosConcluidos ? (
            <button
              onClick={finalizarTesteGeral}
              className="bg-emerald-500 text-white px-10 py-3 rounded-lg font-semibold text-sm hover:bg-emerald-600 transition-all"
            >
              Finalizar e Ver Resultados ✓
            </button>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="bg-slate-100 px-4 py-2.5 rounded-lg inline-block">
                <p className="text-sm font-medium text-[#060242]">Faltam {disciplinas.length - concluidas.length} disciplinas para concluir.</p>
              </div>
              <button
                onClick={finalizarTesteGeral}
                className="text-xs font-medium text-slate-400 hover:text-[#060242] underline underline-offset-2 transition"
              >
                Enviar com o que tenho até agora
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // TELA 3: RESULTADOS
  if (etapa === 'resultado') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
        <div className="bg-white p-8 md:p-10 rounded-xl shadow-sm max-w-lg w-full text-center border border-slate-200">

          <div className="w-12 h-12 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-[#060242] mb-1">Diagnóstico Concluído!</h2>
          <p className="text-slate-400 mb-8 text-sm font-medium">Veja o detalhamento da sua pontuação abaixo.</p>

          <div className="bg-slate-50 rounded-xl p-5 mb-6 border border-slate-200">
            <h3 className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-4">Seu Desempenho</h3>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(resultadoFinal.porcentagens).map(([disc, porcentagem]) => (
                <div key={disc} className="bg-white p-3 rounded-lg border border-slate-200">
                  <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">{disc}</p>
                  <p className="text-2xl font-bold text-[#060242] mt-0.5">{porcentagem}%</p>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-slate-200 flex flex-col items-center gap-1">
              <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Aproveitamento Geral</p>
              <p className="text-3xl font-bold text-[#D4B726]">{resultadoFinal.porcentagemGeral}%</p>
            </div>
          </div>

          {!enviadoComSucesso ? (
            <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
              <p className="text-sm font-medium text-[#060242] mb-1">Confirme seu e-mail para enviar ao seu mentor.</p>
              <p className="text-xs text-slate-400 mb-4">Use o mesmo e-mail do Questionário.</p>
              <input
                type="email"
                value={emailBlindado}
                disabled
                className="w-full p-3 bg-slate-100 border border-slate-200 rounded-lg text-slate-400 font-medium text-sm mb-3"
              />
              <button
                onClick={enviarParaGoogle}
                disabled={enviando}
                className="w-full py-3 bg-[#D4B726] hover:bg-yellow-500 text-white rounded-lg font-semibold transition-all text-sm disabled:opacity-50"
              >
                {enviando ? 'Enviando...' : 'Enviar Resultados'}
              </button>
            </div>
          ) : (
            <div className="mt-4">
              <p className="text-emerald-600 font-medium mb-4 text-sm">Suas notas foram enviadas com sucesso!</p>
              <Link href="/painel" className="inline-block w-full bg-[#060242] text-white py-3 rounded-lg font-semibold hover:bg-blue-900 transition text-sm">
                Ir para o Painel →
              </Link>
            </div>
          )}

        </div>
      </div>
    );
  }

  // TELA 4: TESTE (INDIVIDUAL)
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col overflow-hidden font-sans">
      <header className="z-[60] bg-[#060242] text-white py-3 px-6 shadow-sm border-b-2 border-[#D4B726]">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <h1 className="text-base font-semibold tracking-tight">Diagnóstico Teórico</h1>
          <span className="text-xs font-medium bg-blue-900/50 px-3 py-1 rounded-full">{disciplinaAtual}</span>
        </div>
      </header>

      <div className="bg-white border-b border-slate-200 shadow-sm z-50">
        <div className="max-w-4xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="w-full md:w-64">
            <div className="flex justify-between text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-1">
              <span>Progresso em {disciplinaAtual}</span>
              <span>{indiceQuestao + 1} / {questoesDaVez.length}</span>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-[#D4B726] h-full transition-all duration-500"
                style={{ width: `${((indiceQuestao + 1) / questoesDaVez.length) * 100}%` }}
              ></div>
            </div>
          </div>
          <button onClick={() => setEtapa('selecao')} className="text-xs font-medium text-slate-400 hover:text-red-500 transition ml-4">Sair</button>
        </div>
      </div>

      <main className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-4xl mx-auto">
          {questoesDaVez.length > 0 && (
            <div className="bg-white p-5 md:p-8 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider bg-slate-100 px-2.5 py-1 rounded">Questão {indiceQuestao + 1}</span>
              </div>

              <h3 className="text-base md:text-lg font-medium text-[#060242] mb-6 leading-snug">
                {questoesDaVez[indiceQuestao].enunciado}
              </h3>

              <div className="grid grid-cols-1 gap-2">
                {['A', 'B', 'C', 'D'].map(L => {
                  const isSelecionada = respostas[questoesDaVez[indiceQuestao].id] === L;
                  return (
                    <label key={L} className={`flex items-center gap-3 p-3.5 rounded-lg border transition-all cursor-pointer ${isSelecionada ? 'border-[#060242] bg-blue-50/50' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                      <input type="radio" checked={isSelecionada} onChange={() => selecionarOpcao(questoesDaVez[indiceQuestao].id, L)} className="w-4 h-4 text-[#060242]" />
                      <span className={`text-sm ${isSelecionada ? 'text-[#060242] font-semibold' : 'text-slate-600 font-medium'}`}>
                        <b className="mr-1">{L})</b> {questoesDaVez[indiceQuestao].opcoes[L]}
                      </span>
                    </label>
                  );
                })}
              </div>

              <div className="mt-8 flex justify-between items-center border-t border-slate-100 pt-5">
                <button
                  onClick={() => { if (indiceQuestao > 0) setIndiceQuestao(prev => prev - 1); }}
                  className={`text-sm font-medium transition ${indiceQuestao === 0 ? 'opacity-0 pointer-events-none' : 'text-slate-400 hover:text-[#060242]'}`}
                >
                  ← Anterior
                </button>

                {indiceQuestao < questoesDaVez.length - 1 ? (
                  <button onClick={() => setIndiceQuestao(prev => prev + 1)} className="bg-[#060242] text-white px-8 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-900 transition">
                    Próxima questão →
                  </button>
                ) : (
                  <button onClick={marcarComoConcluida} className="bg-emerald-500 text-white px-8 py-2.5 rounded-lg text-sm font-semibold hover:bg-emerald-600 transition">
                    Concluir {disciplinaAtual} ✓
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
