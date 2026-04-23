'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth, googleProvider } from '@/lib/firebase';
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';

export default function Home() {
  const router = useRouter();

  const [modoLogin, setModoLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');

  const efetuarLoginComGoogle = async () => {
    setCarregando(true);
    setErro('');
    try {
      const resultado = await signInWithPopup(auth, googleProvider);
      await processarAcessoNoSistema(resultado.user.email, resultado.user.displayName || "Novo Aluno");
    } catch (e) {
      setErro("Falha ao abrir o login do Google.");
      setCarregando(false);
    }
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setCarregando(true);
    setErro('');
    try {
      let credencial;
      if (modoLogin) {
        credencial = await signInWithEmailAndPassword(auth, email, senha);
      } else {
        credencial = await createUserWithEmailAndPassword(auth, email, senha);
      }
      const nomeProvisorio = email.split('@')[0];
      await processarAcessoNoSistema(credencial.user.email, nomeProvisorio);
    } catch (e) {
      console.error(e);
      if (e.code === 'auth/email-already-in-use') setErro('Este e-mail já está registado. Faça login.');
      else if (e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') setErro('E-mail ou senha incorretos.');
      else if (e.code === 'auth/weak-password') setErro('A senha deve ter pelo menos 6 caracteres.');
      else setErro('Ocorreu um erro. Verifique os seus dados e tente novamente.');
      setCarregando(false);
    }
  };

  const processarAcessoNoSistema = async (emailUsuario, nomeUsuario) => {
    try {
      const resBase = await fetch('/api/mentor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acao: 'loginGlobal', email: emailUsuario, nome: nomeUsuario })
      });
      const dados = await resBase.json();
      if (dados.status === 'sucesso') {
        sessionStorage.setItem('emailLogado', emailUsuario.toLowerCase());
        router.push(dados.rota);
      } else {
        setErro(dados.mensagem);
      }
    } catch (e) {
      setErro("Erro na rede. Verifique sua conexão.");
    }
  };

  const inputClasse = "w-full p-3 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-[#060242] transition-all font-medium text-[#060242]";

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans p-4">
      <div className="w-full max-w-[400px] p-8 bg-white rounded-xl shadow-sm border border-slate-200">

        <div className="text-center mb-8">
          <img src="/simbolo-azul.png" alt="Intento" className="w-10 h-10 object-contain mx-auto mb-3" />
          <h1 className="text-2xl font-semibold text-[#060242]">Intento</h1>
          <p className="text-slate-400 font-medium mt-1 text-sm">Plataforma de Mentoria</p>
        </div>

        {erro && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-medium border border-red-100 mb-6 text-center">
            {erro}
          </div>
        )}

        <form onSubmit={handleEmailAuth} className="space-y-4">
          <div>
            <label className="block text-[11px] font-medium text-slate-400 uppercase mb-2 tracking-wider">E-mail</label>
            <input
              type="email"
              placeholder="exemplo@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={carregando}
              required
              className={inputClasse}
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-400 uppercase mb-2 tracking-wider">Senha</label>
            <input
              type="password"
              placeholder="••••••••"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              disabled={carregando}
              required
              className={inputClasse}
            />
          </div>

          <button
            type="submit"
            disabled={carregando}
            className="w-full py-3 mt-2 bg-[#060242] text-white font-semibold rounded-lg hover:bg-blue-900 transition-all disabled:opacity-50 text-sm"
          >
            {carregando ? 'A processar...' : (modoLogin ? 'Entrar' : 'Criar Conta')}
          </button>
        </form>

        <div className="relative flex items-center py-5">
          <div className="flex-grow border-t border-slate-200"></div>
          <span className="flex-shrink-0 mx-4 text-slate-400 text-xs font-medium uppercase tracking-wider">ou</span>
          <div className="flex-grow border-t border-slate-200"></div>
        </div>

        <button
          onClick={efetuarLoginComGoogle}
          disabled={carregando}
          className="w-full flex items-center justify-center gap-3 bg-white border border-slate-200 text-slate-500 py-2.5 rounded-lg font-medium hover:bg-slate-50 transition-all disabled:opacity-50 text-sm"
        >
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Continuar com Google
        </button>

        <div className="mt-5 text-center text-sm font-medium text-slate-500">
          {modoLogin ? (
            <p>
              Não tem uma conta? <button type="button" onClick={() => { setModoLogin(false); setErro(''); }} className="text-[#060242] font-medium hover:underline">Registre-se</button>
            </p>
          ) : (
            <p>
              Já tem uma conta? <button type="button" onClick={() => { setModoLogin(true); setErro(''); }} className="text-[#060242] font-medium hover:underline">Faça Login</button>
            </p>
          )}
        </div>

      </div>
    </div>
  );
}
