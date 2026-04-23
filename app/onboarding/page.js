'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';

const API_URL_GOOGLE = 'https://script.google.com/macros/s/AKfycbymrGWq2BYRu1FZTmWagh9NtII6bhVEoZ2fd63x1IVqm43mz7b7NK23k1XCyxuFONPL0g/exec';

const PASSOS = [
  { id: 1, nome: 'Dados Pessoais',    icone: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
  { id: 2, nome: 'Perfil Acadêmico',  icone: 'M12 14l9-5-9-5-9 5 9 5zM12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z' },
  { id: 3, nome: 'Notas Anteriores',  icone: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  { id: 4, nome: 'Método de Estudo',  icone: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z' },
];

const SECOES_HABITOS = [
  {
    titulo: 'Codificação',
    descricao: 'Como você absorve e registra o conteúdo durante as aulas.',
    perguntas: [
      { id: 'leituraPrevia',        label: 'Realizo uma leitura prévia do material antes da aula' },
      { id: 'estruturaMental',      label: 'Crio uma estrutura mental da matéria antes de assistir a aula' },
      { id: 'interacaoAula',        label: 'Durante a aula, tenho o costume de questionar o professor ou interagir' },
      { id: 'atencaoConceitos',     label: 'Enquanto o professor fala, estou atento(a) a conceitos-chave' },
      { id: 'escrevePerguntas',     label: 'Durante a aula, costumo escrever perguntas que me venham à mente' },
      { id: 'escreveMinimo',        label: 'Durante a aula, tento escrever o mínimo possível' },
      { id: 'poucasPalavras',       label: 'Faço uso de poucas palavras nas minhas anotações' },
      { id: 'setasFiguras',         label: 'Utilizo setas e figuras demonstrando relações entre os conteúdos' },
      { id: 'logicaPropria',        label: 'Costumo anotar o conteúdo de acordo com a minha lógica' },
      { id: 'revisaAnotacoes',      label: 'Reviso as anotações depois da aula e anoto quaisquer dúvidas' },
      { id: 'procuraMaterial',      label: 'Procuro o material ou o professor para retirar as dúvidas após a aula' },
      { id: 'ferramentasMemorizacao', label: 'Utilizo de alguma ferramenta (mnemônico, flashcard, etc)' },
      { id: 'passaVariasVezes',     label: 'Passo várias vezes no mesmo conteúdo, cada vez aprofundando mais' },
    ],
  },
  {
    titulo: 'Revisão',
    descricao: 'Como você organiza e executa suas sessões de revisão.',
    perguntas: [
      { id: 'cronogramaRevisoes',   label: 'Tenho um cronograma de revisões padrão para me orientar' },
      { id: 'revisaoEspacada',      label: 'Utilizo o método de revisão espaçada' },
      { id: 'padraoRevisao',        label: 'A minha revisão espaçada segue o padrão tradicional (D1, D7, D15...)' },
      { id: 'revisaoAtiva',         label: 'As sessões de revisão que eu faço são de forma ativa (lembrar de cabeça)' },
      { id: 'diferentesMetodos',    label: 'Utilizo diferentes métodos para revisar uma mesma matéria' },
      { id: 'criaFlashcards',       label: 'Crio meus próprios flashcards' },
      { id: 'procuraFraquezas',     label: 'Durante as revisões procuro ATIVAMENTE as minhas fraquezas' },
    ],
  },
  {
    titulo: 'Hábitos',
    descricao: 'Seus hábitos de sono, saúde e gestão de atenção.',
    perguntas: [
      { id: 'durmo8Horas',          label: 'Durmo, em média, 8 horas por noite' },
      { id: 'horarioRegular',       label: 'Durmo e acordo todo dia no mesmo horário' },
      { id: 'sonoReparador',        label: 'Eu sinto que meu sono é reparador e me deixa descansado(a)' },
      { id: 'exercicioFisico',      label: 'Costumo fazer exercício físico, pelo menos, 3 vezes na semana' },
      { id: 'treinoAtencao',        label: 'Faço uma prática diariamente que me ajude a treinar a minha atenção' },
      { id: 'estudaLugaresDiferentes', label: 'De vez em quando, estudo em lugares que não estou acostumado(a)' },
      { id: 'objetivosClaros',      label: 'Ao sentar para uma sessão de estudos, sei claramente meus objetivos' },
      { id: 'gestaoAtencao',        label: 'Utilizo alguma técnica de gestão de atenção (ex.: Pomodoro)' },
      { id: 'pausasDescanso',       label: 'Costumo ter pausas para descansar entre sessões de estudos' },
      { id: 'pausasSemTelas',       label: 'Nessas pausas, não utilizo sistemas de gratificação rápida (redes sociais, etc)' },
    ],
  },
];

const estados = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];
const opcoesEscolaridade = ['1º ano do Ensino Médio','2º ano do Ensino Médio','3º ano do Ensino Médio','Ensino Médio Completo (sem graduação)','Já possuo outra graduação'];
const opcoesCota = ['Não','Ensino Público','Racial','Indígena'];

export default function OnboardingWizard() {
  const [passoAtual, setPassoAtual]         = useState(1);
  const [subSecao, setSubSecao]             = useState(0);
  const [passosCompletos, setPassosCompletos] = useState([]);
  const [enviando, setEnviando]             = useState(false);
  const [sucesso, setSucesso]               = useState(false);
  const [erro, setErro]                     = useState('');

  const [respostas, setRespostas] = useState({
    dadosPessoais:    { nome: '', dataNascimento: '', telefone: '', responsavelFinanceiro: '', email: '', cidade: '', estado: '' },
    perfilAcademico:  { escolaridade: '', origemEnsinoMedio: '', cota: '', fezEnemAntes: '', provasInteresse: '', cursoInteresse: '', plataformaOnline: '', historicoEstudos: '', tresMaioresObstaculos: '', expectativasMentoria: '' },
    notasAnteriores:  { linguagens: '', humanas: '', natureza: '', matematica: '', redacao: '' },
    diagnosticoTecnica: {
      leituraPrevia: '', estruturaMental: '', interacaoAula: '', atencaoConceitos: '', escrevePerguntas: '',
      escreveMinimo: '', poucasPalavras: '', setasFiguras: '', logicaPropria: '', revisaAnotacoes: '',
      procuraMaterial: '', ferramentasMemorizacao: '', passaVariasVezes: '', cronogramaRevisoes: '',
      revisaoEspacada: '', padraoRevisao: '', revisaoAtiva: '', diferentesMetodos: '', criaFlashcards: '',
      procuraFraquezas: '', durmo8Horas: '', horarioRegular: '', sonoReparador: '', exercicioFisico: '',
      treinoAtencao: '', estudaLugaresDiferentes: '', objetivosClaros: '', gestaoAtencao: '',
      pausasDescanso: '', pausasSemTelas: '',
    },
  });

  useEffect(() => {
    const emailLogado = sessionStorage.getItem('emailLogado');
    if (!emailLogado) { window.location.replace('/'); return; }
    setRespostas(prev => ({ ...prev, dadosPessoais: { ...prev.dadosPessoais, email: emailLogado } }));
  }, []);

  const set = (cat, campo, val) => {
    setRespostas(prev => ({ ...prev, [cat]: { ...prev[cat], [campo]: val } }));
    setErro('');
  };

  const validar = () => {
    const d = respostas.dadosPessoais;
    const p = respostas.perfilAcademico;
    if (passoAtual === 1) {
      if (!d.nome.trim())         return 'Preencha o seu nome completo.';
      if (!d.dataNascimento)      return 'Informe sua data de nascimento.';
      if (!d.telefone.trim())     return 'Informe um número de WhatsApp.';
      if (!d.cidade.trim())       return 'Informe sua cidade.';
      if (!d.estado)              return 'Selecione seu estado.';
    }
    if (passoAtual === 2) {
      if (!p.escolaridade)                    return 'Selecione sua escolaridade atual.';
      if (!p.origemEnsinoMedio)               return 'Informe a origem do seu Ensino Médio.';
      if (!p.fezEnemAntes)                    return 'Informe se já fez o ENEM antes.';
      if (!p.cota)                            return 'Selecione uma opção de cota.';
      if (!p.cursoInteresse.trim())           return 'Informe o curso de seu interesse.';
      if (!p.provasInteresse.trim())          return 'Informe as provas de seu interesse.';
      if (!p.tresMaioresObstaculos.trim())    return 'Descreva seus 3 maiores obstáculos.';
      if (!p.expectativasMentoria.trim())     return 'Descreva suas expectativas com a mentoria.';
    }
    if (passoAtual === 4) {
      const secao = SECOES_HABITOS[subSecao];
      const faltam = secao.perguntas.filter(q => !respostas.diagnosticoTecnica[q.id]).length;
      if (faltam > 0) return `Responda todas as ${secao.perguntas.length} afirmações para continuar.`;
    }
    return null;
  };

  const avancar = async () => {
    const msg = validar();
    if (msg) { setErro(msg); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    setErro('');
    if (passoAtual === 4) {
      if (subSecao < SECOES_HABITOS.length - 1) {
        setSubSecao(s => s + 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      await enviar();
      return;
    }
    setPassosCompletos(prev => [...new Set([...prev, passoAtual])]);
    setPassoAtual(prev => prev + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const voltar = () => {
    setErro('');
    if (passoAtual === 4 && subSecao > 0) {
      setSubSecao(s => s - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setPassoAtual(prev => prev - 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const enviar = async () => {
    setEnviando(true);
    localStorage.setItem('intento_email_aluno', respostas.dadosPessoais.email.toLowerCase().trim());
    try {
      await fetch(API_URL_GOOGLE, {
        method: 'POST', mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ tipo: 'onboarding', email: respostas.dadosPessoais.email, ...respostas }),
      });
      setSucesso(true);
      window.scrollTo(0, 0);
      const cl = JSON.parse(localStorage.getItem('intento_checklist') || '{}');
      localStorage.setItem('intento_checklist', JSON.stringify({ ...cl, onboarding: true }));
    } catch {
      setErro('Erro ao conectar com o servidor. Tente novamente.');
    } finally {
      setEnviando(false);
    }
  };

  // Progress: 0% at step 1, never 100% until success
  const progresso = passoAtual < 4
    ? ((passoAtual - 1) / 4) * 100
    : 75 + (subSecao / SECOES_HABITOS.length) * 25;

  const secaoAtual       = SECOES_HABITOS[subSecao];
  const respondidas      = passoAtual === 4 ? secaoAtual.perguntas.filter(q => respostas.diagnosticoTecnica[q.id]).length : 0;
  const totalSecao       = passoAtual === 4 ? secaoAtual.perguntas.length : 0;

  const inputCls  = "w-full p-3 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-[#060242] transition-all font-medium text-[#060242] bg-white";
  const labelCls  = "block text-[11px] font-medium text-slate-400 uppercase mb-2 tracking-wider";
  const textaCls  = inputCls + " resize-none";

  const PillGroup = ({ opcoes, value, onChange }) => (
    <div className="flex flex-wrap gap-2">
      {opcoes.map(op => (
        <button key={op} type="button" onClick={() => onChange(op)}
          className={`px-4 py-2.5 rounded-lg border text-sm font-medium transition-all ${value === op ? 'border-[#060242] bg-blue-50/50 text-[#060242]' : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300'}`}>
          {op}
        </button>
      ))}
    </div>
  );

  // ── Tela de sucesso ──────────────────────────────────────────────────────────
  if (sucesso) {
    return (
      <div className="min-h-screen bg-slate-50 font-sans flex items-center justify-center p-4">
        <div className="bg-white p-8 md:p-12 rounded-xl shadow-sm border border-slate-200 max-w-xl w-full text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <svg className="w-8 h-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-[#060242] mb-2">Tudo certo!</h2>
          <p className="text-slate-500 mb-8 text-sm font-medium leading-relaxed">
            Seu perfil foi criado com sucesso. Você já recebeu os dados de acesso no e-mail (verifique a caixa de spam se não encontrar).
          </p>
          <div className="bg-slate-50 border-l-4 border-[#D4B726] p-5 rounded-r-xl mb-6 text-left space-y-2">
            <h3 className="font-semibold text-[#060242] text-sm flex items-center gap-2">
              <span className="bg-[#D4B726] text-white w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold">!</span>
              Próximo passo obrigatório
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">Realize o <b>Diagnóstico Teórico</b> para que seu mentor possa montar um plano cirúrgico baseado nas suas reais lacunas.</p>
          </div>
          <Link href="/diagnostico" className="block w-full py-3 px-6 bg-[#D4B726] text-white font-semibold text-sm rounded-lg hover:bg-yellow-500 transition-all">
            Iniciar Diagnóstico Teórico →
          </Link>
        </div>
      </div>
    );
  }

  // ── Layout principal ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 font-sans">

      {/* ── Top bar (mobile) ───────────────────────────────────────────── */}
      <div className="md:hidden bg-white border-b border-slate-200 px-4 py-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Image src="/simbolo-azul.png" alt="Intento" width={24} height={24} className="object-contain shrink-0" />
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              {passoAtual < 4 ? PASSOS[passoAtual - 1].nome : `${PASSOS[3].nome} — ${secaoAtual.titulo}`}
            </p>
          </div>
          <p className="text-xs font-semibold text-[#060242]">
            {passoAtual < 4 ? `${passoAtual} de 4` : `Seção ${subSecao + 1} de ${SECOES_HABITOS.length}`}
          </p>
        </div>
        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
          <div className="bg-[#D4B726] h-full transition-all duration-700" style={{ width: `${progresso}%` }} />
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 md:py-12 flex gap-8 items-start">

        {/* ── Sidebar (desktop) ──────────────────────────────────────────── */}
        <aside className="hidden md:block w-60 shrink-0">
          <div className="sticky top-8 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2 mb-0.5">
                <Image src="/simbolo-azul.png" alt="Intento" width={20} height={20} className="object-contain shrink-0" />
                <p className="text-xs font-semibold text-[#060242] uppercase tracking-wider">Onboarding</p>
              </div>
              <div className="mt-3 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div className="bg-[#D4B726] h-full transition-all duration-700" style={{ width: `${progresso}%` }} />
              </div>
            </div>
            <nav className="p-3 space-y-1">
              {PASSOS.map((p) => {
                const completo = passosCompletos.includes(p.id);
                const ativo    = passoAtual === p.id;
                return (
                  <button key={p.id} onClick={() => completo && setPassoAtual(p.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${ativo ? 'bg-[#060242] text-white' : completo ? 'hover:bg-slate-50 text-slate-600 cursor-pointer' : 'text-slate-300 cursor-default'}`}>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-colors ${ativo ? 'bg-white/20' : completo ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                      {completo && !ativo ? (
                        <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                      ) : (
                        <svg className={`w-3.5 h-3.5 ${ativo ? 'text-white' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d={p.icone} />
                        </svg>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className={`text-xs font-semibold truncate ${ativo ? 'text-white' : completo ? 'text-slate-700' : 'text-slate-300'}`}>{p.nome}</p>
                      {ativo && passoAtual === 4 && (
                        <div className="flex gap-1 mt-1">
                          {SECOES_HABITOS.map((_, i) => (
                            <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i < subSecao ? 'bg-[#D4B726]' : i === subSecao ? 'bg-white/50' : 'bg-white/20'}`} />
                          ))}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* ── Conteúdo ───────────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 md:p-10">

            {/* Erro de validação */}
            {erro && (
              <div className="mb-6 flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 text-sm font-medium px-4 py-3 rounded-lg">
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                {erro}
              </div>
            )}

            {/* ── Passo 1: Dados Pessoais ─────────────────────────────────── */}
            {passoAtual === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-[#060242]">Vamos te conhecer melhor</h2>
                  <p className="text-slate-400 text-sm font-medium mt-1">Preencha seus dados pessoais para criarmos seu perfil.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="md:col-span-2">
                    <label className={labelCls}>Nome Completo <span className="text-red-400">*</span></label>
                    <input type="text" placeholder="Seu nome completo" className={inputCls} value={respostas.dadosPessoais.nome} onChange={e => set('dadosPessoais', 'nome', e.target.value)} />
                  </div>
                  <div>
                    <label className={labelCls}>Data de Nascimento <span className="text-red-400">*</span></label>
                    <input type="date" className={inputCls} value={respostas.dadosPessoais.dataNascimento} onChange={e => set('dadosPessoais', 'dataNascimento', e.target.value)} />
                  </div>
                  <div>
                    <label className={labelCls}>WhatsApp <span className="text-red-400">*</span></label>
                    <input type="tel" placeholder="(00) 00000-0000" className={inputCls} value={respostas.dadosPessoais.telefone} onChange={e => set('dadosPessoais', 'telefone', e.target.value)} />
                  </div>
                  <div className="md:col-span-2">
                    <label className={labelCls}>E-mail de Acesso</label>
                    <input type="email" value={respostas.dadosPessoais.email} disabled className="w-full p-3 bg-slate-100 border border-slate-200 rounded-lg text-slate-400 cursor-not-allowed font-medium" />
                    <p className="text-xs text-slate-400 mt-1.5">Vinculado ao seu login — não pode ser alterado.</p>
                  </div>
                  <div>
                    <label className={labelCls}>Responsável Financeiro</label>
                    <input type="text" placeholder="Nome do responsável" className={inputCls} value={respostas.dadosPessoais.responsavelFinanceiro} onChange={e => set('dadosPessoais', 'responsavelFinanceiro', e.target.value)} />
                  </div>
                  <div></div>
                  <div>
                    <label className={labelCls}>Cidade <span className="text-red-400">*</span></label>
                    <input type="text" placeholder="Ex: São Paulo" className={inputCls} value={respostas.dadosPessoais.cidade} onChange={e => set('dadosPessoais', 'cidade', e.target.value)} />
                  </div>
                  <div>
                    <label className={labelCls}>Estado <span className="text-red-400">*</span></label>
                    <select className={inputCls} value={respostas.dadosPessoais.estado} onChange={e => set('dadosPessoais', 'estado', e.target.value)}>
                      <option value="">Selecione...</option>
                      {estados.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* ── Passo 2: Perfil Acadêmico ───────────────────────────────── */}
            {passoAtual === 2 && (
              <div className="space-y-7">
                <div>
                  <h2 className="text-xl font-semibold text-[#060242]">Perfil Acadêmico</h2>
                  <p className="text-slate-400 text-sm font-medium mt-1">Nos conte sobre sua trajetória e seus objetivos.</p>
                </div>

                <div className="space-y-5">
                  <div>
                    <label className={labelCls}>Escolaridade Atual <span className="text-red-400">*</span></label>
                    <select className={inputCls} value={respostas.perfilAcademico.escolaridade} onChange={e => set('perfilAcademico', 'escolaridade', e.target.value)}>
                      <option value="">Selecione...</option>
                      {opcoesEscolaridade.map(op => <option key={op} value={op}>{op}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className={labelCls}>Origem do Ensino Médio <span className="text-red-400">*</span></label>
                    <PillGroup opcoes={['Escola Pública', 'Escola Privada']} value={respostas.perfilAcademico.origemEnsinoMedio} onChange={v => set('perfilAcademico', 'origemEnsinoMedio', v)} />
                  </div>

                  <div>
                    <label className={labelCls}>Já fez o ENEM antes? <span className="text-red-400">*</span></label>
                    <PillGroup opcoes={['Sim', 'Não']} value={respostas.perfilAcademico.fezEnemAntes} onChange={v => set('perfilAcademico', 'fezEnemAntes', v)} />
                  </div>

                  <div>
                    <label className={labelCls}>Participa de alguma cota? <span className="text-red-400">*</span></label>
                    <PillGroup opcoes={opcoesCota} value={respostas.perfilAcademico.cota} onChange={v => set('perfilAcademico', 'cota', v)} />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className={labelCls}>Curso de Interesse <span className="text-red-400">*</span></label>
                      <input type="text" placeholder="Ex: Medicina" className={inputCls} value={respostas.perfilAcademico.cursoInteresse} onChange={e => set('perfilAcademico', 'cursoInteresse', e.target.value)} />
                    </div>
                    <div>
                      <label className={labelCls}>Prova(s) de Interesse <span className="text-red-400">*</span></label>
                      <input type="text" placeholder="Ex: ENEM, FUVEST" className={inputCls} value={respostas.perfilAcademico.provasInteresse} onChange={e => set('perfilAcademico', 'provasInteresse', e.target.value)} />
                    </div>
                  </div>

                  <div>
                    <label className={labelCls}>Plataforma de Estudos Online <span className="text-slate-300">(opcional)</span></label>
                    <input type="text" placeholder="Ex: Descomplica, Estratégia Vestibulares..." className={inputCls} value={respostas.perfilAcademico.plataformaOnline} onChange={e => set('perfilAcademico', 'plataformaOnline', e.target.value)} />
                  </div>

                  <div>
                    <label className={labelCls}>Histórico de Estudos <span className="text-slate-300">(opcional)</span></label>
                    <textarea rows={3} placeholder="Como tem sido sua rotina de estudos até hoje? Já teve acompanhamento antes?" className={textaCls} value={respostas.perfilAcademico.historicoEstudos} onChange={e => set('perfilAcademico', 'historicoEstudos', e.target.value)} />
                  </div>

                  <div>
                    <label className={labelCls}>3 Maiores Obstáculos <span className="text-red-400">*</span></label>
                    <textarea rows={3} placeholder="Ex: procrastinação, dificuldade em Matemática, falta de método..." className={textaCls} value={respostas.perfilAcademico.tresMaioresObstaculos} onChange={e => set('perfilAcademico', 'tresMaioresObstaculos', e.target.value)} />
                  </div>

                  <div>
                    <label className={labelCls}>Expectativas com a Mentoria <span className="text-red-400">*</span></label>
                    <textarea rows={3} placeholder="O que você espera alcançar com o acompanhamento da Intento?" className={textaCls} value={respostas.perfilAcademico.expectativasMentoria} onChange={e => set('perfilAcademico', 'expectativasMentoria', e.target.value)} />
                  </div>
                </div>
              </div>
            )}

            {/* ── Passo 3: Notas Anteriores ───────────────────────────────── */}
            {passoAtual === 3 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-[#060242]">Notas Anteriores</h2>
                  <p className="text-slate-400 text-sm font-medium mt-1">Se nunca fez o ENEM ou simulado, deixe em branco e avance.</p>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-500 font-medium">
                  Informe sua nota TRI (0–1000) por área — o mesmo valor que aparece no seu boletim do ENEM.
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {[
                    { key: 'linguagens', label: 'Linguagens' },
                    { key: 'humanas',    label: 'Humanas' },
                    { key: 'natureza',   label: 'Natureza' },
                    { key: 'matematica', label: 'Matemática' },
                  ].map(({ key, label }) => (
                    <div key={key}>
                      <label className={labelCls}>{label}</label>
                      <input type="number" min="0" max="1000" placeholder="Ex: 650" className={inputCls} value={respostas.notasAnteriores[key]} onChange={e => set('notasAnteriores', key, e.target.value)} />
                    </div>
                  ))}
                  <div className="md:col-span-2">
                    <label className={labelCls}>Redação</label>
                    <input type="number" min="0" max="1000" placeholder="Ex: 720" className={inputCls} value={respostas.notasAnteriores.redacao} onChange={e => set('notasAnteriores', 'redacao', e.target.value)} />
                  </div>
                </div>
              </div>
            )}

            {/* ── Passo 4: Método de Estudo (sub-seções) ─────────────────── */}
            {passoAtual === 4 && (
              <div className="space-y-6">
                {/* Header da sub-seção */}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#D4B726]">Seção {subSecao + 1} de {SECOES_HABITOS.length}</span>
                    </div>
                    <h2 className="text-xl font-semibold text-[#060242]">{secaoAtual.titulo}</h2>
                    <p className="text-slate-400 text-sm font-medium mt-0.5">{secaoAtual.descricao}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-2xl font-bold text-[#060242]">{respondidas}<span className="text-base font-medium text-slate-300">/{totalSecao}</span></p>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">respondidas</p>
                  </div>
                </div>

                {/* Mini barra da sub-seção */}
                <div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-[#D4B726] h-full transition-all duration-500" style={{ width: `${totalSecao > 0 ? (respondidas / totalSecao) * 100 : 0}%` }} />
                  </div>
                  <div className="flex gap-1 mt-2">
                    {SECOES_HABITOS.map((_, i) => (
                      <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i < subSecao ? 'bg-[#060242]' : i === subSecao ? 'bg-[#D4B726]' : 'bg-slate-200'}`} />
                    ))}
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 font-medium mt-1">
                    {SECOES_HABITOS.map((s, i) => (
                      <span key={i} className={i === subSecao ? 'text-[#060242] font-semibold' : ''}>{s.titulo}</span>
                    ))}
                  </div>
                </div>

                <p className="text-xs text-slate-400 font-medium">Classifique cada afirmação de <b className="text-slate-600">1 (Nunca)</b> a <b className="text-slate-600">5 (Sempre)</b>.</p>

                {/* Perguntas */}
                <div className="space-y-3">
                  {secaoAtual.perguntas.map((pergunta) => {
                    const val = respostas.diagnosticoTecnica[pergunta.id];
                    return (
                      <div key={pergunta.id} className={`p-4 rounded-xl border transition-all ${val ? 'border-[#060242]/20 bg-slate-50/50' : 'border-slate-200 bg-white'}`}>
                        <p className="text-sm font-medium text-slate-700 mb-4 leading-snug">{pergunta.label}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] uppercase font-medium text-slate-400 shrink-0 w-10">Nunca</span>
                          <div className="flex gap-2 flex-1 justify-center">
                            {[1, 2, 3, 4, 5].map(n => (
                              <button key={n} type="button" onClick={() => set('diagnosticoTecnica', pergunta.id, String(n))}
                                className={`w-10 h-10 rounded-full font-bold text-sm transition-all shrink-0 ${val === String(n) ? 'bg-[#060242] text-white shadow-md scale-110' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                                {n}
                              </button>
                            ))}
                          </div>
                          <span className="text-[10px] uppercase font-medium text-slate-400 shrink-0 w-12 text-right">Sempre</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Navegação ──────────────────────────────────────────────── */}
            <div className="mt-10 pt-6 border-t border-slate-200 flex flex-col-reverse sm:flex-row gap-3 items-center justify-between">
              {(passoAtual > 1 || (passoAtual === 4 && subSecao > 0)) ? (
                <button onClick={voltar} className="w-full sm:w-auto px-6 py-3 text-slate-400 hover:text-[#060242] font-medium transition text-sm">
                  ← Voltar
                </button>
              ) : <div className="hidden sm:block" />}

              <button onClick={avancar} disabled={enviando}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 bg-[#060242] text-white font-semibold rounded-lg hover:bg-blue-900 transition text-sm disabled:opacity-70">
                {enviando && <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>}
                {enviando ? 'Enviando...' : passoAtual === 4 && subSecao === SECOES_HABITOS.length - 1 ? 'Concluir Onboarding →' : 'Próxima Etapa →'}
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
