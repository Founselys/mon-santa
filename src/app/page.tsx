"use client";
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Gift, LogOut, Users, ArrowLeft, Eye, EyeOff, X, CheckCircle2, ChevronRight, Loader2, Calendar, AlertCircle } from 'lucide-react';
import { supabase } from '@/utils/supabase';

export default function SecretSanta() {
  const [step, setStep] = useState('home'); 
  const [user, setUser] = useState<any>(null);
  const [groupName, setGroupName] = useState('');
  const [eventDate, setEventDate] = useState(''); 
  const [loading, setLoading] = useState(false);
  const [mesGroupes, setMesGroupes] = useState<any[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [participants, setParticipants] = useState([
    { id: 1, name: '', email: '' },
    { id: 2, name: '', email: '' },
    { id: 3, name: '', email: '' }
  ]);
  const [revealedTargets, setRevealedTargets] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) fetchMesGroupes(user.id);
    };
    checkUser();
  }, []);

  const fetchMesGroupes = async (userId: string) => {
    const { data, error } = await supabase
      .from('groups')
      .select('*, participants(*)')
      .eq('organizer_id', userId)
      .order('created_at', { ascending: false });
    if (!error && data) setMesGroupes(data);
  };

  // NOUVELLE FONCTION : Connexion via Magic Link
  const handleLogin = async () => {
    const email = window.prompt("Entre ton email pour recevoir un lien de connexion :");
    if (!email) return;

    const { error } = await supabase.auth.signInWithOtp({
      email: email,
      options: {
        emailRedirectTo: window.location.origin, 
      }
    });

    if (error) {
      alert("Erreur : " + error.message);
    } else {
      alert("Un lien de connexion a été envoyé sur ton email ! 📧 Vérifie tes spams.");
    }
  };

  const supprimerGroupe = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); 
    if (!confirm("Attention : Cela supprimera définitivement le groupe et les listes. Continuer ?")) return;
    
    const { error } = await supabase.from('groups').delete().eq('id', id);
    if (!error) {
      setMesGroupes(mesGroupes.filter(g => g.id !== id));
      if (selectedGroup?.id === id) setStep('home');
    } else {
      alert("Erreur lors de la suppression");
    }
  };

  const lancerLeTirage = async () => {
    if (!user || !groupName.trim()) {
      alert("Veuillez remplir le nom du groupe.");
      return;
    }
    setLoading(true);

    let resultats: { [key: number]: number } = {};
    let success = false;
    let tentative = 0;
    while (!success && tentative < 500) {
        tentative++;
        let ciblesPossibles = participants.map(p => p.id);
        let tirageTemporaire: { [key: number]: number } = {};
        let echec = false;
        for (let p of participants) {
            let choixValides = ciblesPossibles.filter(id => id !== p.id);
            if (choixValides.length === 0) { echec = true; break; }
            let choixId = choixValides[Math.floor(Math.random() * choixValides.length)];
            tirageTemporaire[p.id] = choixId;
            ciblesPossibles = ciblesPossibles.filter(id => id !== choixId);
        }
        if (!echec) { resultats = tirageTemporaire; success = true; }
    }

    try {
      const { data: group } = await supabase.from('groups').insert([{ 
        name: groupName, 
        organizer_id: user.id,
        delete_at: eventDate || null 
      }]).select().single();

      const { data: dbParticipants } = await supabase.from('participants').insert(
        participants.map(p => ({ group_id: group.id, name: p.name, email: p.email }))
      ).select();

      const emailsToSend = [];
      for (let p of participants) {
        const monProfilDb = dbParticipants!.find(db => db.email === p.email);
        const maCibleLocale = participants.find(pl => pl.id === resultats[p.id]);
        const maCibleDb = dbParticipants!.find(db => db.email === maCibleLocale?.email);
        
        await supabase.from('participants').update({ target_id: maCibleDb!.id }).eq('id', monProfilDb!.id);
        
        emailsToSend.push({ 
            to: p.email, 
            name: p.name, 
            targetName: maCibleLocale?.name, 
            groupName, 
            groupId: group.id, 
            participantId: monProfilDb!.id 
        });
      }

      await fetch('/api/send', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ emails: emailsToSend }) 
      });

      await fetchMesGroupes(user.id);
      setStep('success');
    } catch (e) { alert("Erreur"); }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased text-left">
      <nav className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2 font-black text-red-600 text-2xl tracking-tighter cursor-pointer" onClick={() => setStep('home')}>
            <Gift fill="currentColor" size={28} /> SANTAPP
          </div>
          {user && (
            <button onClick={() => { supabase.auth.signOut(); setUser(null); setStep('home'); }} className="p-2 text-slate-400 hover:text-red-500 rounded-xl transition-all">
              <LogOut size={22} />
            </button>
          )}
        </div>
      </nav>

      <main className="max-w-4xl mx-auto py-12 px-6">
        {step === 'home' && (
          <div className="space-y-12">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 hover:border-red-400 transition-all cursor-pointer group shadow-sm hover:shadow-xl" onClick={() => user ? setStep('create') : handleLogin()}>
                <div className="bg-red-50 w-16 h-16 rounded-2xl flex items-center justify-center text-red-600 mb-6 group-hover:scale-110 transition-transform"><Plus size={32} /></div>
                <h3 className="text-2xl font-black uppercase tracking-tight">Nouveau tirage</h3>
                <p className="text-slate-500 font-medium">Lancer un nouveau Secret Santa.</p>
              </div>
              <div className="bg-slate-900 p-10 rounded-[2.5rem] text-white shadow-2xl flex flex-col justify-center">
                <p className="text-5xl font-black text-red-500">{mesGroupes.length}</p>
                <p className="opacity-50 uppercase text-xs font-black tracking-widest">Groupes actifs</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest ml-4">Mes Groupes</h3>
              {mesGroupes.map((group) => (
                <div key={group.id} onClick={() => { setSelectedGroup(group); setStep('view'); }} className="bg-white p-6 rounded-3xl border border-slate-200 flex justify-between items-center hover:border-red-500 transition-all cursor-pointer group">
                  <div className="flex items-center gap-5">
                    <div className="bg-slate-50 p-4 rounded-2xl text-slate-400 group-hover:text-red-500"><Users size={22} /></div>
                    <div>
                      <h4 className="font-black text-lg text-slate-800 uppercase tracking-tight">{group.name}</h4>
                      <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 mt-1">
                        <Calendar size={12}/> 
                        {group.delete_at ? `Fin le ${new Date(group.delete_at).toLocaleDateString()}` : "Date non définie"}
                      </p>
                    </div>
                  </div>
                  <button onClick={(e) => supprimerGroupe(group.id, e)} className="p-3 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all">
                    <Trash2 size={20} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 'create' && (
          <div className="bg-white rounded-[3rem] shadow-2xl p-10 border border-slate-100 animate-in slide-in-from-bottom-4 duration-500">
            <button onClick={() => setStep('home')} className="mb-8 text-slate-400 hover:text-slate-900 flex items-center gap-2 text-xs font-black uppercase tracking-widest transition-colors">
              <ArrowLeft size={16} /> Retour
            </button>
            <h2 className="text-4xl font-black mb-10 text-slate-900 uppercase tracking-tighter italic">Configuration</h2>
            <div className="space-y-8">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-black text-slate-400 uppercase ml-3">Nom du groupe</label>
                  <input type="text" placeholder="Noël 2024" className="w-full p-5 mt-2 rounded-2xl border-2 border-slate-100 outline-none focus:border-red-500 bg-slate-50 font-bold text-lg text-slate-700" value={groupName} onChange={(e) => setGroupName(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-black text-slate-400 uppercase ml-3">Date de l'événement (Optionnel)</label>
                  <input type="date" className="w-full p-5 mt-2 rounded-2xl border-2 border-slate-100 outline-none focus:border-red-500 bg-slate-50 font-bold text-lg text-slate-700" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-xs font-black text-slate-400 uppercase ml-3">Participants</label>
                {participants.map((p, index) => (
                  <div key={p.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex gap-4 items-center">
                    <span className="font-black text-slate-200 w-6 text-center">{index + 1}</span>
                    <input placeholder="Prénom" className="flex-1 p-3 rounded-xl bg-white font-bold outline-none text-slate-700 focus:ring-2 ring-red-100" value={p.name} onChange={(e) => setParticipants(participants.map(item => item.id === p.id ? {...item, name: e.target.value} : item))} />
                    <input placeholder="Email" className="flex-1 p-3 rounded-xl bg-white font-medium outline-none text-slate-600 focus:ring-2 ring-red-100" value={p.email} onChange={(e) => setParticipants(participants.map(item => item.id === p.id ? {...item, email: e.target.value} : item))} />
                    {participants.length > 3 && (
                      <button onClick={() => setParticipants(participants.filter(item => item.id !== p.id))} className="p-2 text-slate-300 hover:text-red-500"><X size={18}/></button>
                    )}
                  </div>
                ))}
              </div>
              <button onClick={() => setParticipants([...participants, {id: Date.now(), name: '', email: ''}])} className="text-red-600 font-black text-xs uppercase tracking-widest hover:bg-red-50 px-6 py-3 rounded-xl transition-colors">+ Ajouter un ami</button>
              
              <button onClick={lancerLeTirage} disabled={loading || !groupName} className="w-full py-5 rounded-2xl font-black text-xl bg-red-600 text-white shadow-xl shadow-red-200 hover:bg-red-700 disabled:bg-slate-100 transition-all">
                {loading ? <Loader2 className="animate-spin mx-auto text-white" /> : "LANCER LE SECRET SANTA"}
              </button>
            </div>
          </div>
        )}

        {step === 'view' && selectedGroup && (
          <div className="bg-white rounded-[3rem] shadow-xl p-10 border border-slate-100">
            <div className="flex justify-between items-center mb-10">
              <button onClick={() => setStep('home')} className="flex items-center gap-2 text-slate-400 hover:text-slate-900 font-black text-xs uppercase transition-colors"><ArrowLeft size={18}/> Retour</button>
              <button onClick={(e) => supprimerGroupe(selectedGroup.id, e)} className="p-3 text-red-500 hover:bg-red-50 rounded-xl transition-all">
                <Trash2 size={20} />
              </button>
            </div>
            <h2 className="text-4xl font-black mb-10 uppercase tracking-tighter">{selectedGroup.name}</h2>
            <div className="space-y-4">
              {selectedGroup.participants?.map((p: any) => {
                const maCible = selectedGroup.participants.find((t: any) => String(t.id) === String(p.target_id));
                const isRevealed = revealedTargets[p.id];
                return (
                  <div key={p.id} className="p-6 rounded-3xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                    <div className="font-black text-slate-800 text-xl uppercase tracking-tight">{p.name}</div>
                    <div className="flex items-center gap-4">
                      <div className={`font-black px-6 py-3 rounded-2xl transition-all duration-500 ${isRevealed ? 'text-red-600 bg-red-50' : 'text-transparent bg-slate-200 blur-md select-none'}`}>
                        {maCible ? maCible.name : "..."}
                      </div>
                      <button onClick={() => setRevealedTargets(prev => ({...prev, [p.id]: !prev[p.id]}))} className={`p-3 rounded-xl border transition-all ${isRevealed ? 'bg-red-600 text-white border-red-600 shadow-lg' : 'bg-white border-slate-200 text-slate-400 hover:border-red-400'}`}>
                        {isRevealed ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className="bg-white p-20 rounded-[4rem] shadow-2xl border border-slate-100 text-center animate-in zoom-in duration-500">
            <div className="w-24 h-24 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-10 shadow-inner">
              <CheckCircle2 size={48} strokeWidth={3} />
            </div>
            <h2 className="text-4xl font-black mb-4 text-slate-900 uppercase tracking-tighter italic">C'est envoyé ! 🎅</h2>
            <p className="text-slate-400 font-bold mb-10">Les participants ont reçu leur mission secrète.</p>
            <button onClick={() => setStep('home')} className="bg-slate-900 text-white px-12 py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl">Retour à l'accueil</button>
          </div>
        )}
      </main>
    </div>
  );
}