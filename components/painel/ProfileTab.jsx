'use client';

export default function ProfileTab({ sessao }) {
  // 1. A TRAVA DE SEGURANÇA: Se a sessão for nula, não renderiza nada e evita o erro
  if (!sessao) return null;

  // 2. Extração Segura (Fallback): Se algum dado faltar, usamos um valor padrão
  const perfil = sessao.perfil || 'START';
  const aluno = sessao.aluno || { nome: 'Aluno Intento' };
  const dashboard = sessao.dashboard || {};
  
  // 3. Calculando o XP dinamicamente (Caso o backend não envie)
  let xp = sessao.xp || 0;
  if (perfil === 'START' && dashboard.streak) {
    xp = Math.min((dashboard.streak / 4) * 100, 100); // Ex: 4 semanas bate 100%
  } else if (perfil !== 'START') {
    xp = 100; // CORE e ELITE já têm o XP cheio da fase anterior
  }

  // Lógica de Mensagens
  const getStatusMessage = () => {
    if (perfil === 'START') return dashboard.mensagem || "Faltam algumas semanas de constância para o Nível CORE.";
    if (perfil === 'CORE') return "Seu foco agora é Domínio e Técnica. Analise seu gráfico de radar.";
    if (perfil === 'ELITE') return dashboard.avisoTapering ? "⚠️ Redução de carga recomendada." : "Foco em Estratégia e Estabilidade Biológica.";
    return "";
  };

  return (
    
    <div className="space-y-6 font-ubuntu">
        {/* MODO RAIO-X: APAGAR DEPOIS */}
      <div className="bg-slate-900 text-green-400 p-4 rounded-lg overflow-auto text-xs font-mono">
        <p className="text-white font-bold mb-2">DADOS NA MEMÓRIA DO NAVEGADOR:</p>
        <pre>{JSON.stringify(sessao, null, 2)}</pre>
      </div>
      {/* FIM DO MODO RAIO-X */}
      {/* CARD PRINCIPAL */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-8 shadow-sm transition-all border-l-8 border-intento-blue">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <span className="text-xs font-bold text-intento-yellow uppercase tracking-widest">Seu Nível Atual</span>
            <h2 className="text-4xl font-extrabold text-intento-blue dark:text-white mt-1">
              Perfil {perfil}
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium max-w-md">
              {getStatusMessage()}
            </p>
          </div>
          
          {/* BARRA DE EXPERIÊNCIA (XP) */}
          <div className="w-full md:w-64">
            <div className="flex justify-between items-end mb-2">
              <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Experiência (XP)</span>
              <span className="text-lg font-black text-intento-blue dark:text-blue-400">{xp}%</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-4 overflow-hidden border border-slate-200 dark:border-slate-600">
              <div 
                className="bg-intento-yellow h-full transition-all duration-1000 ease-out shadow-sm"
                style={{ width: `${xp}%` }}
              ></div>
            </div>
            <p className="text-[10px] text-slate-400 mt-2 uppercase text-right font-bold">
              Próximo Nível: {perfil === 'START' ? 'CORE' : 'ELITE'}
            </p>
          </div>
        </div>
      </div>

      {/* GRID DE INFORMAÇÕES ADICIONAIS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <h3 className="text-xs font-bold text-slate-400 uppercase mb-3">Nome de Guerra</h3>
          <p className="text-xl font-bold text-intento-blue dark:text-white">{aluno.nome}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <h3 className="text-xs font-bold text-slate-400 uppercase mb-3">E-mail de Acesso</h3>
          <p className="text-xl font-bold text-intento-blue dark:text-white">{sessao.email}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <h3 className="text-xs font-bold text-slate-400 uppercase mb-3">Status da Mentoria</h3>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
            <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 uppercase text-sm">Ativo</p>
          </div>
        </div>
      </div>
    </div>
  );
  
}
