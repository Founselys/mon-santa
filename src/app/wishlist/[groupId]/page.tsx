"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { Gift, ExternalLink, Link as LinkIcon, Loader2, CheckCircle2, User, Sparkles, Lock, Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/utils/supabase';

const formatUrl = (url: string) => {
  if (!url) return '';
  const trimmed = url.trim();
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return `https://${trimmed}`;
  }
  return trimmed;
};

const parseWishlist = (raw: any) => {
  const defaultData = { mine: [], others: [] };
  if (!raw) return defaultData;
  
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    let mine = Array.isArray(parsed?.mine) ? [...parsed.mine] : [];
    let others = Array.isArray(parsed?.others) ? [...parsed.others] : [];

    if (parsed?.mine && !Array.isArray(parsed.mine) && parsed.mine.text) {
      mine.push({ id: Date.now().toString(), text: parsed.mine.text, url: parsed.mine.url });
    }
    if (typeof parsed?.others === 'string' && parsed.others.trim() !== '') {
      others.push({ id: Date.now().toString() + 'o', text: parsed.others, authorName: 'Le groupe' });
    }
    return { mine, others };
  } catch {
    if (typeof raw === 'string' && raw.trim() !== '') {
        return { mine: [{ id: Date.now().toString(), text: raw, url: '' }], others: [] };
    }
    return defaultData;
  }
};

export default function WishlistPage({ params }: { params: { groupId: string } }) {
  const [me, setMe] = useState<any>(null);
  const [groupParticipants, setGroupParticipants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [groupName, setGroupName] = useState("");
  const [dbError, setDbError] = useState("");

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const [newMyText, setNewMyText] = useState("");
  const [newMyUrl, setNewMyUrl] = useState("");
  const [newOtherText, setNewOtherText] = useState("");
  const [newOtherUrl, setNewOtherUrl] = useState(""); // NOUVEAU : État pour l'URL des autres

  const loadData = useCallback(async () => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const myId = urlParams.get('p');

      if (!myId) {
        setDbError("Lien incomplet : Il manque ton ID secret (?p=...)");
        setLoading(false); return;
      }

      const { data: myData, error: meError } = await supabase.from('participants').select('*, groups(name)').eq('id', myId).single();

      if (meError) { setDbError(meError.message); setLoading(false); return; }

      if (myData) {
        setMe(myData);
        setGroupName(myData.groups?.name || "Mon Groupe");
        setSelectedUserId(myData.target_id);

        const { data: groupData } = await supabase.from('participants').select('*').eq('group_id', myData.group_id).order('name', { ascending: true });
        if (groupData) setGroupParticipants(groupData);
      }
    } catch (err: any) {
      setDbError(err.message || "Erreur de connexion.");
    }
    setLoading(false);
  }, [params.groupId]);

  useEffect(() => {
    loadData();

    const channel = supabase.channel(`group-${params.groupId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'participants', filter: `group_id=eq.${params.groupId}` }, 
      (payload) => {
        setGroupParticipants(prev => prev.map(p => p.id === payload.new.id ? { ...p, ...payload.new } : p));
      }).subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [params.groupId, loadData]);

  const saveToDb = async (userId: string, dataObj: any) => {
    setSavingId(userId);
    const jsonStr = JSON.stringify(dataObj);
    
    const { error } = await supabase.from('participants').update({ wishlist: jsonStr }).eq('id', userId);
    
    if (error) {
      alert("⚠️ Supabase a bloqué la sauvegarde ! \nErreur : " + error.message + "\n\n👉 Va sur Supabase > Table Editor > 'participants' > Et désactive le 'RLS' (Row Level Security) en haut à droite !");
    } else {
      setGroupParticipants(prev => prev.map(p => p.id === userId ? { ...p, wishlist: jsonStr } : p));
      if (userId === me.id) setMe({ ...me, wishlist: jsonStr });
    }
    
    setSavingId(null);
  };

  const addMyIdea = () => {
    if (!newMyText.trim()) return;
    const currentData = parseWishlist(me.wishlist);
    currentData.mine.push({ id: Date.now().toString(), text: newMyText, url: formatUrl(newMyUrl) });
    saveToDb(me.id, currentData);
    setNewMyText(""); setNewMyUrl("");
  };

  const deleteMyIdea = (ideaId: string) => {
    const currentData = parseWishlist(me.wishlist);
    currentData.mine = currentData.mine.filter((idea: any) => idea.id !== ideaId);
    saveToDb(me.id, currentData);
  };

  const addOtherIdea = (targetId: string, currentWishlist: any) => {
    if (!newOtherText.trim()) return;
    const currentData = parseWishlist(currentWishlist);
    // NOUVEAU : On inclut l'URL formatée ici
    currentData.others.push({ id: Date.now().toString(), text: newOtherText, authorName: me.name, url: formatUrl(newOtherUrl) });
    saveToDb(targetId, currentData);
    setNewOtherText(""); setNewOtherUrl(""); // On réinitialise l'URL aussi
  };

  const deleteOtherIdea = (targetId: string, ideaId: string, currentWishlist: any) => {
    const currentData = parseWishlist(currentWishlist);
    currentData.others = currentData.others.filter((idea: any) => idea.id !== ideaId);
    saveToDb(targetId, currentData);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50 italic font-black uppercase"><Loader2 className="animate-spin text-red-600 mr-2" /> Chargement...</div>;
  if (dbError) return <div className="p-20 text-center font-black uppercase italic text-red-600 border-4 border-red-600 m-10">ERREUR : {dbError}</div>;
  if (!me) return <div className="p-20 text-center font-black uppercase italic text-red-600 border-4 border-red-600 m-10">Accès Refusé</div>;

  const selectedUser = groupParticipants.find(p => p.id === selectedUserId) || me;
  const isLookingAtMyself = selectedUser.id === me.id;
  const selectedData = parseWishlist(selectedUser.wishlist);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-black italic uppercase tracking-tighter text-slate-900">
      <div className="max-w-6xl mx-auto space-y-8">
        
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-b-4 border-slate-900 pb-6">
          <div>
            <div className="bg-red-600 text-white px-4 py-1 rounded-full text-sm inline-block mb-2 shadow-sm">{groupName} 🎄</div>
            <h1 className="text-3xl md:text-5xl leading-none">ESPACE DE <span className="text-red-600 underline decoration-4 underline-offset-4">{me.name}</span></h1>
          </div>
          <p className="text-xs opacity-50 max-w-xs text-right hidden md:block">CLIQUE SUR UN PARTICIPANT POUR VOIR SA LISTE OU LUI SOUFFLER DES IDÉES.</p>
        </div>

        <div className="flex flex-col md:flex-row gap-8">
          
          <div className="w-full md:w-1/3 flex flex-col gap-4">
            <h2 className="text-xl flex items-center gap-2"><User size={20}/> PARTICIPANTS</h2>
            <div className="flex flex-col gap-3">
              {groupParticipants.map((p) => {
                const isSelected = p.id === selectedUserId;
                const isMyTarget = p.id === me.target_id;
                const isMe = p.id === me.id;

                return (
                  <div key={p.id} onClick={() => setSelectedUserId(p.id)}
                    className={`cursor-pointer p-5 rounded-3xl border-4 transition-all flex justify-between items-center
                      ${isSelected ? 'border-slate-900 bg-slate-900 text-white shadow-[8px_8px_0px_0px_rgba(220,38,38,1)] translate-x-2' : 'border-slate-900 bg-white hover:bg-slate-100 hover:translate-x-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'}
                    `}
                  >
                    <div>
                      <span className="text-2xl">{p.name}</span>
                      {isMe && <span className={`ml-2 text-[10px] px-2 py-0.5 rounded-full border-2 ${isSelected ? 'border-white text-white' : 'border-slate-900 text-slate-900'}`}>MOI</span>}
                    </div>
                    {isMyTarget && <Gift className={isSelected ? "text-white" : "text-red-600"} size={28} />}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="w-full md:w-2/3">
            <div className="bg-white border-4 border-slate-900 rounded-[3rem] p-6 md:p-10 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden">
              
              {selectedUser.id === me.target_id && (
                <div className="absolute top-0 right-0 bg-red-600 text-white px-8 py-2 -rotate-2 origin-top-right text-xs shadow-md">
                  C'EST TA PIOCHE !
                </div>
              )}

              <h2 className="text-5xl md:text-7xl mb-8 break-words">{selectedUser.name}</h2>

              <div className="space-y-8">
                
                {/* ZONE 1 : BULLES VERTES */}
                <div className="bg-green-50 border-4 border-green-500 rounded-3xl p-6 relative">
                  <p className="text-xs text-green-700 mb-6 flex items-center gap-2">
                    <CheckCircle2 size={16} /> 
                    {isLookingAtMyself ? "MA WISHLIST PERSONNELLE :" : `LES ENVIES DE ${selectedUser.name} :`}
                  </p>
                  
                  <div className="space-y-3 mb-6">
                    {selectedData.mine.length === 0 && <p className="opacity-40 text-lg text-green-800">Aucune idée pour l'instant...</p>}
                    {selectedData.mine.map((idea: any) => (
                      <div key={idea.id} className="bg-green-400 text-green-950 border-2 border-green-600 p-4 rounded-2xl shadow-[4px_4px_0px_0px_#166534] flex justify-between items-start gap-4">
                        <div>
                          <p className="text-xl leading-tight">{idea.text}</p>
                          {idea.url && (
                            <a href={idea.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-green-800 bg-green-300 px-3 py-1 rounded-lg mt-2 text-[10px] hover:bg-green-200 transition-colors">
                              <ExternalLink size={12} /> VOIR LE LIEN
                            </a>
                          )}
                        </div>
                        {isLookingAtMyself && (
                          <button onClick={() => deleteMyIdea(idea.id)} className="text-green-700 hover:text-red-600 transition-colors p-1"><Trash2 size={18} /></button>
                        )}
                      </div>
                    ))}
                  </div>

                  {isLookingAtMyself && (
                    <div className="bg-white p-4 rounded-2xl border-2 border-green-200">
                      <input 
                        className="w-full bg-transparent border-none p-0 mb-2 focus:ring-0 text-lg text-green-900 font-black italic placeholder:text-green-300"
                        placeholder="Qu'est-ce qui te ferait plaisir ?" 
                        value={newMyText} onChange={(e) => setNewMyText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addMyIdea()}
                      />
                      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2 border-t-2 border-green-100 pt-2">
                        <LinkIcon size={16} className="text-green-500 hidden md:block" />
                        <input 
                          className="flex-1 bg-transparent border-none p-0 focus:ring-0 text-xs text-green-800 font-black italic placeholder:text-green-300"
                          placeholder="Lien URL (Optionnel)"
                          value={newMyUrl} onChange={(e) => setNewMyUrl(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && addMyIdea()}
                        />
                        <button onClick={addMyIdea} disabled={savingId === me.id} className="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 flex items-center justify-center gap-2 text-xs">
                           {savingId === me.id ? <Loader2 className="animate-spin" size={14} /> : <><Plus size={14}/> AJOUTER</>}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* ZONE 2 : BULLES NOIRES */}
                <div className="bg-slate-900 text-white border-4 border-slate-900 rounded-3xl p-6 relative transform rotate-1">
                  
                  {isLookingAtMyself ? (
                    <div className="text-center py-8 opacity-80 space-y-4">
                      <Lock className="mx-auto text-red-500 mb-2" size={40} />
                      <p className="text-xl text-slate-300">ESPACE SECRET</p>
                      <p className="text-xs text-slate-500">LES IDÉES QUE LE GROUPE TE PRÉPARE SONT CACHÉES ICI.<br/>ON GARDE LA SURPRISE ! 🤫</p>
                    </div>
                  ) : (
                    <div>
                      <div className="flex justify-between items-center mb-6">
                        <p className="text-xs text-red-500 flex items-center gap-2">
                          <Sparkles size={14} /> IDÉES SOUFFLÉES PAR LE GROUPE (IL/ELLE NE LE VOIT PAS)
                        </p>
                      </div>

                      <div className="space-y-3 mb-6">
                         {selectedData.others.length === 0 && <p className="opacity-40 text-lg">Aucune idée suggérée...</p>}
                         {selectedData.others.map((idea: any) => (
                          <div key={idea.id} className="bg-slate-800 border-2 border-slate-700 p-4 rounded-2xl shadow-[4px_4px_0px_0px_#000000] flex justify-between items-start gap-4 group">
                            <div>
                              <p className="text-xl leading-tight text-slate-100">{idea.text}</p>
                              
                              {/* NOUVEAU : Affichage du lien sur les bulles noires */}
                              {idea.url && (
                                <a href={idea.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-slate-300 bg-slate-700 px-3 py-1 rounded-lg mt-2 text-[10px] hover:bg-slate-600 transition-colors border border-slate-600">
                                  <ExternalLink size={12} /> VOIR LE LIEN
                                </a>
                              )}
                              
                              <p className="text-[10px] text-slate-400 mt-2">SOUFFLÉ PAR : {idea.authorName}</p>
                            </div>
                            <button onClick={() => deleteOtherIdea(selectedUser.id, idea.id, selectedUser.wishlist)} className="text-slate-600 hover:text-red-500 transition-colors p-1 opacity-0 group-hover:opacity-100"><Trash2 size={18} /></button>
                          </div>
                        ))}
                      </div>

                      {/* NOUVEAU : Input double avec Lien optionnel pour les bulles noires */}
                      <div className="bg-slate-800 p-4 rounded-2xl border-2 border-slate-700">
                        <input 
                          className="w-full bg-transparent border-none p-0 mb-2 focus:ring-0 text-sm text-white font-black italic placeholder:text-slate-500"
                          placeholder={`Ajouter une idée pour ${selectedUser.name}...`} 
                          value={newOtherText} onChange={(e) => setNewOtherText(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && addOtherIdea(selectedUser.id, selectedUser.wishlist)}
                        />
                        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2 border-t-2 border-slate-700 pt-2">
                          <LinkIcon size={16} className="text-slate-500 hidden md:block" />
                          <input 
                            className="flex-1 bg-transparent border-none p-0 focus:ring-0 text-xs text-white font-black italic placeholder:text-slate-500"
                            placeholder="Lien URL (Optionnel)"
                            value={newOtherUrl} onChange={(e) => setNewOtherUrl(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && addOtherIdea(selectedUser.id, selectedUser.wishlist)}
                          />
                          <button onClick={() => addOtherIdea(selectedUser.id, selectedUser.wishlist)} disabled={savingId === selectedUser.id} className="px-3 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 flex items-center justify-center gap-2 text-xs">
                            {savingId === selectedUser.id ? <Loader2 className="animate-spin" size={14} /> : "ENVOYER"}
                          </button>
                        </div>
                      </div>
                      
                    </div>
                  )}
                </div>

              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}