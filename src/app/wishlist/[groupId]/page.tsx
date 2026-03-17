"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { Gift, ExternalLink, Link as LinkIcon, Loader2, CheckCircle2, User, Sparkles, MessageSquare, Lock } from 'lucide-react';
import { supabase } from '@/utils/supabase';

// Fonction de parsing sécurisée
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

  // Le participant actuellement sélectionné pour l'affichage à droite
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const [myText, setMyText] = useState("");
  const [myUrl, setMyUrl] = useState("");

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
        
        const myParsed = parseWishlist(myData.wishlist);
        setMyText(myParsed.mine.text);
        setMyUrl(myParsed.mine.url);

        // On sélectionne automatiquement sa cible au chargement
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
  if (dbError) return <div className="p-20 text-center font-black uppercase italic text-red-600 border-4 border-red-600 m-10">ERREUR : {dbError}</div>;
  if (!me) return <div className="p-20 text-center font-black uppercase italic text-red-600 border-4 border-red-600 m-10">Accès Refusé</div>;

  const selectedUser = groupParticipants.find(p => p.id === selectedUserId) || me;
  const isLookingAtMyself = selectedUser.id === me.id;
  const selectedData = parseWishlist(selectedUser.wishlist);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-black italic uppercase tracking-tighter text-slate-900">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-b-4 border-slate-900 pb-6">
          <div>
            <div className="bg-red-600 text-white px-4 py-1 rounded-full text-sm inline-block mb-2 shadow-sm">{groupName} 🎄</div>
            <h1 className="text-3xl md:text-5xl leading-none">ESPACE DE <span className="text-red-600 underline decoration-4 underline-offset-4">{me.name}</span></h1>
          </div>
          <p className="text-xs opacity-50 max-w-xs text-right hidden md:block">CLIQUE SUR UN PARTICIPANT POUR VOIR SA LISTE OU LUI SOUFFLER DES IDÉES.</p>
        </div>

        {/* LAYOUT PRINCIPAL : LISTE A GAUCHE, DETAIL A DROITE */}
        <div className="flex flex-col md:flex-row gap-8">
          
          {/* COLONNE GAUCHE : LISTE DES PARTICIPANTS */}
          <div className="w-full md:w-1/3 flex flex-col gap-4">
            <h2 className="text-xl flex items-center gap-2"><User size={20}/> PARTICIPANTS</h2>
            
            <div className="flex flex-col gap-3">
              {groupParticipants.map((p) => {
                const isSelected = p.id === selectedUserId;
                const isMyTarget = p.id === me.target_id;
                const isMe = p.id === me.id;

                return (
                  <div 
                    key={p.id}
                    onClick={() => setSelectedUserId(p.id)}
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

          {/* COLONNE DROITE : LE DETAIL DU PARTICIPANT SELECTIONNE */}
          <div className="w-full md:w-2/3">
            <div className="bg-white border-4 border-slate-900 rounded-[3rem] p-8 md:p-12 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden">
              
              {/* Badge Cible en haut à droite si c'est notre pioche */}
              {selectedUser.id === me.target_id && (
                <div className="absolute top-0 right-0 bg-red-600 text-white px-8 py-2 -rotate-2 origin-top-right text-xs shadow-md">
                  C'EST TA PIOCHE !
                </div>
              )}

              <h2 className="text-6xl md:text-8xl mb-8 break-words">{selectedUser.name}</h2>

              <div className="space-y-6">
                
                {/* BULLE VERTE : CE QUE LA PERSONNE A DEMANDE (Ses propres idées) */}
                <div className="bg-green-50 border-4 border-green-500 rounded-3xl p-6 relative">
                  <p className="text-xs text-green-700 mb-4 flex items-center gap-2">
                    <CheckCircle2 size={16} /> 
                    {isLookingAtMyself ? "CE QUE JE VEUX POUR NOËL :" : `IDÉE PROPOSÉE PAR ${selectedUser.name} :`}
                  </p>
                  
                  {isLookingAtMyself ? (
                    // MODE EDITION (Moi)
                    <div className="space-y-4">
                      <textarea 
                        className="w-full bg-transparent border-none p-0 focus:ring-0 text-2xl md:text-3xl text-green-900 font-black italic resize-none placeholder:text-green-300"
                        placeholder="Qu'est-ce qui te ferait plaisir ?" rows={2}
                        value={myText} onChange={(e) => setMyText(e.target.value)}
                      />
                      <div className="flex items-center gap-2 border-t-2 border-green-200 pt-4">
                        <LinkIcon size={20} className="text-green-600" />
                        <input 
                          className="flex-1 bg-transparent border-none p-0 focus:ring-0 text-sm text-green-800 font-black italic placeholder:text-green-300"
                          placeholder="Lien vers le cadeau (Optionnel)"
                          value={myUrl} onChange={(e) => setMyUrl(e.target.value)}
                        />
                      </div>
                      <button onClick={handleSaveMine} className="w-full md:w-auto px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 flex items-center justify-center gap-2 transition-colors">
                        {savingId === me.id ? <Loader2 className="animate-spin" size={18} /> : "ENREGISTRER"}
                      </button>
                    </div>
                  ) : (
                    // MODE LECTURE (Quelqu'un d'autre)
                    <div>
                      <p className="text-2xl md:text-3xl text-green-900 leading-tight">
                        {selectedData.mine.text || <span className="opacity-40 text-lg">N'a rien demandé...</span>}
                      </p>
                      {selectedData.mine.url && (
                        <a href={selectedData.mine.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-green-200 text-green-900 px-4 py-2 rounded-xl mt-4 text-xs hover:bg-green-300 transition-colors border-2 border-green-400">
                          <ExternalLink size={14} /> VOIR LE CADEAU
                        </a>
                      )}
                    </div>
                  )}
                </div>

                {/* BULLE NOIRE : LES IDEES DU GROUPE */}
                <div className="bg-slate-900 text-white border-4 border-slate-900 rounded-3xl p-6 relative transform rotate-1">
                  
                  {isLookingAtMyself ? (
                    // C'est ma propre page, je n'ai pas le droit de lire ça !
                    <div className="text-center py-8 opacity-80 space-y-4">
                      <Lock className="mx-auto text-red-500 mb-2" size={40} />
                      <p className="text-xl text-slate-300">ESPACE SECRET</p>
                      <p className="text-xs text-slate-500">LES IDÉES QUE LE GROUPE TE PRÉPARE SONT CACHÉES ICI...<br/>ON GARDE LA SURPRISE ! 🤫</p>
                    </div>
                  ) : (
                    // C'est quelqu'un d'autre, on peut discuter et ajouter des idées
                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <p className="text-xs text-red-500 flex items-center gap-2">
                          <Sparkles size={14} /> IDÉES SOUFFLÉES PAR LE GROUPE (IL/ELLE NE LE VOIT PAS)
                        </p>
                        {savingId === selectedUser.id && <Loader2 size={16} className="animate-spin text-red-500" />}
                      </div>
                      <textarea 
                        key={selectedData.others} // Pour le temps réel
                        className="w-full bg-transparent border-none text-xl md:text-2xl p-0 focus:ring-0 resize-none placeholder:text-slate-600 italic font-black text-white"
                        rows={3}
                        placeholder="Discutez des idées ici... Ex: Une carte cadeau (Dylan)"
                        defaultValue={selectedData.others}
                        onBlur={(e) => handleSaveOthers(selectedUser.id, e.target.value, selectedUser.wishlist)}
                      />
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