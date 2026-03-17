"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { Gift, ExternalLink, Link as LinkIcon, Loader2, CheckCircle2, User, Sparkles, MessageSquare } from 'lucide-react';
import { supabase } from '@/utils/supabase';

// Fonction 100% blindée anti-crash
const parseWishlist = (raw: any) => {
  if (!raw) return { mine: { text: '', url: '' }, others: '' };
  try {
    const parsed = typeof raw === 'object' ? raw : JSON.parse(raw);
    return { 
      mine: { 
        text: parsed?.mine?.text || parsed?.text || '', 
        url: parsed?.mine?.url || parsed?.url || '' 
      }, 
      others: parsed?.others || '' 
    };
  } catch {
    // Si c'est l'ancien format texte, on le convertit sans planter
    return { mine: { text: String(raw), url: '' }, others: '' };
  }
};

export default function WishlistPage({ params }: { params: { groupId: string } }) {
  const [me, setMe] = useState<any>(null);
  const [groupParticipants, setGroupParticipants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [groupName, setGroupName] = useState("");
  const [dbError, setDbError] = useState("");

  const [myText, setMyText] = useState("");
  const [myUrl, setMyUrl] = useState("");

  const loadData = useCallback(async () => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const myId = urlParams.get('p');

      if (!myId) {
        setDbError("Lien incomplet : Il manque ton ID secret (?p=...)");
        setLoading(false);
        return;
      }

      // On va chercher le profil
      const { data: myData, error: meError } = await supabase
        .from('participants')
        .select('*, groups(name)')
        .eq('id', myId)
        .single();

      if (meError) {
        setDbError(meError.message);
        setLoading(false);
        return;
      }

      if (myData) {
        setMe(myData);
        setGroupName(myData.groups?.name || "Mon Groupe");
        
        const myParsed = parseWishlist(myData.wishlist);
        setMyText(myParsed.mine.text);
        setMyUrl(myParsed.mine.url);

        const { data: groupData } = await supabase
          .from('participants')
          .select('*')
          .eq('group_id', myData.group_id)
          .order('name', { ascending: true });
          
        if (groupData) setGroupParticipants(groupData);
      }
    } catch (err: any) {
      setDbError(err.message || "Erreur de connexion.");
    }
    setLoading(false);
  }, [params.groupId]);

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel(`group-${params.groupId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'participants', filter: `group_id=eq.${params.groupId}` }, 
      (payload) => {
        setGroupParticipants(prev => prev.map(p => p.id === payload.new.id ? { ...p, ...payload.new } : p));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [params.groupId, loadData]);

  const handleSaveMine = async () => {
    setSavingId(me.id);
    const data = parseWishlist(me.wishlist);
    data.mine = { text: myText, url: myUrl };
    await supabase.from('participants').update({ wishlist: JSON.stringify(data) }).eq('id', me.id);
    setMe({ ...me, wishlist: JSON.stringify(data) });
    setSavingId(null);
  };

  const handleSaveOthers = async (id: string, othersText: string, currentRaw: any) => {
    setSavingId(id);
    const data = parseWishlist(currentRaw);
    data.others = othersText;
    await supabase.from('participants').update({ wishlist: JSON.stringify(data) }).eq('id', id);
    setSavingId(null);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50 italic font-black uppercase"><Loader2 className="animate-spin text-red-600 mr-2" /> Chargement...</div>;
  
  // NOUVEAU : Si ça plante, ça te dira exactement pourquoi !
  if (dbError) return <div className="p-20 text-center font-black uppercase italic text-red-600 border-4 border-red-600 m-10">ERREUR : {dbError}</div>;
  if (!me) return <div className="p-20 text-center font-black uppercase italic text-red-600 border-4 border-red-600 m-10">Accès Refusé (Profil introuvable)</div>;

  const myTarget = groupParticipants.find(p => p.id === me.target_id);
  const targetData = myTarget ? parseWishlist(myTarget.wishlist) : { mine: { text: '', url: '' }, others: '' };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-10 font-black italic uppercase tracking-tighter text-slate-900">
      <div className="max-w-4xl mx-auto space-y-12">
        
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="bg-red-600 text-white px-6 py-2 rounded-full text-xl shadow-lg">{groupName} 🎄</div>
          <h1 className="text-5xl md:text-8xl leading-none">Espace de <span className="text-red-600 underline decoration-8 underline-offset-8">{me.name}</span></h1>
        </div>

        {/* SECTION : TA CIBLE */}
        <div className="relative overflow-hidden bg-white border-[10px] border-slate-900 p-8 md:p-12 rounded-[4rem] shadow-[25px_25px_0px_0px_#dc2626]">
          <p className="text-red-600 text-lg mb-2 flex items-center gap-2"><Gift size={20} /> TU ES LE PÈRE NOËL SECRET DE :</p>
          <h2 className="text-7xl md:text-9xl mb-8 leading-none">{myTarget?.name || "???"}</h2>
          
          <div className="space-y-6">
            {/* Ce que la cible a demandé (Vert) */}
            <div className="bg-green-100 border-4 border-green-500 p-6 rounded-3xl transform rotate-1">
              <p className="text-xs text-green-700 mb-2 flex items-center gap-2"><CheckCircle2 size={16} /> CE QU'IL/ELLE AIMERAIT RECEVOIR :</p>
              <p className="text-2xl text-green-900">{targetData.mine.text || "Rien demandé pour l'instant..."}</p>
              {targetData.mine.url && (
                <a href={targetData.mine.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-green-700 bg-white px-4 py-2 rounded-xl mt-4 text-sm hover:bg-green-50 transition-colors border-2 border-green-200">
                  <ExternalLink size={16} /> VOIR LE LIEN
                </a>
              )}
            </div>

            {/* Ce que le groupe prévoit (Noir) */}
            <div className="bg-slate-900 text-white p-8 rounded-3xl transform -rotate-1">
              <div className="flex justify-between items-center mb-4">
                <p className="text-xs text-red-500 flex items-center gap-2"><Sparkles size={14} /> IDÉES SECRÈTES DU GROUPE (IL/ELLE NE LE VOIT PAS)</p>
                {savingId === myTarget?.id && <Loader2 size={16} className="animate-spin text-red-500" />}
              </div>
              <textarea 
                key={targetData.others}
                className="w-full bg-transparent border-none text-2xl p-0 focus:ring-0 resize-none placeholder:opacity-20 italic font-black"
                rows={3}
                placeholder="Discutez des idées de cadeaux ici..."
                defaultValue={targetData.others}
                onBlur={(e) => handleSaveOthers(myTarget?.id, e.target.value, myTarget?.wishlist)}
              />
            </div>
          </div>
        </div>

        {/* SECTION : TOUTES LES LISTES */}
        <div className="space-y-8">
          <div className="flex items-center gap-4">
            <div className="h-[4px] flex-1 bg-slate-900"></div>
            <h3 className="text-3xl">TOUTES LES LISTES</h3>
            <div className="h-[4px] flex-1 bg-slate-900"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {groupParticipants.map((p) => {
              const isMe = p.id === me.id;
              const pData = parseWishlist(p.wishlist);
              
              return (
                <div key={p.id} className={`relative p-8 rounded-[2.5rem] transition-all duration-300 ${isMe ? 'bg-green-500 text-white shadow-2xl scale-[1.02]' : 'bg-white border-4 border-slate-900 shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]'}`}>
                  
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <span className={`text-[10px] px-3 py-1 rounded-full border-2 ${isMe ? 'bg-white text-green-600 border-white' : 'bg-slate-900 text-white border-slate-900'}`}>
                        {isMe ? "MON ESPACE" : "PARTICIPANT"}
                      </span>
                      <h4 className="text-4xl mt-2 leading-none">{p.name}</h4>
                    </div>
                    {isMe ? <CheckCircle2 size={32} /> : <User size={32} className="opacity-10" />}
                  </div>

                  {isMe ? (
                    <div className="space-y-4">
                      <div className="bg-green-600/50 p-5 rounded-2xl">
                        <textarea 
                          className="w-full bg-transparent border-none p-0 focus:ring-0 text-xl font-black italic resize-none placeholder:text-white/50 text-white"
                          placeholder="QU'EST-CE QUI TE FERAIT PLAISIR ?" rows={2}
                          value={myText} onChange={(e) => setMyText(e.target.value)}
                        />
                        <div className="flex items-center gap-2 mt-2 pt-2 border-t-2 border-green-400/30">
                          <LinkIcon size={16} className="text-green-200" />
                          <input 
                            className="flex-1 bg-transparent border-none p-0 focus:ring-0 text-sm font-black italic placeholder:text-green-200/50 text-white"
                            placeholder="LIEN URL DU CADEAU (OPTIONNEL)"
                            value={myUrl} onChange={(e) => setMyUrl(e.target.value)}
                          />
                        </div>
                      </div>
                      <button onClick={handleSaveMine} className="w-full bg-white text-green-600 py-3 rounded-xl hover:bg-green-50 flex items-center justify-center gap-2">
                        {savingId === me.id ? <Loader2 className="animate-spin" size={20} /> : "SAUVEGARDER MA LISTE"}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="bg-green-50 border-2 border-green-200 p-4 rounded-2xl">
                        <p className="text-[10px] text-green-600 mb-1">SES PROPRES IDÉES :</p>
                        <p className="text-lg text-green-900">{pData.mine.text || "Rien demandé..."}</p>
                        {pData.mine.url && (
                          <a href={pData.mine.url} target="_blank" className="text-green-600 text-[10px] flex items-center gap-1 mt-2 hover:underline"><ExternalLink size={12}/> Lien joint</a>
                        )}
                      </div>

                      <div className="bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl">
                        <div className="flex justify-between items-center mb-2">
                          <p className="text-[10px] text-slate-400 flex items-center gap-1"><MessageSquare size={12} /> IDÉES SOUFFLÉES :</p>
                          {savingId === p.id && <Loader2 size={12} className="animate-spin text-slate-400" />}
                        </div>
                        <textarea 
                          key={pData.others}
                          className="w-full bg-transparent border-none p-0 focus:ring-0 text-lg font-black italic resize-none placeholder:text-slate-300 text-slate-800"
                          placeholder="Ajoute une idée ici..." rows={2}
                          defaultValue={pData.others}
                          onBlur={(e) => handleSaveOthers(p.id, e.target.value, p.wishlist)}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}