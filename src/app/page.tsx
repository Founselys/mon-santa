"use client";
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Gift, LogOut, Users, ArrowLeft, Eye, EyeOff, X, CheckCircle2, Loader2, List, ExternalLink, ArrowRight, Moon, Sun, Banknote, Copy, Edit3 } from 'lucide-react';
import { supabase } from '@/utils/supabase';

export default function SecretSanta() {
  const [step, setStep] = useState('home'); 
  const [user, setUser] = useState<any>(null);
  const [groupName, setGroupName] = useState('');
  const [eventDate, setEventDate] = useState(''); 
  const [budget, setBudget] = useState(''); 
  
  // États pour la modification depuis la vue organisateur
  const [editBudget, setEditBudget] = useState(''); 
  const [editGroupName, setEditGroupName] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [mesGroupes, setMesGroupes] = useState<any[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [myParticipantInfo, setMyParticipantInfo] = useState<any>(null);
  
  const [isDark, setIsDark] = useState(false);

  const [participants, setParticipants] = useState([
    { id: 1, name: '', email: '', exclude: '' },
    { id: 2, name: '', email: '', exclude: '' },
    { id: 3, name: '', email: '', exclude: '' }
  ]);
  const [revealedTargets, setRevealedTargets] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    if (localStorage.getItem('theme') === 'dark') setIsDark(true);

    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) fetchMesGroupes(user.id);
    };
    checkUser();
  }, []);

  const toggleTheme = () => {
    const newMode = !isDark;
    setIsDark(newMode);
    localStorage.setItem('theme', newMode ? 'dark' : 'light');
  };

  const fetchMesGroupes = async (userId: string) => {
    const { data, error } = await supabase
      .from('groups')
      .select('*, participants(*)')
      .eq('organizer_id', userId)
      .order('created_at', { ascending: false });
    if (!error && data) setMesGroupes(data);
  };

  const handleLogin = async () => {
    const email = window.prompt("Entre ton email pour recevoir ton lien de connexion :");
    if (!email) return;
    const { error } = await supabase.auth.signInWithOtp({
      email: email,
      options: { emailRedirectTo: window.location.origin }
    });
    if (error) alert("Erreur : " + error.message);
    else alert("Lien envoyé ! Vérifie tes spams.");
  };

  // NOUVEAU : Fonction unique pour mettre à jour les paramètres du groupe
  const updateGroupSettings = async () => {
    if (!selectedGroup) return;
    if (editGroupName.trim() === '') return alert("Le nom du groupe ne peut pas être vide.");
    
    setLoading(true);

    const { error } = await supabase
        .from('groups')
        .update({ name: editGroupName, budget: editBudget })
        .eq('id', selectedGroup.id);
        
    if (error) {
        alert("Erreur lors de la sauvegarde : " + error.message);
    } else {
        alert("Paramètres sauvegardés ! ⚙️"); 
        setSelectedGroup({...selectedGroup, name: editGroupName, budget: editBudget});
        await fetchMesGroupes(user.id);
    }

    setLoading(false);
  };

  const supprimerGroupe = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); 
    if (!confirm("Supprimer ce groupe définitivement ?")) return;
    await supabase.from('groups').delete().eq('id', id);
    setMesGroupes(mesGroupes.filter(g => g.id !== id));
    setStep('home');
  };

  const lancerLeTirage = async () => {
    if (!user || !groupName.trim()) return alert("Nom du groupe requis");
    setLoading(true);

    let resultats: { [key: string]: string } = {}; 
    let success = false;
    let tentative = 0;

    while (!success && tentative < 1000) {
      tentative++;
      let ciblesPossibles = [...participants];
      let tirageTemporaire: { [key: string]: string } = {};
      let echec = false;

      for (let p of participants) {
        let valides = ciblesPossibles.filter(c => c.email !== p.email && c.name !== p.exclude);
        if (valides.length === 0) { echec = true; break; }
        let choix = valides[Math.floor(Math.random() * valides.length)];
        tirageTemporaire[p.email] = choix.email;
        ciblesPossibles = ciblesPossibles.filter(c => c.email !== choix.email);
      }
      if (!echec) { resultats = tirageTemporaire; success = true; }
    }

    if (!success) {
      setLoading(false);
      return alert("Tirage impossible avec ces exclusions. Essaie de les réduire.");
    }

    try {
      const { data: group, error: groupError } = await supabase.from('groups').insert([{ name: groupName, organizer_id: user.id, delete_at: eventDate || null, budget: budget }]).select().single();
      if (groupError) { alert("Erreur Création Groupe : " + groupError.message); setLoading(false); return; }

      const { data: dbParticipants, error: partError } = await supabase.from('participants').insert(participants.map(p => ({ group_id: group.id, name: p.name, email: p.email }))).select();
      if (partError) { alert("Erreur Ajout Participants : " + partError.message); setLoading(false); return; }
      
      const emailsToSend = [];
      for (let p of participants) {
        const monProfilDb = dbParticipants!.find(db => db.email === p.email);
        const cibleEmail = resultats[p.email];
        const maCibleDb = dbParticipants!.find(db => db.email === cibleEmail);
        
        await supabase.from('participants').update({ target_id: maCibleDb!.id }).eq('id', monProfilDb!.id);
        emailsToSend.push({ to: p.email, name: p.name, targetName: maCibleDb!.name, groupName, groupId: group.id, participantId: monProfilDb!.id });
      }

      await fetch('/api/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ emails: emailsToSend }) });
      await fetchMesGroupes(user.id);
      setStep('success');
    } catch (e: any) { alert("Erreur générale : " + e.message); }
    setLoading(false);
  };

  // NOUVEAU : Fonction pour copier le lien magique
  const copyMagicLink = (participantId: string, participantName: string) => {
    const link = `${window.location.origin}/wishlist/${selectedGroup.id}?p=${participantId}`;
    navigator.clipboard.writeText(link).then(() => {
        alert(`Lien magique copié pour ${participantName} ! Tu peux le coller dans un message.`);
    }).catch(err => {
        alert("Erreur lors de la copie du lien : " + err);
    });
  };

  return (
    <div className={`min-h-screen font-sans text-left italic font-black uppercase tracking-tighter transition-colors duration-300 ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      
      <nav className="bg-red-600 border-b-[6px] border-slate-900 px-6 py-4 sticky top-0 z-50 text-white shadow-sm">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3 font-black text-white text-3xl tracking-tighter cursor-pointer hover:scale-105 transition-transform origin-left" onClick={() => setStep('home')}>
            <Gift fill="currentColor" size={36} className="drop-shadow-md" /> SANTAPP
          </div>
          <div className="flex items-center gap-4">
            <button onClick={toggleTheme} className="p-3 bg-slate-900 text-white rounded-xl border-4 border-slate-900 hover:bg-white hover:text-slate-900 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            {user && (
              <button onClick={() => { supabase.auth.signOut(); setUser(null); setStep('home'); }} 
              className="p-3 bg-slate-900 text-white rounded-xl border-4 border-slate-900 hover:bg-white hover:text-slate-900 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center gap-2 text-xs">
                <LogOut size={18} /> <span className="hidden md:block">DÉCONNEXION</span>
              </button>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto py-12 px-4 md:px-8">
        
        {step === 'home' && (
          <div className="space-y-12">
            
            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-green-400 p-10 rounded-[3rem] border-[6px] border-slate-900 hover:-translate-y-2 transition-all cursor-pointer group shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]" onClick={() => user ? setStep('create') : handleLogin()}>
                <div className="bg-white w-20 h-20 rounded-3xl border-4 border-slate-900 flex items-center justify-center text-slate-900 mb-6 group-hover:scale-110 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"><Plus size={40} /></div>
                <h3 className="text-4xl text-slate-900 leading-none">NOUVEAU<br/>TIRAGE</h3>
              </div>
              
              <div className={`p-10 rounded-[3rem] border-[6px] border-slate-900 shadow-[8px_8px_0px_0px_rgba(220,38,38,1)] flex flex-col justify-center ${isDark ? 'bg-slate-900 text-white' : 'bg-slate-900 text-white'}`}>
                <p className="text-8xl text-red-500 leading-none">{mesGroupes.length}</p>
                <p className="opacity-80 text-xl mt-2 flex items-center gap-2"><List size={24}/> GROUPES ACTIFS</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className={`h-[4px] flex-1 ${isDark ? 'bg-slate-700' : 'bg-slate-900'}`}></div>
                <h3 className="text-3xl">TES SESSIONS</h3>
                <div className={`h-[4px] flex-1 ${isDark ? 'bg-slate-700' : 'bg-slate-900'}`}></div>
              </div>

              {mesGroupes.length === 0 && <p className="text-center text-slate-400 py-10">AUCUN GROUPE POUR L'INSTANT...</p>}
              
              <div className="grid gap-4">
                {mesGroupes.map((group) => (
                  <div key={group.id} onClick={() => { 
                    setSelectedGroup(group); 
                    setEditBudget(group.budget || ''); 
                    setEditGroupName(group.name || ''); 
                    const monP = group.participants?.find((p: any) => p.email === user?.email);
                    setMyParticipantInfo(monP);
                    setStep('view'); 
                  }} className={`${isDark ? 'bg-slate-800 border-slate-700 hover:bg-slate-700' : 'bg-white border-slate-900 hover:bg-red-50'} p-6 md:p-8 rounded-3xl border-[4px] flex justify-between items-center hover:-translate-y-1 transition-all cursor-pointer shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] group`}>
                    <div>
                        <span className="text-3xl group-hover:text-red-600 transition-colors">{group.name}</span>
                        {group.budget && <span className="ml-4 bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full text-xs align-middle">BUDGET: {group.budget} €</span>}
                        <p className={`text-xs mt-2 flex items-center gap-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}><Users size={14}/> {group.participants?.length || 0} PARTICIPANTS</p>
                    </div>
                    <button onClick={(e) => supprimerGroupe(group.id, e)} className={`p-4 rounded-2xl border-2 transition-all ${isDark ? 'bg-slate-900 border-slate-600 text-slate-500 hover:text-white hover:bg-red-600' : 'bg-slate-100 border-slate-200 text-slate-400 hover:text-white hover:bg-red-600 hover:border-red-600'}`}><Trash2 size={24} /></button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 'create' && (
          <div className={`${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-900'} rounded-[3rem] border-[6px] shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] p-8 md:p-12 animate-in slide-in-from-bottom-4 duration-500 relative overflow-hidden`}>
            <button onClick={() => setStep('home')} className={`mb-8 flex items-center gap-2 text-sm transition-colors px-4 py-2 rounded-xl border-2 ${isDark ? 'text-slate-300 bg-slate-700 border-slate-600 hover:text-red-400' : 'text-slate-500 bg-slate-100 border-slate-200 hover:text-red-600'}`}><ArrowLeft size={18} /> RETOUR</button>
            <h2 className="text-5xl md:text-7xl mb-10 leading-none">CONFIGURATION</h2>
            
            <div className="space-y-10">
              <div className="grid md:grid-cols-3 gap-6">
                <div className="space-y-2 md:col-span-1">
                    <label className={`text-xs ml-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>NOM DU GROUPE :</label>
                    <input placeholder="Ex: Famille 2024" className={`w-full p-5 text-xl rounded-2xl border-[4px] outline-none transition-colors ${isDark ? 'bg-slate-900 border-slate-700 focus:border-red-500 text-white placeholder:text-slate-600' : 'bg-slate-50 border-slate-900 focus:border-red-500 focus:bg-red-50 placeholder:text-slate-300'}`} value={groupName} onChange={(e) => setGroupName(e.target.value)} />
                </div>
                <div className="space-y-2 md:col-span-1">
                    <label className={`text-xs ml-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>BUDGET MAX :</label>
                    <input 
                      placeholder="Ex: 50 (Chiffres)" 
                      className={`w-full p-5 text-xl rounded-2xl border-[4px] outline-none transition-colors ${isDark ? 'bg-slate-900 border-slate-700 focus:border-red-500 text-white placeholder:text-slate-600' : 'bg-slate-50 border-slate-900 focus:border-red-500 focus:bg-red-50 placeholder:text-slate-300'}`} 
                      value={budget} 
                      onChange={(e) => setBudget(e.target.value.replace(/[^0-9]/g, ''))} 
                    />
                </div>
                <div className="space-y-2 md:col-span-1">
                    <label className={`text-xs ml-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>DATE (OPTIONNEL) :</label>
                    <input type="date" className={`w-full p-5 text-xl rounded-2xl border-[4px] outline-none transition-colors ${isDark ? 'bg-slate-900 border-slate-700 focus:border-red-500 text-slate-300' : 'bg-slate-50 border-slate-900 focus:border-red-500 focus:bg-red-50 text-slate-600'}`} value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
                </div>
              </div>

              <div className={`space-y-4 p-6 md:p-8 rounded-[2rem] border-[4px] ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-slate-100 border-slate-900'}`}>
                <h3 className="text-2xl mb-4 flex items-center gap-2"><Users size={24}/> LES PARTICIPANTS</h3>
                {participants.map((p, index) => (
                  <div key={p.id} className={`p-4 rounded-2xl border-4 flex flex-wrap gap-4 items-center relative group shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${isDark ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-900'}`}>
                    <span className="text-red-400 w-6 text-xl">{index + 1}</span>
                    <input placeholder="Prénom" className={`flex-1 min-w-[120px] p-3 text-lg rounded-xl border-2 outline-none transition-colors ${isDark ? 'bg-slate-700 border-slate-600 focus:border-white text-white' : 'bg-slate-50 border-slate-200 focus:border-slate-900 text-slate-900'}`} value={p.name} onChange={(e) => setParticipants(participants.map(item => item.id === p.id ? {...item, name: e.target.value} : item))} />
                    <input placeholder="Email" className={`flex-1 min-w-[150px] p-3 text-lg rounded-xl border-2 outline-none transition-colors ${isDark ? 'bg-slate-700 border-slate-600 focus:border-white text-white' : 'bg-slate-50 border-slate-200 focus:border-slate-900 text-slate-900'}`} value={p.email} onChange={(e) => setParticipants(participants.map(item => item.id === p.id ? {...item, email: e.target.value} : item))} />
                    <select className={`flex-1 min-w-[150px] p-3 text-sm rounded-xl border-2 outline-none transition-colors ${isDark ? 'bg-red-950 text-red-400 border-red-900 focus:border-red-500' : 'bg-red-50 text-red-600 border-red-200 focus:border-red-600'}`} value={p.exclude} onChange={(e) => setParticipants(participants.map(item => item.id === p.id ? {...item, exclude: e.target.value} : item))}>
                        <option value="">PEUT PIOCHER TOUT LE MONDE</option>
                        {participants.filter(other => other.id !== p.id && other.name).map(other => (
                            <option key={other.id} value={other.name}>NE PAS PIOCHER : {other.name}</option>
                        ))}
                    </select>
                    {participants.length > 3 && <button onClick={() => setParticipants(participants.filter(item => item.id !== p.id))} className={`p-3 rounded-xl transition-colors ${isDark ? 'text-slate-500 hover:text-red-400 bg-slate-700 hover:bg-red-950' : 'text-slate-400 hover:text-red-600 bg-slate-100 hover:bg-red-100'}`}><X size={20}/></button>}
                  </div>
                ))}
                <button onClick={() => setParticipants([...participants, {id: Date.now(), name: '', email: '', exclude: ''}])} className={`mt-4 px-6 py-3 rounded-xl transition-colors flex items-center gap-2 border-2 ${isDark ? 'bg-slate-700 text-white hover:bg-slate-600 border-slate-600' : 'bg-slate-900 text-white hover:bg-slate-800 border-slate-900'}`}><Plus size={18}/> AJOUTER UN AMI</button>
              </div>
              
              <button onClick={lancerLeTirage} disabled={loading || !groupName} className={`w-full py-6 rounded-[2rem] text-3xl bg-red-600 text-white border-[6px] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:bg-red-500 hover:-translate-y-1 hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] disabled:shadow-none disabled:translate-y-0 transition-all ${isDark ? 'border-slate-800 disabled:bg-slate-800 disabled:border-slate-700 disabled:text-slate-600' : 'border-slate-900 disabled:bg-slate-300 disabled:border-slate-400 disabled:text-slate-500'}`}>
                {loading ? <Loader2 className="animate-spin mx-auto" size={40} /> : "LANCER LE TIRAGE 🎅"}
              </button>
            </div>
          </div>
        )}

        {step === 'view' && selectedGroup && (
          <div className={`${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-900'} rounded-[3rem] border-[6px] shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] p-8 md:p-12`}>
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                <div>
                    <button onClick={() => setStep('home')} className={`mb-4 flex items-center gap-2 text-sm transition-colors px-4 py-2 rounded-xl border-2 ${isDark ? 'text-slate-300 bg-slate-700 border-slate-600 hover:text-red-400' : 'text-slate-500 bg-slate-100 border-slate-200 hover:text-red-600'}`}><ArrowLeft size={18}/> RETOUR</button>
                    <h2 className="text-5xl md:text-7xl leading-none">{selectedGroup.name}</h2>
                    {selectedGroup.budget && <span className="inline-block mt-4 bg-yellow-400 text-yellow-900 px-4 py-2 rounded-full text-lg shadow-sm">BUDGET MAX : {selectedGroup.budget} €</span>}
                </div>
                
                {myParticipantInfo && (
                    <a href={`/wishlist/${selectedGroup.id}?p=${myParticipantInfo.id}`} className="bg-green-500 text-white px-6 py-4 rounded-2xl border-4 border-slate-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:-translate-y-1 hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center gap-3">
                        <span className="text-lg">ALLER SUR LA WISHLIST</span> <ArrowRight size={24} />
                    </a>
                )}
            </div>
            
            {/* PARAMÈTRES DU GROUPE (Remplace l'ancienne idée rapide) */}
            <div className="mb-12 p-8 bg-slate-900 border-4 border-slate-900 rounded-[2.5rem] text-white shadow-[8px_8px_0px_0px_rgba(220,38,38,1)] transform -rotate-1">
              <h3 className="flex items-center gap-2 text-sm text-red-400 mb-6 font-black"><List size={18}/> PARAMÈTRES DU GROUPE</h3>
              <div className="space-y-4">
                <div className="relative">
                  <Edit3 className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                  <input 
                    className="w-full bg-slate-800 border-2 border-slate-700 rounded-2xl p-5 pl-14 text-xl text-white font-black italic outline-none focus:border-red-500 placeholder:text-slate-500" 
                    placeholder="NOM DU GROUPE" 
                    value={editGroupName} 
                    onChange={(e) => setEditGroupName(e.target.value)} 
                  />
                </div>
                
                <div className="relative">
                  <Banknote className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                  <input 
                    className="w-full bg-slate-800 border-2 border-slate-700 rounded-2xl p-5 pl-14 text-lg text-yellow-400 font-black italic outline-none focus:border-red-500 placeholder:text-slate-500" 
                    placeholder="MODIFIER LE BUDGET MAX (€)" 
                    value={editBudget} 
                    onChange={(e) => setEditBudget(e.target.value.replace(/[^0-9]/g, ''))} 
                  />
                </div>
              </div>
              <button onClick={updateGroupSettings} disabled={loading} className="mt-6 w-full py-4 bg-red-600 hover:bg-red-500 text-white text-xl border-4 border-slate-900 rounded-2xl transition-all shadow-[4px_4px_0px_0px_#000000] disabled:opacity-50 flex justify-center">
                  {loading ? <Loader2 className="animate-spin" size={24}/> : "SAUVEGARDER LES PARAMÈTRES"}
              </button>
            </div>

            <div className="space-y-6">
              <h3 className="text-3xl flex items-center gap-3"><Eye size={28}/> RÉSULTATS SECRETS</h3>
              {selectedGroup.participants?.map((p: any) => {
                const maCible = selectedGroup.participants.find((t: any) => t.id === p.target_id);
                const isRevealed = revealedTargets[p.id];

                return (
                  <div key={p.id} className={`p-6 md:p-8 rounded-3xl border-[4px] flex flex-col gap-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-900'}`}>
                    
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      
                      {/* NOUVEAU : LE BOUTON COPIER */}
                      <div className="flex items-center gap-4">
                        <span className="text-3xl">{p.name}</span>
                        <button 
                            onClick={() => copyMagicLink(p.id, p.name)} 
                            title="Copier le lien d'accès secret"
                            className={`p-2 rounded-xl border-2 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[1px] hover:shadow-none ${isDark ? 'bg-slate-800 border-slate-600 text-slate-300 hover:text-white' : 'bg-white border-slate-900 text-slate-700 hover:text-black hover:bg-slate-100'}`}
                        >
                            <Copy size={20} />
                        </button>
                      </div>

                      <button onClick={() => setRevealedTargets(prev => ({...prev, [p.id]: !prev[p.id]}))} className={`p-4 rounded-2xl border-[4px] transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-none ${isRevealed ? (isDark ? 'bg-slate-700 text-white border-slate-600' : 'bg-slate-900 text-white border-slate-900') : (isDark ? 'bg-slate-800 text-white border-slate-600' : 'bg-white text-slate-900 border-slate-900')}`}>
                        {isRevealed ? <EyeOff size={24} /> : <Eye size={24} />}
                      </button>
                    </div>
                    
                    {isRevealed && maCible && (
                      <div className={`p-6 rounded-2xl border-[4px] space-y-4 shadow-[4px_4px_0px_0px_rgba(220,38,38,1)] ${isDark ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-900'}`}>
                        <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>DOIT OFFRIR À : <span className="text-red-500 text-xl ml-2">{maCible.name}</span></p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className={`${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-900'} p-12 md:p-20 rounded-[4rem] border-[6px] shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] text-center animate-in zoom-in duration-500`}>
            <div className={`inline-block p-8 rounded-full border-[6px] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] mb-10 transform -rotate-6 ${isDark ? 'bg-green-900 border-slate-700' : 'bg-green-100 border-slate-900'}`}>
                <CheckCircle2 className="text-green-500" size={100} />
            </div>
            <h2 className="text-6xl md:text-8xl mb-10 leading-none">C'EST ENVOYÉ ! 🎅</h2>
            <p className={`text-xl mb-12 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Chaque participant va recevoir un e-mail avec son lien magique.</p>
            <button onClick={() => setStep('home')} className={`bg-red-600 text-white px-16 py-6 rounded-3xl hover:bg-red-500 transition-all border-[6px] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-2xl ${isDark ? 'border-slate-800' : 'border-slate-900'}`}>RETOUR À L'ACCUEIL</button>
          </div>
        )}
      </main>
    </div>
  );
}