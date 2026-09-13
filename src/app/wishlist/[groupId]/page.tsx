"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { Gift, ExternalLink, Link as LinkIcon, Loader2, CheckCircle2, User, Sparkles, Lock, Plus, Trash2, Moon, Sun, BellRing, MessageSquare, Send } from 'lucide-react';
import { supabase } from '@/utils/supabase';

const formatUrl = (url: string) => {
  if (!url) return '';
  const trimmed = url.trim();
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) return `https://${trimmed}`;
  return trimmed;
};

const parseWishlist = (raw: any) => {
  const defaultData = { mine: [], others: [], chat: [] };
  if (!raw) return defaultData;
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    let mine = Array.isArray(parsed?.mine) ? [...parsed.mine] : [];
    let others = Array.isArray(parsed?.others) ? parsed.others.map((o: any) => ({ ...o, reactions: o.reactions || {} })) : [];
    let chat = Array.isArray(parsed?.chat) ? [...parsed.chat] : []; 
    
    if (parsed?.mine && !Array.isArray(parsed.mine) && parsed.mine.text) mine.push({ id: Date.now().toString(), text: parsed.mine.text, url: parsed.mine.url });
    if (typeof parsed?.others === 'string' && parsed.others.trim() !== '') others.push({ id: Date.now().toString() + 'o', text: parsed.others, authorName: 'Le groupe', reactions: {} });
    
    return { mine, others, chat };
  } catch {
    if (typeof raw === 'string' && raw.trim() !== '') return { mine: [{ id: Date.now().toString(), text: raw, url: '' }], others: [], chat: [] };
    return defaultData;
  }
};

export default function WishlistPage({ params }: { params: { groupId: string } }) {
  const [me, setMe] = useState<any>(null);
  const [groupParticipants, setGroupParticipants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [groupName, setGroupName] = useState("");
  const [groupBudget, setGroupBudget] = useState("");
  const [dbError, setDbError] = useState("");

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const [newMyText, setNewMyText] = useState("");
  const [newMyUrl, setNewMyUrl] = useState("");
  const [newOtherText, setNewOtherText] = useState("");
  const [newOtherUrl, setNewOtherUrl] = useState("");
  
  const [newChatMessage, setNewChatMessage] = useState("");

  const [isDark, setIsDark] = useState(false);
  const [isNudging, setIsNudging] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const myId = urlParams.get('p');

      if (!myId) { setDbError("Lien incomplet : Il manque ton ID secret (?p=...)"); setLoading(false); return; }

      const { data: myData, error: meError } = await supabase.from('participants').select('*, groups(name, budget)').eq('id', myId).single();

      if (meError) { setDbError(meError.message); setLoading(false); return; }

      if (myData) {
        setMe(myData);
        setGroupName(myData.groups?.name || "Mon Groupe");
        setGroupBudget(myData.groups?.budget || ""); 
        setSelectedUserId(myData.target_id);

        const { data: groupData } = await supabase.from('participants').select('*').eq('group_id', myData.group_id).order('name', { ascending: true });
        if (groupData) setGroupParticipants(groupData);
      }
    } catch (err: any) { setDbError(err.message || "Erreur de connexion."); }
    setLoading(false);
  }, [params.groupId]);

  useEffect(() => {
    if (localStorage.getItem('theme') === 'dark') setIsDark(true);
    loadData();

    const channel = supabase.channel(`group-${params.groupId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'participants', filter: `group_id=eq.${params.groupId}` }, 
      (payload) => { setGroupParticipants(prev => prev.map(p => p.id === payload.new.id ? { ...p, ...payload.new } : p)); }).subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [params.groupId, loadData]);

  const toggleTheme = () => {
    const newMode = !isDark;
    setIsDark(newMode);
    localStorage.setItem('theme', newMode ? 'dark' : 'light');
  };

  const saveToDb = async (userId: string, dataObj: any) => {
    setSavingId(userId);
    const jsonStr = JSON.stringify(dataObj);
    const { error } = await supabase.from('participants').update({ wishlist: jsonStr }).eq('id', userId);
    
    if (error) alert("⚠️ Supabase a bloqué la sauvegarde ! \nErreur : " + error.message);
    else {
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
    currentData.others.push({ id: Date.now().toString(), text: newOtherText, authorName: me.name, url: formatUrl(newOtherUrl), reactions: {} });
    saveToDb(targetId, currentData);
    setNewOtherText(""); setNewOtherUrl("");
  };

  const deleteOtherIdea = (targetId: string, ideaId: string, currentWishlist: any) => {
    const currentData = parseWishlist(currentWishlist);
    currentData.others = currentData.others.filter((idea: any) => idea.id !== ideaId);
    saveToDb(targetId, currentData);
  };

  // MODIFICATION : On enregistre l'ID de l'utilisateur pour empêcher le spam
  const toggleReaction = (targetId: string, ideaId: string, currentWishlist: any, emoji: string) => {
    const currentData = parseWishlist(currentWishlist);
    const ideaIndex = currentData.others.findIndex((idea: any) => idea.id === ideaId);
    
    if (ideaIndex !== -1) {
        if (!currentData.others[ideaIndex].reactions) currentData.others[ideaIndex].reactions = {};
        
        const currentReactions = currentData.others[ideaIndex].reactions;
        
        // Si l'utilisateur avait déjà cliqué sur CE bouton, on l'enlève (Toggle Off)
        if (currentReactions[me.id] === emoji) {
            delete currentReactions[me.id];
        } else {
            // Sinon, on remplace son ancienne réaction par la nouvelle (Un seul vote par personne)
            currentReactions[me.id] = emoji;
        }
        
        saveToDb(targetId, currentData);
    }
  };

  const sendChatMessage = (targetId: string, currentWishlist: any, isSanta: boolean) => {
    if (!newChatMessage.trim()) return;
    const currentData = parseWishlist(currentWishlist);
    currentData.chat.push({
      id: Date.now().toString(),
      text: newChatMessage,
      sender: isSanta ? 'santa' : 'target',
      date: new Date().toISOString()
    });
    saveToDb(targetId, currentData);
    setNewChatMessage("");
  };

  const sendNudgeEmail = async (targetUser: any) => {
    setIsNudging(true);
    try {
        await fetch('/api/nudge', {
            method: 'POST',
            body: JSON.stringify({ to: targetUser.email, targetName: targetUser.name, groupName: groupName })
        });
        alert(`Un petit mot secret a été envoyé à ${targetUser.name} pour l'encourager à remplir sa liste !`);
    } catch (e) {
        alert("Oups, impossible d'envoyer le message pour l'instant.");
    }
    setIsNudging(false);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50 italic font-black uppercase"><Loader2 className="animate-spin text-red-600 mr-2" /> Chargement...</div>;
  if (dbError) return <div className="p-20 text-center font-black uppercase italic text-red-600 border-4 border-red-600 m-10">ERREUR : {dbError}</div>;
  if (!me) return <div className="p-20 text-center font-black uppercase italic text-red-600 border-4 border-red-600 m-10">Accès Refusé</div>;

  const selectedUser = groupParticipants.find(p => p.id === selectedUserId) || me;
  const isLookingAtMyself = selectedUser.id === me.id;
  const isMyTarget = selectedUser.id === me.target_id;
  const selectedData = parseWishlist(selectedUser.wishlist);

  return (
    <div className={`min-h-screen p-4 md:p-8 font-black italic uppercase tracking-tighter transition-colors duration-300 ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      
      <div className="absolute top-4 right-4 md:top-8 md:right-8 z-50">
        <button onClick={toggleTheme} className={`p-3 rounded-xl border-4 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${isDark ? 'bg-slate-800 text-white border-slate-700 hover:bg-slate-700' : 'bg-white text-slate-900 border-slate-900 hover:bg-slate-100'}`}>
            {isDark ? <Sun size={24} /> : <Moon size={24} />}
        </button>
      </div>

      <div className="max-w-6xl mx-auto space-y-8 mt-12 md:mt-0">
        
        <div className={`flex flex-col md:flex-row justify-between items-center gap-4 border-b-4 pb-6 ${isDark ? 'border-slate-700' : 'border-slate-900'}`}>
          <div>
            <div className="bg-red-600 text-white px-4 py-1 rounded-full text-sm inline-block mb-2 shadow-sm">{groupName} 🎄</div>
            {groupBudget && <div className="ml-3 bg-yellow-400 text-yellow-900 px-4 py-1 rounded-full text-sm inline-block mb-2 shadow-sm">BUDGET : {groupBudget}</div>}
            <h1 className="text-3xl md:text-5xl leading-none">ESPACE DE <span className="text-red-500 underline decoration-4 underline-offset-4">{me.name}</span></h1>
          </div>
          <p className={`text-xs max-w-xs text-right hidden md:block ${isDark ? 'text-slate-400' : 'opacity-50'}`}>CLIQUE SUR UN PARTICIPANT POUR VOIR SA LISTE OU LUI SOUFFLER DES IDÉES.</p>
        </div>

        <div className="flex flex-col md:flex-row gap-8">
          
          <div className="w-full md:w-1/3 flex flex-col gap-4">
            <h2 className="text-xl flex items-center gap-2"><User size={20}/> PARTICIPANTS</h2>
            <div className="flex flex-col gap-3">
              {groupParticipants.map((p) => {
                const isSelected = p.id === selectedUserId;
                const targetMatch = p.id === me.target_id;
                const isMe = p.id === me.id;

                return (
                  <div key={p.id} onClick={() => setSelectedUserId(p.id)}
                    className={`cursor-pointer p-5 rounded-3xl border-4 transition-all flex justify-between items-center
                      ${isSelected ? (isDark ? 'border-slate-600 bg-slate-700 text-white shadow-[8px_8px_0px_0px_rgba(220,38,38,1)] translate-x-2' : 'border-slate-900 bg-slate-900 text-white shadow-[8px_8px_0px_0px_rgba(220,38,38,1)] translate-x-2') 
                      : (isDark ? 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:translate-x-1 shadow-[4px_4px_0px_0px_#0f172a]' : 'border-slate-900 bg-white hover:bg-slate-100 hover:translate-x-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]')}
                    `}
                  >
                    <div>
                      <span className="text-2xl">{p.name}</span>
                      {isMe && <span className={`ml-2 text-[10px] px-2 py-0.5 rounded-full border-2 ${isSelected ? 'border-white text-white' : (isDark ? 'border-slate-400 text-slate-400' : 'border-slate-900 text-slate-900')}`}>MOI</span>}
                    </div>
                    {targetMatch && <Gift className={isSelected ? "text-white" : "text-red-500"} size={28} />}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="w-full md:w-2/3">
            <div className={`border-4 rounded-[3rem] p-6 md:p-10 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden ${isDark ? 'bg-slate-900 border-slate-700 shadow-[12px_12px_0px_0px_#0f172a]' : 'bg-white border-slate-900 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]'}`}>
              
              {isMyTarget && (
                <div className="absolute top-0 right-0 bg-red-600 text-white px-8 py-2 -rotate-2 origin-top-right text-xs shadow-md">
                  C'EST TA PIOCHE !
                </div>
              )}

              <h2 className="text-5xl md:text-7xl mb-8 break-words">{selectedUser.name}</h2>

              <div className="space-y-8">
                
                {/* ZONE 1 : BULLES VERTES */}
                <div className={`border-4 rounded-3xl p-6 relative ${isDark ? 'bg-green-950/30 border-green-800' : 'bg-green-50 border-green-500'}`}>
                  <p className={`text-xs mb-6 flex items-center gap-2 ${isDark ? 'text-green-400' : 'text-green-700'}`}>
                    <CheckCircle2 size={16} /> 
                    {isLookingAtMyself ? "MA WISHLIST PERSONNELLE :" : `LES ENVIES DE ${selectedUser.name} :`}
                  </p>
                  
                  <div className="space-y-3 mb-6">
                    {selectedData.mine.length === 0 && (
                        <div>
                            <p className={`opacity-40 text-lg ${isDark ? 'text-green-500' : 'text-green-800'}`}>Aucune idée pour l'instant...</p>
                            
                            {!isLookingAtMyself && isMyTarget && (
                                <button onClick={() => sendNudgeEmail(selectedUser)} disabled={isNudging} className="mt-4 bg-orange-500 text-white px-4 py-3 rounded-xl hover:bg-orange-600 transition-colors flex items-center gap-2 border-2 border-orange-700 shadow-[4px_4px_0px_0px_#9a3412]">
                                    {isNudging ? <Loader2 className="animate-spin" size={20} /> : <><BellRing size={20} /> J'AI BESOIN D'AIDE</>}
                                </button>
                            )}
                        </div>
                    )}
                    
                    {selectedData.mine.map((idea: any) => (
                      <div key={idea.id} className={`border-2 p-4 rounded-2xl flex justify-between items-start gap-4 ${isDark ? 'bg-green-900 border-green-700 text-green-100 shadow-[4px_4px_0px_0px_#14532d]' : 'bg-green-400 text-green-950 border-green-600 shadow-[4px_4px_0px_0px_#166534]'}`}>
                        <div>
                          <p className="text-xl leading-tight">{idea.text}</p>
                          {idea.url && (
                            <a href={idea.url} target="_blank" rel="noopener noreferrer" className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg mt-2 text-[10px] transition-colors ${isDark ? 'text-green-100 bg-green-700 hover:bg-green-600' : 'text-green-800 bg-green-300 hover:bg-green-200'}`}>
                              <ExternalLink size={12} /> VOIR LE LIEN
                            </a>
                          )}
                        </div>
                        {isLookingAtMyself && (
                          <button onClick={() => deleteMyIdea(idea.id)} className={`transition-colors p-1 ${isDark ? 'text-green-400 hover:text-red-400' : 'text-green-700 hover:text-red-600'}`}><Trash2 size={18} /></button>
                        )}
                      </div>
                    ))}
                  </div>

                  {isLookingAtMyself && (
                    <div className={`p-4 rounded-2xl border-2 ${isDark ? 'bg-slate-800 border-green-800' : 'bg-white border-green-200'}`}>
                      <input 
                        className={`w-full bg-transparent border-none p-0 mb-2 focus:ring-0 text-lg font-black italic ${isDark ? 'text-green-100 placeholder:text-green-700' : 'text-green-900 placeholder:text-green-300'}`}
                        placeholder="Qu'est-ce qui te ferait plaisir ?" 
                        value={newMyText} onChange={(e) => setNewMyText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addMyIdea()}
                      />
                      <div className={`flex flex-col md:flex-row items-stretch md:items-center gap-2 border-t-2 pt-2 ${isDark ? 'border-green-900' : 'border-green-100'}`}>
                        <LinkIcon size={16} className={`hidden md:block ${isDark ? 'text-green-600' : 'text-green-500'}`} />
                        <input 
                          className={`flex-1 bg-transparent border-none p-0 focus:ring-0 text-xs font-black italic ${isDark ? 'text-green-300 placeholder:text-green-700' : 'text-green-800 placeholder:text-green-300'}`}
                          placeholder="Lien URL (Optionnel)"
                          value={newMyUrl} onChange={(e) => setNewMyUrl(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && addMyIdea()}
                        />
                        <button onClick={addMyIdea} disabled={savingId === me.id} className="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-500 flex items-center justify-center gap-2 text-xs">
                           {savingId === me.id ? <Loader2 className="animate-spin" size={14} /> : <><Plus size={14}/> AJOUTER</>}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* ZONE 2 : BULLES NOIRES */}
                <div className={`border-4 rounded-3xl p-6 relative transform rotate-1 ${isDark ? 'bg-slate-800 border-slate-600 text-slate-100' : 'bg-slate-900 text-white border-slate-900'}`}>
                  {isLookingAtMyself ? (
                    <div className="text-center py-8 opacity-80 space-y-4">
                      <Lock className="mx-auto text-red-500 mb-2" size={40} />
                      <p className={`text-xl ${isDark ? 'text-slate-300' : 'text-slate-300'}`}>ESPACE SECRET</p>
                      <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>LES IDÉES QUE LE GROUPE TE PRÉPARE SONT CACHÉES ICI.<br/>ON GARDE LA SURPRISE ! 🤫</p>
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
                          <div key={idea.id} className={`border-2 p-4 rounded-2xl flex flex-col gap-2 group ${isDark ? 'bg-slate-700 border-slate-600 shadow-[4px_4px_0px_0px_#000000]' : 'bg-slate-800 border-slate-700 shadow-[4px_4px_0px_0px_#000000]'}`}>
                            
                            <div className="flex justify-between items-start gap-4">
                                <div>
                                <p className="text-xl leading-tight text-slate-100">{idea.text}</p>
                                {idea.url && (
                                    <a href={idea.url} target="_blank" rel="noopener noreferrer" className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg mt-2 text-[10px] transition-colors border ${isDark ? 'text-slate-200 bg-slate-600 hover:bg-slate-500 border-slate-500' : 'text-slate-300 bg-slate-700 hover:bg-slate-600 border-slate-600'}`}>
                                    <ExternalLink size={12} /> VOIR LE LIEN
                                    </a>
                                )}
                                <p className="text-[10px] text-slate-400 mt-2">SOUFFLÉ PAR : {idea.authorName}</p>
                                </div>
                                <button onClick={() => deleteOtherIdea(selectedUser.id, idea.id, selectedUser.wishlist)} className={`transition-colors p-1 opacity-0 group-hover:opacity-100 ${isDark ? 'text-slate-400 hover:text-red-400' : 'text-slate-600 hover:text-red-500'}`}><Trash2 size={18} /></button>
                            </div>

                            {/* BARRE DE RÉACTIONS MISE À JOUR (Système de vote unique) */}
                            <div className={`flex flex-wrap gap-2 mt-2 pt-3 border-t ${isDark ? 'border-slate-600' : 'border-slate-700'}`}>
                                {['👍', '👎', '😂', '💸'].map(emoji => {
                                    // On recalcule le compte et on vérifie si l'utilisateur actuel a cliqué
                                    let count = 0;
                                    let hasReacted = false;
                                    
                                    if (idea.reactions) {
                                        Object.entries(idea.reactions).forEach(([userId, selectedEmoji]) => {
                                            if (selectedEmoji === emoji) count++;
                                            if (userId === me.id && selectedEmoji === emoji) hasReacted = true;
                                            // Rétrocompatibilité (au cas où il reste d'anciennes réactions sous forme de chiffres)
                                            if (userId === emoji && typeof selectedEmoji === 'number') count += selectedEmoji;
                                        });
                                    }

                                    return (
                                        <button
                                            key={emoji}
                                            onClick={() => toggleReaction(selectedUser.id, idea.id, selectedUser.wishlist, emoji)}
                                            className={`text-xs px-2 py-1 rounded-lg border transition-all flex items-center gap-1.5 
                                                ${hasReacted 
                                                    ? (isDark ? 'bg-blue-600 border-blue-500 text-white' : 'bg-blue-500 border-blue-600 text-white') 
                                                    : (count > 0 
                                                        ? (isDark ? 'bg-slate-600 border-slate-500 text-white' : 'bg-slate-700 border-slate-500 text-white') 
                                                        : (isDark ? 'bg-transparent border-slate-600 text-slate-400 hover:text-white hover:border-slate-500' : 'bg-transparent border-slate-700 text-slate-400 hover:text-white hover:border-slate-600')
                                                    )
                                                }`}
                                        >
                                            <span className="text-sm">{emoji}</span> 
                                            {count > 0 && <span>{count}</span>}
                                        </button>
                                    )
                                })}
                            </div>

                          </div>
                        ))}
                      </div>

                      <div className={`p-4 rounded-2xl border-2 ${isDark ? 'bg-slate-700 border-slate-600' : 'bg-slate-800 border-slate-700'}`}>
                        <input 
                          className="w-full bg-transparent border-none p-0 mb-2 focus:ring-0 text-sm text-white font-black italic placeholder:text-slate-500"
                          placeholder={`Ajouter une idée pour ${selectedUser.name}...`} 
                          value={newOtherText} onChange={(e) => setNewOtherText(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && addOtherIdea(selectedUser.id, selectedUser.wishlist)}
                        />
                        <div className={`flex flex-col md:flex-row items-stretch md:items-center gap-2 border-t-2 pt-2 ${isDark ? 'border-slate-600' : 'border-slate-700'}`}>
                          <LinkIcon size={16} className="text-slate-500 hidden md:block" />
                          <input 
                            className="flex-1 bg-transparent border-none p-0 focus:ring-0 text-xs text-white font-black italic placeholder:text-slate-500"
                            placeholder="Lien URL (Optionnel)"
                            value={newOtherUrl} onChange={(e) => setNewOtherUrl(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && addOtherIdea(selectedUser.id, selectedUser.wishlist)}
                          />
                          <button onClick={() => addOtherIdea(selectedUser.id, selectedUser.wishlist)} disabled={savingId === selectedUser.id} className="px-3 py-2 bg-red-600 text-white rounded-xl hover:bg-red-500 flex items-center justify-center gap-2 text-xs">
                            {savingId === selectedUser.id ? <Loader2 className="animate-spin" size={14} /> : "ENVOYER"}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* ZONE 3 : CHAT ANONYME */}
                {(isLookingAtMyself || isMyTarget) && (
                    <div className={`border-4 rounded-3xl p-6 relative transform -rotate-1 ${isDark ? 'bg-blue-950/40 border-blue-800 text-blue-100' : 'bg-blue-50 border-blue-600 text-blue-900'}`}>
                        <div className="flex justify-between items-center mb-6">
                            <p className={`text-sm flex items-center gap-2 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                                <MessageSquare size={20} /> 
                                {isLookingAtMyself ? "MESSAGES DE TON PÈRE NOËL SECRET" : "CHAT ANONYME AVEC TA PIOCHE"}
                            </p>
                        </div>

                        <div className="space-y-4 mb-6">
                            {selectedData.chat.length === 0 && (
                                <p className="opacity-50 text-center py-4">Aucun message pour le moment...</p>
                            )}
                            {selectedData.chat.map((msg: any) => {
                                const isMessageFromMe = (isLookingAtMyself && msg.sender === 'target') || (isMyTarget && msg.sender === 'santa');
                                
                                return (
                                    <div key={msg.id} className={`flex ${isMessageFromMe ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[80%] p-4 rounded-2xl border-2 ${
                                            isMessageFromMe 
                                            ? (isDark ? 'bg-blue-600 border-blue-500 text-white shadow-[4px_4px_0px_0px_#1e3a8a]' : 'bg-blue-500 border-blue-700 text-white shadow-[4px_4px_0px_0px_#1e3a8a]') 
                                            : (isDark ? 'bg-slate-800 border-slate-600 text-slate-200 shadow-[4px_4px_0px_0px_#0f172a]' : 'bg-white border-blue-300 text-blue-900 shadow-[4px_4px_0px_0px_#bfdbfe]')
                                        }`}>
                                            <p className="text-xs mb-1 opacity-70 flex items-center gap-1">
                                                {msg.sender === 'santa' ? '🎅 PÈRE NOËL SECRET' : `👤 ${selectedUser.name}`}
                                            </p>
                                            <p className="text-lg leading-tight">{msg.text}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className={`p-2 rounded-2xl border-2 flex items-center gap-2 ${isDark ? 'bg-slate-800 border-blue-800' : 'bg-white border-blue-200'}`}>
                            <input 
                                className={`flex-1 bg-transparent border-none px-3 py-2 focus:ring-0 text-sm font-black italic ${isDark ? 'text-white placeholder:text-blue-700' : 'text-blue-900 placeholder:text-blue-300'}`}
                                placeholder="Écrire un message..." 
                                value={newChatMessage} 
                                onChange={(e) => setNewChatMessage(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && sendChatMessage(selectedUser.id, selectedUser.wishlist, isMyTarget)}
                            />
                            <button onClick={() => sendChatMessage(selectedUser.id, selectedUser.wishlist, isMyTarget)} disabled={savingId === selectedUser.id} className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-500 transition-colors">
                                {savingId === selectedUser.id ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                            </button>
                        </div>
                        {isMyTarget && <p className="text-[10px] text-center mt-3 opacity-60">Ton identité restera cachée, elle ne verra que "Père Noël Secret".</p>}
                    </div>
                )}

              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}