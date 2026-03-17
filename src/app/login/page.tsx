"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';
import { ArrowLeft, Mail, Key, Sparkles, Loader2, Moon, Sun } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('theme') === 'dark') setIsDark(true);
  }, []);

  const toggleTheme = () => {
    const newMode = !isDark;
    setIsDark(newMode);
    localStorage.setItem('theme', newMode ? 'dark' : 'light');
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return alert("Remplis tous les champs !");
    setLoading(true);

    if (isSignUp) {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) alert("Erreur d'inscription : " + error.message);
      else alert("Compte créé ! Tu peux maintenant te connecter. (Vérifie tes spams si un mail de confirmation a été envoyé)");
      setIsSignUp(false);
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) alert("Erreur de connexion : " + error.message);
      else window.location.href = '/'; 
    }
    setLoading(false);
  };

  const handleMagicLink = async () => {
    if (!email) return alert("Entre ton email d'abord !");
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email,
      options: { emailRedirectTo: window.location.origin }
    });
    if (error) alert("Erreur : " + error.message);
    else alert("✨ Lien magique envoyé ! Vérifie tes spams.");
    setLoading(false);
  };

  const handleGooglePlaceholder = () => {
    alert("Connexion avec Google bientôt disponible ! 🚀");
  };

  const handleApplePlaceholder = () => {
    alert("Connexion avec Apple bientôt disponible ! 🍏");
  };

  return (
    <div className={`min-h-screen font-sans text-left italic font-black uppercase tracking-tighter transition-colors duration-300 flex flex-col justify-center items-center p-4 md:p-8 ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      
      <div className="fixed top-6 left-6 md:top-8 md:left-8 z-50">
        <a href="/" className={`p-4 rounded-2xl border-4 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center gap-2 ${isDark ? 'bg-slate-800 text-white border-slate-700 hover:bg-slate-700' : 'bg-white text-slate-900 border-slate-900 hover:bg-slate-100'}`}>
            <ArrowLeft size={24} /> RETOUR
        </a>
      </div>
      <div className="fixed top-6 right-6 md:top-8 md:right-8 z-50">
        <button onClick={toggleTheme} className={`p-4 rounded-2xl border-4 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${isDark ? 'bg-slate-800 text-white border-slate-700 hover:bg-slate-700' : 'bg-white text-slate-900 border-slate-900 hover:bg-slate-100'}`}>
            {isDark ? <Sun size={24} /> : <Moon size={24} />}
        </button>
      </div>

      <div className={`w-full max-w-lg p-8 md:p-12 rounded-[3rem] border-[6px] shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-900'}`}>
        <h1 className="text-5xl md:text-6xl mb-8 leading-none text-center">
          {isSignUp ? "CRÉER UN COMPTE" : "CONNEXION"}
        </h1>

        <div className="flex flex-col gap-4 mb-8">
            {/* BOUTON GOOGLE */}
            <button onClick={handleGooglePlaceholder} className={`w-full py-4 rounded-2xl border-4 flex items-center justify-center gap-3 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-none ${isDark ? 'bg-slate-800 border-slate-600 text-white hover:bg-slate-700' : 'bg-white border-slate-900 text-slate-900 hover:bg-slate-50'}`}>
              <svg className="w-6 h-6" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
              CONTINUER AVEC GOOGLE
            </button>
            
            {/* BOUTON APPLE */}
            <button onClick={handleApplePlaceholder} className={`w-full py-4 rounded-2xl border-4 flex items-center justify-center gap-3 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-none ${isDark ? 'bg-slate-950 border-slate-700 text-white hover:bg-black' : 'bg-slate-900 border-slate-900 text-white hover:bg-slate-800'}`}>
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.56-1.702z"/></svg>
              CONTINUER AVEC APPLE
            </button>
        </div>

        <div className="flex items-center gap-4 mb-8 opacity-50">
          <div className={`h-[2px] flex-1 ${isDark ? 'bg-slate-600' : 'bg-slate-300'}`}></div>
          <span className="text-sm">OU AVEC TON EMAIL</span>
          <div className={`h-[2px] flex-1 ${isDark ? 'bg-slate-600' : 'bg-slate-300'}`}></div>
        </div>

        <form onSubmit={handleEmailAuth} className="space-y-6">
          <div className="relative">
            <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" size={24} />
            <input 
              type="email"
              placeholder="ADRESSE EMAIL" 
              className={`w-full p-5 pl-16 text-xl rounded-2xl border-[4px] outline-none transition-colors ${isDark ? 'bg-slate-800 border-slate-700 focus:border-red-500 text-white placeholder:text-slate-500' : 'bg-slate-50 border-slate-900 focus:border-red-500 focus:bg-red-50 placeholder:text-slate-400'}`} 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
            />
          </div>
          <div className="relative">
            <Key className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" size={24} />
            <input 
              type="password"
              placeholder="MOT DE PASSE" 
              className={`w-full p-5 pl-16 text-xl rounded-2xl border-[4px] outline-none transition-colors ${isDark ? 'bg-slate-800 border-slate-700 focus:border-red-500 text-white placeholder:text-slate-500' : 'bg-slate-50 border-slate-900 focus:border-red-500 focus:bg-red-50 placeholder:text-slate-400'}`} 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
            />
          </div>

          <button type="submit" disabled={loading} className={`w-full py-5 rounded-2xl text-2xl bg-red-600 text-white border-[4px] shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:bg-red-500 hover:translate-y-1 hover:shadow-none disabled:opacity-50 transition-all ${isDark ? 'border-slate-800' : 'border-slate-900'}`}>
            {loading ? <Loader2 className="animate-spin mx-auto" size={28}/> : (isSignUp ? "S'INSCRIRE" : "SE CONNECTER")}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button onClick={() => setIsSignUp(!isSignUp)} className={`text-sm underline underline-offset-4 mb-8 ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}>
            {isSignUp ? "J'ai déjà un compte ! Me connecter" : "Je n'ai pas de mot de passe. Créer un compte"}
          </button>

          <button onClick={handleMagicLink} disabled={loading} className={`w-full py-4 rounded-2xl border-4 border-dashed flex items-center justify-center gap-2 transition-colors ${isDark ? 'bg-transparent border-slate-600 text-slate-300 hover:bg-slate-800 hover:border-slate-400' : 'bg-slate-50 border-slate-300 text-slate-600 hover:bg-slate-100 hover:border-slate-900'}`}>
            <Sparkles size={20} className="text-yellow-500" />
            M'ENVOYER UN LIEN MAGIQUE SANS MOT DE PASSE
          </button>
        </div>

      </div>
    </div>
  );
}