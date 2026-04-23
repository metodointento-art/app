'use client';

import { useState, useEffect } from 'react';

const inputClass = "w-full p-3 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-[#060242] transition-all font-medium text-[#060242]";
const labelClass = "block text-[11px] font-medium text-slate-400 uppercase mb-2 tracking-wider";

export default function ModalRegistro({ alunos, onClose }) {
  const [step, setStep] = useState(1);
  const [statusMsg, setStatusMsg] = useState("");

  const [form, setForm] = useState({
    idAluno: "", semana: "", mes: "", dataRegistro: "", metaSemanal: "",
    estresse: "", ansiedade: "", motivacao: "", sono: "",
    horasEstudadas: "", revisoesAtrasadas: "", dominioTotal: "", progressoTotal: "",
    dominioBio: "", progressoBio: "", dominioQui: "", progressoQui: "",
    dominioFis: "", progressoFis: "", dominioMat: "", progressoMat: ""
  });

  useEffect(() => {
    const hoje = new Date();
    const domingo = new Date(hoje);
    domingo.setDate(hoje.getDate() - hoje.getDay() - 7);
    const sabado = new Date(domingo);
    sabado.setDate(domingo.getDate() + 6);

    const formatar = (d) => d.toLocaleDateString('pt-BR');
    const nomeMes = sabado.toLocaleString('pt-BR', { month: 'long' });

    setForm(prev => ({
      ...prev,
      dataRegistro: formatar(hoje),
      semana: `${formatar(domingo)} a ${formatar(sabado)}`,
      mes: nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1)
    }));
  }, []);

  const handleChange = (campo, valor) => {
    setForm(prev => ({ ...prev, [campo]: valor }));
  };

  const salvarRegistro = async () => {
    setStatusMsg("Salvando...");
    try {
      const res = await fetch('/api/mentor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acao: 'salvarRegistroGlobal', ...form })
      });
      const data = await res.json();
      if (data.status === 'sucesso') {
        setStatusMsg("Salvo com sucesso!");
        setTimeout(() => onClose(), 1500);
      } else {
        setStatusMsg("Erro: " + data.mensagem);
      }
    } catch (e) {
      setStatusMsg("Erro de conexão.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-lg flex flex-col">

        {/* HEADER */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white">
          <div>
            <h2 className="text-base font-semibold text-[#060242]">Registro Analítico</h2>
            <p className={labelClass + " mb-0 mt-1"}>Passo {step} de 3</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              {[1, 2, 3].map(s => (
                <div key={s} className={`w-2 h-2 rounded-full transition-colors ${step >= s ? 'bg-[#060242]' : 'bg-slate-200'}`} />
              ))}
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-red-500 font-medium p-1.5 transition-colors text-sm">✕</button>
          </div>
        </div>

        {/* CORPO */}
        <div className="p-6 flex-1 space-y-5">

          {step === 1 && (
            <div className="space-y-5 animate-in slide-in-from-right-4">
              <div>
                <label className={labelClass}>Selecione o Mentorando</label>
                <select className={inputClass} value={form.idAluno} onChange={e => handleChange('idAluno', e.target.value)}>
                  <option value="">-- Escolha --</option>
                  {alunos.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
                </select>
              </div>
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Data do Fechamento</label>
                  <p className="font-medium text-[#060242] text-sm">{form.dataRegistro}</p>
                </div>
                <div>
                  <label className={labelClass}>Semana de Referência</label>
                  <p className="font-medium text-[#060242] text-sm">{form.semana}</p>
                </div>
              </div>
              <div>
                <label className={labelClass}>Meta da Semana Anterior</label>
                <input type="text" className={inputClass} placeholder="Ex: Finalizar Revisões de BIO" value={form.metaSemanal} onChange={e => handleChange('metaSemanal', e.target.value)} />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 animate-in slide-in-from-right-4">
              <p className="text-sm font-medium text-slate-400 mb-2">Avalie os indicadores em uma escala de 1 a 10.</p>
              <div className="grid grid-cols-2 gap-5">
                <div><label className={labelClass}>Nível de Estresse</label><input type="number" min="1" max="10" className={inputClass} value={form.estresse} onChange={e => handleChange('estresse', e.target.value)} /></div>
                <div><label className={labelClass}>Nível de Ansiedade</label><input type="number" min="1" max="10" className={inputClass} value={form.ansiedade} onChange={e => handleChange('ansiedade', e.target.value)} /></div>
                <div><label className={labelClass}>Nível de Motivação</label><input type="number" min="1" max="10" className={inputClass} value={form.motivacao} onChange={e => handleChange('motivacao', e.target.value)} /></div>
                <div><label className={labelClass}>Qualidade do Sono</label><input type="number" min="1" max="10" className={inputClass} value={form.sono} onChange={e => handleChange('sono', e.target.value)} /></div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5 animate-in slide-in-from-right-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelClass}>Horas Estudadas</label><input type="number" className={inputClass} value={form.horasEstudadas} onChange={e => handleChange('horasEstudadas', e.target.value)} /></div>
                <div><label className={labelClass}>Revisões Atrasadas</label><input type="number" className={inputClass} value={form.revisoesAtrasadas} onChange={e => handleChange('revisoesAtrasadas', e.target.value)} /></div>
                <div><label className={labelClass}>Domínio Total (%)</label><input type="number" className={inputClass} value={form.dominioTotal} onChange={e => handleChange('dominioTotal', e.target.value)} /></div>
                <div><label className={labelClass}>Progresso Total (%)</label><input type="number" className={inputClass} value={form.progressoTotal} onChange={e => handleChange('progressoTotal', e.target.value)} /></div>
              </div>
              <div className="border-t border-slate-100 pt-4">
                <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                  <div className="flex gap-2"><div className="w-1/2"><label className={labelClass}>Dom. BIO</label><input type="text" className={inputClass} value={form.dominioBio} onChange={e => handleChange('dominioBio', e.target.value)} /></div><div className="w-1/2"><label className={labelClass}>Prog. BIO</label><input type="text" className={inputClass} value={form.progressoBio} onChange={e => handleChange('progressoBio', e.target.value)} /></div></div>
                  <div className="flex gap-2"><div className="w-1/2"><label className={labelClass}>Dom. QUI</label><input type="text" className={inputClass} value={form.dominioQui} onChange={e => handleChange('dominioQui', e.target.value)} /></div><div className="w-1/2"><label className={labelClass}>Prog. QUI</label><input type="text" className={inputClass} value={form.progressoQui} onChange={e => handleChange('progressoQui', e.target.value)} /></div></div>
                  <div className="flex gap-2"><div className="w-1/2"><label className={labelClass}>Dom. FIS</label><input type="text" className={inputClass} value={form.dominioFis} onChange={e => handleChange('dominioFis', e.target.value)} /></div><div className="w-1/2"><label className={labelClass}>Prog. FIS</label><input type="text" className={inputClass} value={form.progressoFis} onChange={e => handleChange('progressoFis', e.target.value)} /></div></div>
                  <div className="flex gap-2"><div className="w-1/2"><label className={labelClass}>Dom. MAT</label><input type="text" className={inputClass} value={form.dominioMat} onChange={e => handleChange('dominioMat', e.target.value)} /></div><div className="w-1/2"><label className={labelClass}>Prog. MAT</label><input type="text" className={inputClass} value={form.progressoMat} onChange={e => handleChange('progressoMat', e.target.value)} /></div></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-between items-center rounded-b-xl">
          {step > 1 ? (
            <button onClick={() => setStep(step - 1)} className="font-medium text-slate-400 hover:text-[#060242] text-sm transition">← Voltar</button>
          ) : <div />}

          <div className="flex items-center gap-4">
            <span className={`text-sm font-medium ${statusMsg.includes('Erro') ? 'text-red-500' : 'text-emerald-600'}`}>{statusMsg}</span>
            {step < 3 ? (
              <button onClick={() => setStep(step + 1)} disabled={step === 1 && !form.idAluno} className="bg-[#060242] text-white px-6 py-2.5 rounded-lg font-semibold text-sm disabled:opacity-50 hover:bg-blue-900 transition">Avançar →</button>
            ) : (
              <button onClick={salvarRegistro} className="bg-[#D4B726] hover:bg-yellow-500 text-white px-6 py-2.5 rounded-lg font-semibold text-sm transition-all">Sincronizar Registro</button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
