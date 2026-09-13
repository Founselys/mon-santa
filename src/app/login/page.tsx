"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';
import { Gift, ArrowLeft, Loader2, Moon, Sun } from 'lucide-react';

export default function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'error' | 'success' } | null>(null);

  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('theme') === 'dark') setIsDark(true);
  }, []);

  const toggleTheme = () => {
    const newMode = !isDark;
    setIsDark(newMode);
    localStorage.setItem('theme', newMode ? 'dark' : 'light');
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (isSignUp) {
        if (!firstName.trim()) {
          setMessage({ text: "Merci d'indiquer ton prénom !", type: 'error' });
          setLoading(false);
          return;
        }

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              first_name: firstName.trim(),
            },
          },
        });
        if (error) throw error;
        setMessage({ text: "Compte créé ! Vérifie tes e-mails pour valider ton compte.", type: 'success' });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        window.location.href = '/';
      }
    } catch (err: any) {
      setMessage({ text: err.message || "Une erreur est survenue", type: 'error' });
    }
    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    });
  };

  return (
    <div className={`min-h-screen font-sans italic font-black uppercase tracking-tighter flex items-center justify-center p-4 relative transition-colors duration-300 ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* BOUTON MODE SOMBRE EN HAUT À DROITE */}
      <div className="absolute top-4 right-4 md:top-8 md:right-8 z-50">
        <button onClick={toggleTheme} className={`p-3 rounded-xl border-4 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${isDark ? 'bg-slate-800 text-white border-slate-700 hover:bg-slate-700' : 'bg-white text-slate-900 border-slate-900 hover:bg-slate-100'}`}>
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>

      <div className={`max-w-md w-full border-[6px] rounded-[3rem] p-8 md:p-10 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-900 text-slate-900'}`}>
        
        <a href="/" className={`inline-flex items-center gap-2 text-xs mb-6 transition-colors ${isDark ? 'text-slate-400 hover:text-red-400' : 'text-slate-500 hover:text-red-600'}`}>
          <ArrowLeft size={16} /> ACCUEIL
        </a>

        <div className="flex items-center gap-3 mb-6">
          <div className="bg-yellow-400 p-3 rounded-2xl border-4 border-slate-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center">
            <Gift size={32} className="text-slate-900 stroke-[2.5]" />
          </div>
          <h1 className="text-4xl leading-none">SANTAPP</h1>
        </div>

        <h2 className="text-2xl mb-6">
          {isSignUp ? "CRÉER UN COMPTE 🎅" : "SE CONNECTER 🔑"}
        </h2>

        {message && (
          <div className={`p-4 rounded-2xl border-4 mb-6 text-sm ${message.type === 'error' ? (isDark ? 'bg-red-950/60 border-red-800 text-red-200' : 'bg-red-100 border-red-500 text-red-700') : (isDark ? 'bg-green-950/60 border-green-800 text-green-200' : 'bg-green-100 border-green-500 text-green-700')}`}>
            {message.text}
          </div>
        )}

        <button
          type="button"
          onClick={handleGoogleLogin}
          className={`w-full py-4 px-6 border-4 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all flex items-center justify-center gap-3 mb-6 ${isDark ? 'bg-slate-800 text-white border-slate-700 hover:bg-slate-700' : 'bg-white text-slate-900 border-slate-900 hover:bg-slate-100'}`}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
          </svg>
          CONTINUER AVEC GOOGLE
        </button>

        <div className="flex items-center gap-4 my-6 opacity-40">
          <div className={`h-[2px] flex-1 ${isDark ? 'bg-slate-700' : 'bg-slate-900'}`}></div>
          <span className="text-xs">OU PAR EMAIL</span>
          <div className={`h-[2px] flex-1 ${isDark ? 'bg-slate-700' : 'bg-slate-900'}`}></div>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          {isSignUp && (
            <div>
              <label className={`text-xs ml-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>PRÉNOM :</label>
              <input
                type="text"
                placeholder="Ex: Jean"
                required
                className={`w-full p-4 text-lg rounded-2xl border-4 outline-none transition-colors ${isDark ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-red-500' : 'bg-slate-50 border-slate-900 text-slate-900 placeholder:text-slate-300 focus:border-red-500'}`}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
          )}

          <div>
            <label className={`text-xs ml-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>E-MAIL :</label>
            <input
              type="email"
              placeholder="ton@email.com"
              required
              className={`w-full p-4 text-lg rounded-2xl border-4 outline-none transition-colors ${isDark ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-red-500' : 'bg-slate-50 border-slate-900 text-slate-900 placeholder:text-slate-300 focus:border-red-500'}`}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className={`text-xs ml-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>MOT DE PASSE :</label>
            <input
              type="password"
              placeholder="••••••••"
              required
              className={`w-full p-4 text-lg rounded-2xl border-4 outline-none transition-colors ${isDark ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-red-500' : 'bg-slate-50 border-slate-900 text-slate-900 placeholder:text-slate-300 focus:border-red-500'}`}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-5 bg-red-600 hover:bg-red-500 text-white text-xl border-4 border-slate-900 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all flex justify-center items-center"
          >
            {loading ? <Loader2 className="animate-spin" size={24} /> : (isSignUp ? "S'INSCRIRE 🚀" : "SE CONNECTER ⚡")}
          </button>
        </form>

        <button
          type="button"
          onClick={() => { setIsSignUp(!isSignUp); setMessage(null); }}
          className={`w-full text-center text-xs mt-6 transition-colors ${isDark ? 'text-slate-400 hover:text-red-400' : 'text-slate-500 hover:text-red-600'}`}
        >
          {isSignUp ? "Déjà un compte ? Connecte-toi" : "Pas encore de compte ? Inscris-toi"}
        </button>

      </div>
    </div>
  );
}