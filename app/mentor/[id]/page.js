'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';

// --- ESTÉTICA INTENTO ---
const cardClass = "bg-white rounded-xl border border-slate-200 p-6 shadow-sm transition-colors";
const inputClass = "w-full p-3 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-[#060242] transition-all font-medium text-[#060242]";
const labelClass = "block text-[11px] font-medium text-slate-400 uppercase mb-2 tracking-wider";

// --- CONSTANTES ---
const DIAS = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado', 'Domingo'];
const HORARIOS = ['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00'];
const CATEGORIAS = {
  'Codificação': { cor: 'bg-blue-100 text-blue-800 border-blue-200' },
  'Revisão': { cor: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  'Hábitos': { cor: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  'Sono': { cor: 'bg-purple-100 text-purple-800 border-purple-200' },
  'Outros': { cor: 'bg-slate-100 text-slate-800 border-slate-200' }
};

// As opções restritas para o Diário
const CATEGORIAS_DESAFIO = ['Codificação', 'Revisão', 'Hábitos', 'Prova'];

// COMPONENTE: Estrelas de Avaliação
const StarRating = ({ rating, setRating, readOnly = false }) => {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          onClick={() => !readOnly && setRating(star)}
          className={`text-3xl transition-transform ${star <= rating ? 'text-[#D4B726]' : 'text-slate-200'} ${readOnly ? 'cursor-default' : 'cursor-pointer hover:scale-110'}`}
        >
          ★
        </button>
      ))}
    </div>
  );
};

export default function GestaoIndividualAluno() {
  const params = useParams();
  const searchParams = useSearchParams();
  const nomeAluno = searchParams.get('nome');
  const router = useRouter();

  const [carregando, setCarregando] = useState(true);
  const [historicoDiarios, setHistoricoDiarios] = useState([]);
  const [historicoRegistros, setHistoricoRegistros] = useState([]);
  const [abaInterna, setAbaInterna] = useState('diario');
  const [statusMsg, setStatusMsg] = useState("");
  const [salvandoRotina, setSalvandoRotina] = useState(false);
  const [dadosOnboarding, setDadosOnboarding] = useState(null);
  const [carregandoOnboarding, setCarregandoOnboarding] = useState(false);
  const [erroOnboarding, setErroOnboarding] = useState('');

  // ESTADOS DO DIÁRIO
  const [avaliacaoPendente, setAvaliacaoPendente] = useState(false);
  const [encontroPendente, setEncontroPendente] = useState(null);
  const [formAvaliacao, setFormAvaliacao] = useState(["", "", "", "", ""]);
  const [expandidoId, setExpandidoId] = useState(null); 
  
  // O Estado do Modal
  const [modalAberto, setModalAberto] = useState(false);
  const [metaPassada, setMetaPassada] = useState("");

  const [formDiario, setFormDiario] = useState({
    autoavaliacao: 0, vitorias: "", desafios: "", categoriaDesafio: "Codificação",
    meta: "", exploracao: "", planosAcao: ["", "", "", "", ""]
  });

  const [grade, setGrade] = useState({});
  const [selecaoAtual, setSelecaoAtual] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [configSemana, setConfigSemana] = useState({ categoria: 'Codificação', detalhe: '', foco: false });

  const iniciarSelecao = (id) => { setIsDragging(true); setSelecaoAtual([id]); };
  const passarMouse = (id) => { if (isDragging && !selecaoAtual.includes(id)) setSelecaoAtual(prev => [...prev, id]); };
  const finalizarSelecao = () => setIsDragging(false);

  // =========================================================================
  // CARREGAR DADOS DO GOOGLE
  // =========================================================================
  useEffect(() => {
    const carregarDados = async () => {
      setCarregando(true);
      try {
        const res = await fetch('/api/mentor', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ acao: 'buscarDadosAluno', idPlanilhaAluno: params.id })
        });
        const data = await res.json();
        
        if (data.status === 'sucesso') {
          // GRADE DA SEMANA
          const novaGrade = {};
          if (data.semana && data.semana.length > 0) {
            data.semana.forEach((linha, i) => {
              linha.forEach((celula, j) => {
                if (celula && celula.trim() !== "") {
                  const match = celula.match(/\[(.*?)\]/);
                  novaGrade[`${DIAS[j]}_${HORARIOS[i]}`] = { categoria: match ? match[1] : 'Outros', label: celula };
                }
              });
            });
          }
          setGrade(novaGrade);
          setHistoricoRegistros(data.registros || []);

          // DIÁRIOS
          const diariosCarregados = data.diarios || [];
          setHistoricoDiarios(diariosCarregados);

          if (diariosCarregados.length > 0) {
            const ultimo = diariosCarregados[0];
            setMetaPassada(ultimo.meta || ""); // Puxa a meta antiga para o Placeholder
            
            let precisaAvaliar = false;
            for (let i = 0; i < 5; i++) {
              if (String(ultimo.acoes[i] || "").trim() !== "" && String(ultimo.resultados[i] || "").trim() === "") {
                precisaAvaliar = true; break;
              }
            }
            if (precisaAvaliar) {
              setAvaliacaoPendente(true);
              setEncontroPendente(ultimo);
            }
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setCarregando(false);
      }
    };
    carregarDados();
  }, [params.id]);

  // =========================================================================
  // SALVAR AVALIAÇÃO OBRIGATÓRIA
  // =========================================================================
  const enviarAvaliacao = async () => {
    const temFuro = encontroPendente.acoes.some((acao, i) => String(acao || "").trim() !== "" && formAvaliacao[i] === "");
    if (temFuro) { alert("Preencha o resultado de todas as tarefas."); return; }

    setStatusMsg("Salvando Avaliação...");
    try {
      const res = await fetch('/api/mentor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acao: 'avaliarEncontroPassado', idPlanilha: params.id, linha: encontroPendente.linha, resultados: formAvaliacao })
      });
      if (res.ok) {
        setStatusMsg("Avaliação Salva!");
        setAvaliacaoPendente(false);
        const novoHist = [...historicoDiarios];
        novoHist[0].resultados = formAvaliacao;
        setHistoricoDiarios(novoHist);
        setTimeout(() => setStatusMsg(""), 4000);
      }
    } catch (e) { setStatusMsg("Erro ao salvar."); }
  };

  // =========================================================================
  // SALVAR NOVO DIÁRIO
  // =========================================================================
  const salvarNovoEncontro = async () => {
    setStatusMsg("Salvando Encontro...");
    try {
      const res = await fetch('/api/mentor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acao: 'salvarNovoEncontro', idPlanilha: params.id, ...formDiario, autoavaliacao: formDiario.autoavaliacao, acoes: formDiario.planosAcao })
      });
      if (res.ok) { 
        setStatusMsg("Encontro Salvo!"); 
        setModalAberto(false);
        window.location.reload(); 
      }
    } catch (e) { setStatusMsg("Erro."); }
  };

  const carregarOnboarding = async () => {
    if (dadosOnboarding !== null) return;
    setCarregandoOnboarding(true);
    setErroOnboarding('');
    try {
      const res = await fetch('/api/mentor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acao: 'buscarOnboarding', idPlanilhaAluno: params.id })
      });
      const data = await res.json();
      if (data.status === 'sucesso') {
        setDadosOnboarding(data.onboarding || {});
      } else {
        setErroOnboarding(data.mensagem || 'Erro desconhecido retornado pelo servidor.');
      }
    } catch (e) {
      setErroOnboarding('Falha na comunicação com a API: ' + e.message);
    }
    finally { setCarregandoOnboarding(false); }
  };

  const aplicarCarimbo = () => { /* Mantido igual */
    const label = `[${configSemana.categoria}]${configSemana.detalhe ? ' - ' + configSemana.detalhe : ''}${configSemana.foco ? ' ' : ''}`;
    const novaGrade = { ...grade };
    selecaoAtual.forEach(id => { novaGrade[id] = { categoria: configSemana.categoria, label }; });
    setGrade(novaGrade);
    setSelecaoAtual([]);
    setConfigSemana({ ...configSemana, detalhe: '' });
  };

  const limparHorarios = () => { /* Mantido igual */
    const novaGrade = { ...grade };
    selecaoAtual.forEach(id => { novaGrade[id] = null; });
    setGrade(novaGrade);
    setSelecaoAtual([]);
  };

  const salvarSemana = async () => {
    setSalvandoRotina(true);
    const rotina = Object.entries(grade).map(([chave, item]) => {
      const [dia, hora] = chave.split('_');
      return { dia, hora, atividade: item ? item.label : '' };
    });
    try {
      await fetch('/api/mentor', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ acao: 'salvarSemanaLote', idPlanilhaAluno: params.id, rotina }) });
      setStatusMsg("Semana salva!"); setTimeout(() => setStatusMsg(""), 3000);
    } catch (e) { setStatusMsg("Erro."); }
    finally { setSalvandoRotina(false); }
  };

  if (carregando) return <div className="p-8 text-center text-[#060242] font-medium animate-pulse text-sm">Carregando dados...</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-4 lg:p-8 font-sans" onMouseUp={finalizarSelecao}>
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* HEADER GERAL */}
        <div className="flex justify-between items-center">
          <button onClick={() => router.push('/mentor')} className="text-sm font-medium text-slate-400 hover:text-[#060242] transition-colors">← Voltar ao Painel Global</button>
          <div className="flex gap-2">
            <button onClick={() => setAbaInterna('diario')} className={`px-5 py-2 font-semibold rounded-lg transition-all text-sm ${abaInterna === 'diario' ? 'bg-[#060242] text-white' : 'bg-white text-slate-400 border border-slate-200 hover:border-slate-300'}`}>Diário de Bordo</button>
            <button onClick={() => setAbaInterna('semana')} className={`px-5 py-2 font-semibold rounded-lg transition-all text-sm ${abaInterna === 'semana' ? 'bg-[#060242] text-white' : 'bg-white text-slate-400 border border-slate-200 hover:border-slate-300'}`}>Semana Padrão</button>
            <button onClick={() => setAbaInterna('registros')} className={`px-5 py-2 font-semibold rounded-lg transition-all text-sm ${abaInterna === 'registros' ? 'bg-[#060242] text-white' : 'bg-white text-slate-400 border border-slate-200 hover:border-slate-300'}`}>Histórico Analítico</button>
            <button onClick={() => { setAbaInterna('onboarding'); carregarOnboarding(); }} className={`px-5 py-2 font-semibold rounded-lg transition-all text-sm ${abaInterna === 'onboarding' ? 'bg-[#060242] text-white' : 'bg-white text-slate-400 border border-slate-200 hover:border-slate-300'}`}>Onboarding</button>
          </div>
        </div>

        <div className="bg-[#060242] text-white p-6 rounded-xl flex justify-between items-center shadow-sm">
          <h1 className="text-2xl font-semibold">{nomeAluno || "Gestão Individual"}</h1>
        </div>

        {/* ================================================================== */}
        {/* ABA DIÁRIO DE BORDO */}
        {/* ================================================================== */}
        {abaInterna === 'diario' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            
            {/* O BOTÃO E A TRAVA */}
            {avaliacaoPendente ? (
              <div className="bg-red-50 border-2 border-red-300 p-8 rounded-2xl shadow-sm">
                <div className="flex items-center gap-4 mb-6 border-b border-red-200 pb-4">
                  <span className="bg-red-500 text-white w-8 h-8 flex items-center justify-center rounded-full font-semibold text-sm">!</span>
                  <div>
                    <h2 className="text-lg font-semibold text-red-700">Revisão Obrigatória Pendente</h2>
                    <p className="text-red-600 font-medium">Você precisa avaliar a execução do encontro do dia <b>{new Date(encontroPendente.data).toLocaleDateString('pt-PT')}</b> para liberar o novo diário.</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  {encontroPendente.acoes.map((acao, idx) => {
                    if (!acao || String(acao).trim() === "") return null;
                    return (
                      <div key={idx} className="bg-white p-5 rounded-xl border border-red-100 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
                        <span className="font-bold text-slate-800 flex-1">{idx + 1}. {acao}</span>
                        <select 
                          className="p-3 border-2 border-slate-200 rounded-lg outline-none focus:ring-red-400 focus:border-red-400 bg-slate-50 font-bold text-slate-600 min-w-[250px]"
                          value={formAvaliacao[idx]}
                          onChange={(e) => { const novo = [...formAvaliacao]; novo[idx] = e.target.value; setFormAvaliacao(novo); }}
                        >
                          <option value="">Selecione o Resultado...</option>
                          <option value="Não realizado">Não realizado</option>
                          <option value="Realizado Parcialmente">Realizado Parcialmente</option>
                          <option value="Realizado">Realizado</option>
                        </select>
                      </div>
                    );
                  })}
                </div>
                <button onClick={enviarAvaliacao} className="w-full mt-6 bg-red-600 text-white font-semibold py-3 rounded-lg shadow-sm hover:bg-red-700 transition-all text-sm">
                  Salvar Revisão e Liberar Novo Diário
                </button>
              </div>
            ) : (
              <div className="flex justify-between items-center bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <div>
                  <h2 className="text-base font-semibold text-[#060242]">Diário Liberado</h2>
                  <p className="text-slate-400 text-sm">O último encontro foi avaliado com sucesso.</p>
                </div>
                <button
                  onClick={() => setModalAberto(true)}
                  className="bg-[#D4B726] hover:bg-yellow-500 text-white font-semibold py-2.5 px-6 rounded-lg shadow-sm transition-all text-sm"
                >
                  + Novo Diário
                </button>
              </div>
            )}

            {/* O ACORDÃO (SANFONA) DO HISTÓRICO - AGORA COM TUDO! */}
            <div className="pt-4">
              <h3 className="text-base font-semibold text-[#060242] mb-5">Histórico Completo de Encontros</h3>
              
              {historicoDiarios.length === 0 ? (
                <div className="p-8 border-2 border-dashed rounded-xl text-center text-slate-400 font-bold">Nenhum encontro registrado.</div>
              ) : (
                <div className="space-y-4">
                  {historicoDiarios.map((enc, i) => (
                    <div key={i} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden transition-all">
                      {/* CABEÇALHO DA SANFONA */}
                      <button 
                        onClick={() => setExpandidoId(expandidoId === i ? null : i)}
                        className="w-full text-left p-5 flex justify-between items-center hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-center gap-6">
                          <span className="bg-[#060242] text-white px-3 py-1.5 rounded-lg text-xs font-medium min-w-[110px] text-center">
                            {new Date(enc.data).toLocaleDateString('pt-PT')}
                          </span>
                          <div>
                            <span className="font-semibold text-slate-700 block text-sm">{enc.meta || 'Sem Meta Principal'}</span>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] text-slate-400 uppercase font-medium tracking-wider">Avaliação:</span>
                              <StarRating rating={parseInt(enc.autoavaliacao) || 0} readOnly={true} />
                            </div>
                          </div>
                        </div>
                        <span className="text-3xl text-slate-300 font-light">{expandidoId === i ? '−' : '+'}</span>
                      </button>
                      
                      {/* CONTEÚDO EXPANDIDO (TODOS OS CAMPOS) */}
                      {expandidoId === i && (
                        <div className="p-6 border-t border-slate-100 bg-slate-50 space-y-6 animate-in fade-in">
                          
                          {/* Topo: Categoria */}
                          <div>
                            <span className="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                              Desafio: {enc.categoria || 'Não Categorizado'}
                            </span>
                          </div>

                          {/* Grid de Vitórias e Desafios */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-5 rounded-xl border border-slate-100">
                            <div><h4 className={labelClass}>Vitórias da Semana</h4><p className="text-sm font-medium text-slate-700 whitespace-pre-wrap">{enc.vitorias || '-'}</p></div>
                            <div><h4 className={labelClass}>Maiores Desafios</h4><p className="text-sm font-medium text-slate-700 whitespace-pre-wrap">{enc.desafios || '-'}</p></div>
                          </div>
                          
                          {/* Exploração Longa com Scroll */}
                          <div className="bg-white p-5 rounded-xl border border-slate-100">
                            <h4 className={labelClass}>Exploração e Ferramentas</h4>
                            <div className="max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                              <p className="text-sm font-medium text-slate-700 whitespace-pre-wrap leading-relaxed">
                                {enc.exploracao || 'Nenhuma nota de exploração registrada.'}
                              </p>
                            </div>
                          </div>

                          {/* Plano de Ação */}
                          <div>
                            <h4 className={labelClass}>Plano de Ação e Execução</h4>
                            <ul className="space-y-3 mt-3">
                              {enc.acoes.map((acao, idx) => acao && String(acao).trim() !== "" ? (
                                <li key={idx} className="bg-white p-4 border border-slate-200 rounded-xl flex flex-col md:flex-row justify-between md:items-center gap-3 shadow-sm">
                                  <span className="text-sm font-bold text-slate-800 flex-1">{idx + 1}. {acao}</span>
                                  <span className={`text-[10px] font-medium px-3 py-1.5 rounded-md uppercase tracking-wide text-center ${
                                    enc.resultados[idx] === 'Realizado' ? 'bg-emerald-100 text-emerald-800' :
                                    enc.resultados[idx] === 'Realizado Parcialmente' ? 'bg-yellow-100 text-yellow-800' :
                                    enc.resultados[idx] === 'Não realizado' ? 'bg-red-100 text-red-800' : 'bg-slate-200 text-slate-500'
                                  }`}>
                                    {enc.resultados[idx] || 'Aguardando Revisão'}
                                  </span>
                                </li>
                              ) : null)}
                            </ul>
                          </div>

                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* MODAL: NOVO DIÁRIO (PERSISTENTE) */}
        {modalAberto && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#060242]/40 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-slate-50 w-full max-w-6xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
              
              {/* Header do Modal */}
              <div className="bg-white px-8 py-5 border-b border-slate-200 flex justify-between items-center">
                <h2 className="text-base font-semibold text-[#060242]">Novo Encontro</h2>
                <button onClick={() => setModalAberto(false)} className="text-slate-400 hover:text-red-500 transition-colors">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
              </div>

              {/* Corpo do Modal com Scroll */}
              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  
                  {/* COLUNA ESQUERDA: Análise e Exploração */}
                  <div className="space-y-6">
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                      <label className={labelClass}>Autoavaliação</label>
                      <div className="mt-2"><StarRating rating={formDiario.autoavaliacao} setRating={(val) => setFormDiario({...formDiario, autoavaliacao: val})} /></div>
                    </div>
                    
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                      <div><label className={labelClass}>Vitórias da Semana</label><textarea className={inputClass} rows="2" placeholder="O que correu bem?" value={formDiario.vitorias} onChange={e => setFormDiario({...formDiario, vitorias: e.target.value})} /></div>
                      <div><label className={labelClass}>Maiores Desafios</label><textarea className={inputClass} rows="2" placeholder="Onde o aluno travou?" value={formDiario.desafios} onChange={e => setFormDiario({...formDiario, desafios: e.target.value})} /></div>
                    </div>

                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                      <label className={labelClass}>Exploração</label>
                      <textarea className={inputClass} rows="8" placeholder="Espaço livre para notas, resumos, descobertas durante o encontro..." value={formDiario.exploracao} onChange={e => setFormDiario({...formDiario, exploracao: e.target.value})} />
                    </div>
                  </div>

                  {/* COLUNA DIREITA: Metas e Ações */}
                  <div className="space-y-6">
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                      <div>
                        <label className={labelClass}>Categoria do Desafio Atual</label>
                        <select className={inputClass + " bg-slate-50 font-bold text-[#060242]"} value={formDiario.categoriaDesafio} onChange={e => setFormDiario({...formDiario, categoriaDesafio: e.target.value})}>
                          {CATEGORIAS_DESAFIO.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className={labelClass}>Meta para o Próximo Encontro</label>
                        <input 
                          type="text" className={inputClass} 
                          placeholder={metaPassada ? `Ex: ${metaPassada}` : "Qual a grande meta da semana?"} 
                          value={formDiario.meta} 
                          onChange={e => setFormDiario({...formDiario, meta: e.target.value})} 
                        />
                      </div>
                    </div>

                    <div className="bg-[#060242] p-6 rounded-xl shadow-lg border-4 border-blue-900/20">
                      <label className="block text-[11px] font-medium text-blue-200 uppercase mb-4 tracking-wider">O Plano de Ação</label>
                      <div className="space-y-3">
                        {formDiario.planosAcao.map((p, i) => (
                          <div key={i} className="flex gap-3">
                            <div className="w-9 h-9 shrink-0 bg-blue-900 rounded-lg flex items-center justify-center font-semibold text-white text-sm">{i+1}</div>
                            <input type="text" placeholder={`Descreva o ${i+1}º passo prático...`} className={inputClass + " bg-white/10 border-blue-800 text-white placeholder-blue-300 focus:ring-yellow-400"} value={p} onChange={e => { const novo = [...formDiario.planosAcao]; novo[i] = e.target.value; setFormDiario({...formDiario, planosAcao: novo}); }}/>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              {/* Footer do Modal */}
              <div className="bg-white p-6 border-t border-slate-200 flex justify-end gap-4">
                <button onClick={() => setModalAberto(false)} className="px-6 py-2.5 font-medium text-slate-400 hover:text-slate-700 transition-colors text-sm">
                  Minimizar
                </button>
                <button onClick={salvarNovoEncontro} className="bg-[#D4B726] hover:bg-yellow-500 text-white font-semibold px-8 py-2.5 rounded-lg shadow-sm transition-all text-sm">
                  Salvar Encontro
                </button>
              </div>

            </div>
          </div>
        )}

        {/* ... ABAS SEMANA E REGISTROS AQUI (MANTIDAS INTACTAS) ... */}
        
        {abaInterna === 'semana' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-in fade-in duration-500">
            {/* Seu código da semana... */}
             <div className="space-y-4">
              {selecaoAtual.length > 0 ? (
                <div className={cardClass + " border-2 border-[#060242] shadow-xl sticky top-8"}>
                  <h3 className="font-bold text-[#060242] mb-4">Editando {selecaoAtual.length} horários</h3>
                  <div className="space-y-4">
                    <div>
                      <label className={labelClass}>Cluster</label>
                      <select className={inputClass} value={configSemana.categoria} onChange={e => setConfigSemana({...configSemana, categoria: e.target.value})}>
                        {Object.keys(CATEGORIAS).map(c => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                    <div><label className={labelClass}>Detalhe</label><input type="text" className={inputClass} value={configSemana.detalhe} onChange={e => setConfigSemana({...configSemana, detalhe: e.target.value})} /></div>
                    <label className="flex items-center gap-2 cursor-pointer p-3 bg-slate-50 rounded-lg"><input type="checkbox" checked={configSemana.foco} onChange={e => setConfigSemana({...configSemana, foco: e.target.checked})} className="w-5 h-5 accent-[#060242]"/><span className="text-sm font-bold text-[#060242]"> Modo Foco</span></label>
                    <button onClick={aplicarCarimbo} className="w-full bg-[#060242] text-white font-bold py-3 rounded-lg hover:bg-blue-900 transition-all">Aplicar Atividade</button>
                    <button onClick={limparHorarios} className="w-full border border-red-500 text-red-500 font-bold py-2 rounded-lg hover:bg-red-50 transition-all"> Limpar Seleção</button>
                  </div>
                </div>
              ) : (
                <div className={cardClass + " border-dashed bg-slate-50 text-center py-12 sticky top-8"}>
                  <p className="text-slate-400 font-medium px-4">Clique e arraste na grade ao lado para preencher.</p>
                </div>
              )}
              <button onClick={salvarSemana} disabled={salvandoRotina} className="w-full bg-[#D4B726] text-white font-semibold py-3 rounded-lg shadow-sm hover:bg-yellow-500 transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-70">
                {salvandoRotina && <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>}
                {salvandoRotina ? 'Sincronizando...' : 'Sincronizar Rotina'}
              </button>
            </div>

            <div className="lg:col-span-3 bg-white border border-slate-200 rounded-2xl overflow-x-auto shadow-sm select-none">
              <table className="w-full text-xs border-collapse min-w-[800px]">
                <thead><tr className="bg-slate-50 border-b border-slate-200"><th className="p-3 w-16 text-slate-400 font-medium border-r">Hora</th>{DIAS.map(dia => <th key={dia} className="p-3 font-semibold text-[#060242] border-r last:border-0">{dia.split('-')[0]}</th>)}</tr></thead>
                <tbody>
                  {HORARIOS.map(hora => (
                    <tr key={hora} className="border-b border-slate-100 last:border-0">
                      <td className="p-2 text-center font-bold text-slate-300 border-r bg-slate-50">{hora}</td>
                      {DIAS.map(dia => {
                        const id = `${dia}_${hora}`;
                        const isSelected = selecaoAtual.includes(id);
                        const item = grade[id];
                        return (
                          <td 
                            key={id} onMouseDown={() => iniciarSelecao(id)} onMouseEnter={() => passarMouse(id)}
                            className={`p-1 border-r last:border-0 cursor-crosshair transition-all duration-75 min-w-[100px] h-12 ${isSelected ? 'bg-blue-50 ring-2 ring-inset ring-blue-400' : 'hover:bg-slate-50'}`}
                          >
                            {item && <div className={`h-full w-full p-2 rounded-lg font-bold flex items-center justify-center text-center leading-tight shadow-sm border ${CATEGORIAS[item.categoria]?.cor || 'bg-slate-200'}`}>{item.label}</div>}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* ABA ONBOARDING */}
        {/* ================================================================== */}
        {abaInterna === 'onboarding' && (
          <div className="space-y-5 animate-in fade-in duration-500">
            {carregandoOnboarding && (
              <div className="text-center py-12 text-slate-400 text-sm font-medium animate-pulse">Carregando dados de onboarding...</div>
            )}
            {!carregandoOnboarding && erroOnboarding && (
              <div className="bg-red-50 border border-red-100 rounded-xl p-5 text-sm text-red-600 font-medium">
                Erro ao carregar: <span className="font-normal">{erroOnboarding}</span>
              </div>
            )}
            {!carregandoOnboarding && !erroOnboarding && !dadosOnboarding && (
              <div className="text-center py-12 text-slate-400 text-sm">Nenhum dado de onboarding encontrado.</div>
            )}
            {!carregandoOnboarding && dadosOnboarding && (() => {
              const ob = dadosOnboarding;
              const campo = (label, valor) => valor ? (
                <div key={label}>
                  <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
                  <p className="text-sm font-medium text-[#060242]">{String(valor)}</p>
                </div>
              ) : null;

              const escala = (label, valor) => {
                const n = parseInt(valor) || 0;
                return (
                  <div key={label} className="flex items-center justify-between gap-3">
                    <p className="text-xs text-slate-600 flex-1">{label}</p>
                    <div className="flex gap-1 shrink-0">
                      {[1,2,3,4,5].map(i => (
                        <div key={i} className={`w-4 h-4 rounded-full ${i <= n ? 'bg-[#060242]' : 'bg-slate-200'}`} />
                      ))}
                    </div>
                  </div>
                );
              };

              const media = (valores) => {
                const nums = valores.map(v => parseInt(v) || 0).filter(v => v > 0);
                if (!nums.length) return null;
                return (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(1).replace('.', ',');
              };

              const badgeMedia = (valor) => {
                if (!valor) return null;
                const n = parseFloat(valor.replace(',', '.'));
                const cor = n >= 4 ? 'bg-emerald-100 text-emerald-700' : n >= 3 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-600';
                return <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cor}`}>{valor}</span>;
              };

              const mediaCodificacao = media([ob.Leitura_Previa, ob.Estrutura_Mental, ob.Interacao_Aula, ob.Atencao_Conceitos, ob.Escreve_Perguntas, ob.Escreve_Minimo, ob.Poucas_Palavras, ob.Setas_Figuras, ob.Logica_Propria, ob.Revisa_Anotacoes, ob.Procura_Material, ob.Ferramentas_Memorizacao, ob.Passa_Varias_Vezes]);
              const mediaRevisao = media([ob.Cronograma_Revisoes, ob.Revisao_Espacada, ob.Padrao_Revisao, ob.Revisao_Ativa, ob.Diferentes_Metodos, ob.Cria_Flashcards, ob.Procura_Fraquezas]);
              const mediaVida = media([ob.Durmo_8_Horas, ob.Horario_Regular, ob.Sono_Reparador, ob.Exercicio_Fisico, ob.Treino_Atencao, ob.Estuda_Lugares_Diferentes, ob.Objetivos_Claros, ob.Gestao_Atencao, ob.Pausas_Descanso, ob.Pausas_Sem_Telas]);

              return (
                <>
                  {/* Dados Pessoais */}
                  <div className={cardClass}>
                    <h2 className="text-base font-semibold text-[#060242] mb-4 border-b pb-3">Dados Pessoais</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-4">
                      {campo('Nome Completo', ob.Nome_Completo)}
                      {campo('Data de Nascimento', ob.Data_Nascimento)}
                      {campo('Telefone', ob.Telefone)}
                      {campo('E-mail', ob.Email)}
                      {campo('Responsável Financeiro', ob.Responsavel_Financeiro)}
                      {campo('Cidade', ob.Cidade)}
                      {campo('Estado', ob.Estado)}
                      {campo('Data de Registro', ob.Data_Registro)}
                    </div>
                  </div>

                  {/* Perfil Acadêmico */}
                  <div className={cardClass}>
                    <h2 className="text-base font-semibold text-[#060242] mb-4 border-b pb-3">Perfil Acadêmico</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-4 mb-5">
                      {campo('Escolaridade', ob.Escolaridade)}
                      {campo('Origem do Ensino Médio', ob.Origem_Ensino_Medio)}
                      {campo('Cota', ob.Cota)}
                      {campo('Fez ENEM Antes', ob.Fez_ENEM_Antes)}
                      {campo('Provas de Interesse', ob.Provas_Interesse)}
                      {campo('Curso de Interesse', ob.Curso_Interesse)}
                      {campo('Plataforma Online', ob.Plataforma_Online)}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                      {campo('Histórico de Estudos', ob.Historico_Estudos)}
                      {campo('3 Maiores Obstáculos', ob.Tres_Maiores_Obstaculos)}
                      {campo('Expectativas com a Mentoria', ob.Expectativas_Mentoria)}
                    </div>
                  </div>

                  {/* Notas Anteriores */}
                  <div className={cardClass}>
                    <h2 className="text-base font-semibold text-[#060242] mb-4 border-b pb-3">Notas Anteriores (ENEM)</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                      {[
                        ['Linguagens', ob.Nota_Linguagens],
                        ['Humanas', ob.Nota_Humanas],
                        ['Natureza', ob.Nota_Natureza],
                        ['Matemática', ob.Nota_Matematica],
                        ['Redação', ob.Nota_Redacao],
                      ].map(([label, val]) => (
                        <div key={label} className="bg-slate-50 rounded-xl p-4 text-center border border-slate-100">
                          <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-1">{label}</p>
                          <p className="text-2xl font-bold text-[#060242]">{val || '—'}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Hábitos */}
                  <div className={cardClass}>
                    <h2 className="text-base font-semibold text-[#060242] mb-5 border-b pb-3">Hábitos de Estudo</h2>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                      {/* Codificação */}
                      <div>
                        <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
                          <p className="text-xs font-bold text-[#060242] uppercase tracking-wider">Codificação</p>
                          {badgeMedia(mediaCodificacao)}
                        </div>
                        <div className="space-y-3">
                          {escala('Leitura prévia do material', ob.Leitura_Previa)}
                          {escala('Estrutura mental antes da aula', ob.Estrutura_Mental)}
                          {escala('Interação durante a aula', ob.Interacao_Aula)}
                          {escala('Atenção a conceitos-chave', ob.Atencao_Conceitos)}
                          {escala('Escreve perguntas durante a aula', ob.Escreve_Perguntas)}
                          {escala('Escreve o mínimo possível', ob.Escreve_Minimo)}
                          {escala('Usa poucas palavras nas anotações', ob.Poucas_Palavras)}
                          {escala('Setas e figuras nas anotações', ob.Setas_Figuras)}
                          {escala('Anota com lógica própria', ob.Logica_Propria)}
                          {escala('Revisa anotações após a aula', ob.Revisa_Anotacoes)}
                          {escala('Busca sanar dúvidas após a aula', ob.Procura_Material)}
                          {escala('Usa ferramentas de memorização', ob.Ferramentas_Memorizacao)}
                          {escala('Passa várias vezes no conteúdo', ob.Passa_Varias_Vezes)}
                        </div>
                      </div>

                      {/* Revisão */}
                      <div>
                        <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
                          <p className="text-xs font-bold text-[#060242] uppercase tracking-wider">Revisão</p>
                          {badgeMedia(mediaRevisao)}
                        </div>
                        <div className="space-y-3">
                          {escala('Tem cronograma de revisões', ob.Cronograma_Revisoes)}
                          {escala('Usa revisão espaçada', ob.Revisao_Espacada)}
                          {escala('Segue padrão D1/D7/D15', ob.Padrao_Revisao)}
                          {escala('Revisão ativa (lembrar de cabeça)', ob.Revisao_Ativa)}
                          {escala('Usa diferentes métodos de revisão', ob.Diferentes_Metodos)}
                          {escala('Cria próprios flashcards', ob.Cria_Flashcards)}
                          {escala('Busca ativamente suas fraquezas', ob.Procura_Fraquezas)}
                        </div>
                      </div>

                      {/* Hábitos de Vida */}
                      <div>
                        <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
                          <p className="text-xs font-bold text-[#060242] uppercase tracking-wider">Hábitos de Vida</p>
                          {badgeMedia(mediaVida)}
                        </div>
                        <div className="space-y-3">
                          {escala('Dorme 8 horas', ob.Durmo_8_Horas)}
                          {escala('Horário regular de sono', ob.Horario_Regular)}
                          {escala('Sono reparador', ob.Sono_Reparador)}
                          {escala('Pratica exercício físico', ob.Exercicio_Fisico)}
                          {escala('Treino de atenção', ob.Treino_Atencao)}
                          {escala('Estuda em lugares diferentes', ob.Estuda_Lugares_Diferentes)}
                          {escala('Objetivos claros ao estudar', ob.Objetivos_Claros)}
                          {escala('Gestão da atenção', ob.Gestao_Atencao)}
                          {escala('Faz pausas de descanso', ob.Pausas_Descanso)}
                          {escala('Pausas sem telas', ob.Pausas_Sem_Telas)}
                        </div>
                      </div>

                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {abaInterna === 'registros' && (
          <div className={cardClass + " overflow-hidden animate-in fade-in"}>
              <h2 className="text-base font-semibold text-[#060242] mb-5 border-b pb-4">Histórico Analítico</h2>
              <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[1500px]">
                  <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="p-3 text-[10px] font-medium text-slate-400 uppercase tracking-wider sticky left-0 bg-slate-50">Semana</th>
                      <th className="p-3 text-[10px] font-medium text-slate-400 uppercase tracking-wider">Mês</th>
                      <th className="p-3 text-[10px] font-medium text-slate-400 uppercase tracking-wider">Data</th>
                      <th className="p-3 text-[10px] font-medium text-slate-400 uppercase tracking-wider">Meta</th>
                      <th className="p-3 text-[10px] font-medium text-slate-400 uppercase tracking-wider">Horas</th>
                      <th className="p-3 text-[10px] font-medium text-slate-400 uppercase tracking-wider">Domínio</th>
                      <th className="p-3 text-[10px] font-medium text-slate-400 uppercase tracking-wider">Progresso</th>
                      <th className="p-3 text-[10px] font-medium text-slate-400 uppercase tracking-wider">Revisões</th>
                      <th className="p-3 text-[10px] font-medium text-slate-400 uppercase tracking-wider">Estresse</th>
                      <th className="p-3 text-[10px] font-medium text-slate-400 uppercase tracking-wider">Ansiedade</th>
                      <th className="p-3 text-[10px] font-medium text-slate-400 uppercase tracking-wider">Motivação</th>
                      <th className="p-3 text-[10px] font-medium text-slate-400 uppercase tracking-wider">Sono</th>
                      <th className="p-3 text-[10px] font-medium text-blue-500 uppercase tracking-wider">D. BIO</th><th className="p-3 text-[10px] font-medium text-blue-500 uppercase tracking-wider">P. BIO</th>
                      <th className="p-3 text-[10px] font-medium text-emerald-500 uppercase tracking-wider">D. QUI</th><th className="p-3 text-[10px] font-medium text-emerald-500 uppercase tracking-wider">P. QUI</th>
                      <th className="p-3 text-[10px] font-medium text-orange-500 uppercase tracking-wider">D. FIS</th><th className="p-3 text-[10px] font-medium text-orange-500 uppercase tracking-wider">P. FIS</th>
                      <th className="p-3 text-[10px] font-medium text-purple-500 uppercase tracking-wider">D. MAT</th><th className="p-3 text-[10px] font-medium text-purple-500 uppercase tracking-wider">P. MAT</th>
                  </tr>
                  </thead>
                  <tbody>
                  {historicoRegistros.map((reg, i) => (
                      <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                      {reg.map((coluna, j) => (
                          <td key={j} className={`p-3 text-slate-600 ${j === 0 ? 'sticky left-0 bg-white font-bold text-[#060242]' : ''}`}>
                          {coluna}
                          </td>
                      ))}
                      </tr>
                  ))}
                  </tbody>
              </table>
              </div>
          </div>
        )}
      </div>

      {/* Estilo embutido para scrollbar bonita dentro do Modal e do Histórico */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 10px; }
      `}} />
    </div>
  );
}