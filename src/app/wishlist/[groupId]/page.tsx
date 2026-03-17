"use client";
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Gift, LogOut, Users, ArrowLeft, Eye, EyeOff, X, CheckCircle2, Loader2, List, ExternalLink, Link as LinkIcon } from 'lucide-react';
import { supabase } from '@/utils/supabase';

export default function SecretSanta() {
  const [step, setStep] = useState('home'); 
  const [user, setUser] = useState<any>(null);
  const [groupName, setGroupName] = useState('');
  const [eventDate, setEventDate] = useState(''); 
  const [loading, setLoading] = useState(false);
  const [mesGroupes, setMesGroupes] = useState<any[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [wishlistText, setWishlistText] = useState('');
  const [wishlistUrl, setWishlistUrl] = useState('');
  const [participants, setParticipants] = useState([
    { id: 1, name: '', email: '', exclude: '' },
    { id: 2, name: '', email: '', exclude: '' },
    { id: 3, name: '', email: '', exclude: '' }
  ]);
  const [revealedTargets, setRevealedTargets] = useState<{ [key: string]: boolean }>({});

  // GESTION DU LIEN DIRECT DANS LE MAIL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const gId = params.get('group');
    const pId = params.get('p');
    if (gId && pId) {
      const loadFromLink = async () => {
        const { data } = await supabase.from('groups').select('*, participants(*)').eq('id', gId).single();
        if (data) {
          setSelectedGroup(data);
          setRevealedTargets({ [pId]: true });
          const monP = data.participants.find((p: any) => p.id === pId);
          if (monP) {
            const d = parseWishlist(monP.wishlist);
            setWishlistText(d.text); setWishlistUrl(d.url);
          }
          setStep('view');
        }
      };
      loadFromLink();
    }
  }, []);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) fetchMesGroupes(user.id);
    };
    checkUser();
  }, []);

  const fetchMesGroupes = async (userId: string) => {
    const { data } = await supabase.from('groups').select('*, participants(*)').eq('organizer_id', userId).order('created_at', { ascending: false });
    if (data) setMesGroupes(data);
  };

  const handleLogin = async () => {
    const email = window.prompt("Ton email :");
    if (!email) return;
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin }});
    if (!error) alert("Lien envoyé !");
  };

  const updateWishlist = async () => {
    // On trouve le participant actif (celui dont la section est ouverte)
    const pId = Object.keys(revealedTargets).find(key => revealedTargets[key] === true);
    if (!pId) return;
    setLoading(true);
    const combinedData = JSON.stringify({ text: wishlistText, url: wishlistUrl });
    await supabase.from('participants').update({ wishlist: combinedData }).eq('id', pId);
    alert("Wishlist mise à jour ! 🎁");
    setLoading(false);
    if (user) fetchMesGroupes(user.id);
  };

  const parseWishlist = (raw: string) => {
    try { const p = JSON.parse(raw); return { text: p.text || '', url: p.url || '' }; }
    catch { return { text: raw || '', url: '' }; }
  };

  const lancerLeTirage = async () => {
    if (!user || !groupName) return;
    setLoading(true);
    let success = false; let resultats: any = {};
    while (!success) {
      let cibles = [...participants]; let temp: any = {}; let echec = false;
      for (let p of participants) {
        let valides = cibles.filter(c => c.email !== p.email && c.name !== p.exclude);
        if (valides.length === 0) { echec = true; break; }
        let choix = valides[Math.floor(Math.random() * valides.length)];
        temp[p.email] = choix.email;
        cibles = cibles.filter(c => c.email !== choix.email);
      }
      if (!echec) { resultats = temp; success = true; }
    }
    const { data: group } = await supabase.from('groups').insert([{ name: groupName, organizer_id: user.id, delete_at: eventDate }]).select().single();
    const { data: dbP } = await supabase.from('participants').insert(participants.map(p => ({ group_id: group.id, name: p.name, email: p.email }))).select();
    
    const emails = dbP!.map(p => {
      const cibleEmail = resultats[p.email];
      const cibleDb = dbP!.find(d => d.email === cibleEmail);
      supabase.from('participants').update({ target_id: cibleDb!.id }).eq('id', p.id).then();
      return { to: p.email, name: p.name, targetName: cibleDb!.name, groupName, groupId: group.id, participantId: p.id };
    });

    await fetch('/api/send', { method: 'POST', body: JSON.stringify({ emails }) });
    setStep('success');
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 italic font-black uppercase tracking-tighter">
      <nav className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2 text-red-600 text-2xl cursor-pointer" onClick={() => setStep('home')}><Gift size={28} /> SANTAPP</div>
        {user && <button onClick={() => { supabase.auth.signOut(); setUser(null); setStep('home'); }}><LogOut size={22} /></button>}
      </nav>

      <main className="max-w-4xl mx-auto py-12 px-6">
        {step === 'home' && (
          <div className="space-y-8">
            <div className="bg-white p-10 rounded-[2.5rem] border-4 border-slate-200 hover:border-red-500 transition-all cursor-pointer" onClick={() => user ? setStep('create') : handleLogin()}>
              <Plus size={32} className="text-red-600 mb-4" />
              <h3 className="text-2xl">Nouveau tirage</h3>
            </div>
            {mesGroupes.map(g => (
              <div key={g.id} onClick={() => { setSelectedGroup(g); setStep('view'); }} className="bg-white p-6 rounded-3xl border-2 flex justify-between items-center cursor-pointer hover:border-red-500 transition-all">
                <span>{g.name}</span>
                <Users size={20} className="text-slate-300" />
              </div>
            ))}
          </div>
        )}

        {step === 'create' && (
          <div className="bg-white p-10 rounded-[3rem] border-4 border-slate-100">
            <button onClick={() => setStep('home')} className="mb-6 flex items-center gap-2 text-slate-400 text-xs"><ArrowLeft size={14}/> RETOUR</button>
            <h2 className="text-4xl mb-10 text-red-600">Configuration</h2>
            <div className="space-y-6">
              <input placeholder="NOM DU GROUPE" className="w-full p-5 rounded-2xl bg-slate-50 border-2 font-black italic" value={groupName} onChange={e => setGroupName(e.target.value)} />
              {participants.map((p, i) => (
                <div key={p.id} className="flex flex-wrap gap-4 items-center bg-slate-50 p-4 rounded-2xl relative">
                  <input placeholder="PRÉNOM" className="flex-1 p-2 rounded-lg font-black italic outline-none border-none" value={p.name} onChange={e => setParticipants(participants.map(item => item.id === p.id ? {...item, name: e.target.value} : item))} />
                  <input placeholder="EMAIL" className="flex-1 p-2 rounded-lg font-black italic outline-none border-none" value={p.email} onChange={e => setParticipants(participants.map(item => item.id === p.id ? {...item, email: e.target.value} : item))} />
                  <select className="flex-1 p-2 rounded-lg text-red-500 font-black italic outline-none border-none" value={p.exclude} onChange={e => setParticipants(participants.map(item => item.id === p.id ? {...item, exclude: e.target.value} : item))}>
                    <option value="">EXCLURE...</option>
                    {participants.filter(o => o.id !== p.id && o.name).map(o => <option key={o.id} value={o.name}>{o.name}</option>)}
                  </select>
                  {/* BOUTON SUPPRIMER (RETOUR EN ARRIÈRE) */}
                  {participants.length > 3 && (
                    <button onClick={() => setParticipants(participants.filter(item => item.id !== p.id))} className="text-slate-300 hover:text-red-500 transition-colors">
                      <X size={20} />
                    </button>
                  )}
                </div>
              ))}
              <button onClick={() => setParticipants([...participants, { id: Date.now(), name: '', email: '', exclude: '' }])} className="text-red-600 text-xs font-black">+ AJOUTER UN PARTICIPANT</button>
              <button onClick={lancerLeTirage} disabled={loading || !groupName} className="w-full py-5 rounded-2xl text-xl bg-red-600 text-white shadow-xl hover:bg-red-700 font-black italic">
                {loading ? <Loader2 className="animate-spin mx-auto" /> : "GÉNÉRER LE TIRAGE"}
              </button>
            </div>
          </div>
        )}

        {step === 'view' && selectedGroup && (
          <div className="bg-white p-10 rounded-[3rem] border-4 border-slate-100">
            <button onClick={() => setStep('home')} className="mb-6 flex items-center gap-2 text-slate-400 text-xs"><ArrowLeft size={14}/> RETOUR</button>
            <h2 className="text-4xl mb-10">{selectedGroup.name}</h2>
            
            {/* SECTION MA WISHLIST (URL CONSERVÉE ICI) */}
            <div className="mb-10 p-8 bg-slate-900 rounded-[2rem] text-white">
              <h3 className="text-xs text-red-500 mb-4 font-black italic">MA WISHLIST PERSONNELLE</h3>
              <div className="space-y-4">
                <textarea className="w-full bg-slate-800 border-none rounded-xl p-4 text-white font-black italic outline-none" rows={2} placeholder="TES IDÉES..." value={wishlistText} onChange={e => setWishlistText(e.target.value)} />
                <div className="relative">
                  <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <input className="w-full bg-slate-800 border-none rounded-xl p-4 pl-12 text-blue-400 font-black italic outline-none" placeholder="LIEN DU CADEAU (URL)" value={wishlistUrl} onChange={e => setWishlistUrl(e.target.value)} />
                </div>
              </div>
              <button onClick={updateWishlist} className="mt-4 w-full py-3 bg-red-600 text-white rounded-xl text-xs font-black">ENREGISTRER MES INFOS</button>
            </div>

            <div className="space-y-4">
              {selectedGroup.participants?.map((p: any) => {
                const isSelected = revealedTargets[p.id];
                const maCible = selectedGroup.participants.find((t: any) => t.id === p.target_id);
                const cibleData = maCible ? parseWishlist(maCible.wishlist) : { text: '', url: '' };

                return (
                  <div key={p.id} className="p-6 rounded-3xl bg-slate-50 border-2 border-slate-100">
                    <div className="flex justify-between items-center">
                      <span className="text-xl">{p.name}</span>
                      <button onClick={() => {
                        setRevealedTargets({ [p.id]: !isSelected });
                        const data = parseWishlist(p.wishlist);
                        setWishlistText(data.text); setWishlistUrl(data.url);
                      }} className={`p-3 rounded-xl border-2 transition-all ${isSelected ? 'bg-red-600 text-white border-red-600' : 'bg-white text-slate-400 border-slate-200'}`}>
                        {isSelected ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>

                    {isSelected && maCible && (
                      <div className="mt-4 p-5 bg-white rounded-2xl border-l-8 border-red-500 animate-in slide-in-from-top-2">
                        <p className="text-[10px] text-slate-400 mb-1">DOIT OFFRIR À :</p>
                        <p className="text-xl text-red-600 mb-2">{maCible.name}</p>
                        {/* RÉCAP CIBLE : UNIQUEMENT LE TEXTE ET LE LIEN DE SA WISHLIST */}
                        {cibleData.text && <p className="text-sm italic font-black">"{cibleData.text}"</p>}
                        {cibleData.url && (
                          <a href={cibleData.url} target="_blank" className="flex items-center gap-1 text-blue-600 text-[10px] mt-2 font-black italic">
                            <ExternalLink size={12} /> VOIR SON LIEN CADEAU
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className="text-center p-20 bg-white rounded-[4rem] shadow-2xl">
            <CheckCircle2 className="mx-auto text-green-500 mb-6" size={80} />
            <h2 className="text-4xl mb-4">TERMINÉ !</h2>
            <p className="text-slate-400 mb-10 font-black italic">LES MAILS SONT PARTIS.</p>
            <button onClick={() => setStep('home')} className="bg-slate-900 text-white px-10 py-4 rounded-2xl font-black italic">RETOUR ACCUEIL</button>
          </div>
        )}
      </main>
    </div>
  );
}