"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { Gift, ExternalLink, Link as LinkIcon, Loader2, CheckCircle2, User, Sparkles, MessageSquare } from 'lucide-react';
import { supabase } from '@/utils/supabase';

export default function WishlistPage({ params }: { params: { groupId: string } }) {
  const [me, setMe] = useState<any>(null);
  const [groupParticipants, setGroupParticipants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [groupName, setGroupName] = useState("");

  // 1. CHARGEMENT INITIAL DES DONNÉES
  const loadData = useCallback(async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const myId = urlParams.get('p');

    if (!myId) {
      setLoading(false);
      return;
    }

    // On récupère TOUS les participants du groupe pour la vue collaborative
    const { data: participants, error } = await supabase
      .from('participants')
      .select('*, groups(name)')
      .eq('group_id', params.groupId)
      .order('name', { ascending: true });

    if (participants && participants.length > 0) {
      setGroupParticipants(participants);
      setGroupName(participants[0].groups.name);
      
      const myInfo = participants.find(p => String(p.id) === String(myId));
      setMe(myInfo);
    }
    setLoading(false);
  }, [params.groupId]);

  useEffect(() => {
    loadData();

    // 2. REALTIME : MISE À JOUR EN DIRECT QUAND QUELQU'UN CHANGE SA LISTE
    const channel = supabase
      .channel(`group-${params.groupId}`)
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'participants',
        filter: `group_id=eq.${params.groupId}` 
      }, 
      (payload) => {
        setGroupParticipants(prev => prev.map(p => p.id === payload.new.id ? { ...p, ...payload.new } : p));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [params.groupId, loadData]);

  // 3. FONCTION DE MISE À JOUR (POUR SOI OU POUR LES AUTRES)
  const handleUpdateWishlist = async (id: string, newContent: string) => {
    setSavingId(id);
    const { error } = await supabase
      .from('participants')
      .update({ wishlist: newContent })
      .eq('id', id);
    
    if (error) console.error("Erreur update:", error);
    setSavingId(null);
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 font-black italic uppercase italic">
      <Loader2 className="animate-spin text-red-600 mb-4" size={40} />
      <p>Synchronisation avec le Pôle Nord...</p>
    </div>
  );

  if (!me) return (
    <div className="min-h-screen flex items-center justify-center p-10">
      <div className="max-w-md w-full border-8 border-red-600 p-10 text-center space-y-4">
        <h1 className="text-4xl font-black italic uppercase">Accès Refusé</h1>
        <p className="font-bold opacity-60 italic">Ton lien magique semble expiré ou corrompu.</p>
      </div>
    </div>
  );

  const myTarget = groupParticipants.find(p => p.id === me.target_id);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-10 font-black italic uppercase tracking-tighter text-slate-900">
      <div className="max-w-4xl mx-auto space-y-12">
        
        {/* HEADER DYNAMIQUE */}
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="bg-red-600 text-white px-6 py-2 rounded-full text-xl shadow-lg animate-bounce">
             {groupName} 🎄
          </div>
          <h1 className="text-5xl md:text-8xl leading-none tracking-tight">Espace de <span className="text-red-600 underline decoration-8 underline-offset-8">{me.name}</span></h1>
        </div>

        {/* SECTION FOCUS : TA CIBLE SECRET SANTA */}
        <div className="relative overflow-hidden bg-white border-[10px] border-slate-900 p-8 md:p-12 rounded-[4rem] shadow-[25px_25px_0px_0px_#dc2626]">
            <div className="absolute top-0 right-0 bg-red-600 text-white px-8 py-2 -rotate-2 origin-top-right text-xs">
                CONFIDENTIEL
            </div>
          <p className="text-red-600 text-lg mb-2 flex items-center gap-2">
            <Gift size={20} /> TU ES LE PÈRE NOËL SECRET DE :
          </p>
          <h2 className="text-7xl md:text-9xl mb-8 leading-none break-words">
            {myTarget?.name || "???"}
          </h2>
          
          <div className="bg-slate-900 text-white p-8 rounded-3xl transform -rotate-1">
            <div className="flex justify-between items-center mb-4">
                <p className="text-xs text-red-500 flex items-center gap-2">
                    <Sparkles size={14} /> SES ENVIES ACTUELLES
                </p>
                {savingId === myTarget?.id && <Loader2 size={16} className="animate-spin" />}
            </div>
            <textarea 
              className="w-full bg-transparent border-none text-2xl md:text-3xl p-0 focus:ring-0 resize-none placeholder:opacity-20 italic font-black"
              rows={3}
              placeholder="Cette personne n'a rien écrit... Aide-la en notant des idées ici !"
              defaultValue={myTarget?.wishlist || ""}
              onBlur={(e) => handleUpdateWishlist(myTarget.id, e.target.value)}
            />
            <p className="text-[10px] mt-4 opacity-40 italic">Note : Ce que tu écris ici sera visible par tout le monde, sauf par {myTarget?.name}.</p>
          </div>
        </div>

        {/* SECTION : TABLEAU COLLABORATIF DE TOUTES LES LISTES */}
        <div className="space-y-8">
          <div className="flex items-center gap-4">
            <div className="h-[4px] flex-1 bg-slate-900"></div>
            <h3 className="text-3xl whitespace-nowrap">TOUTES LES LISTES</h3>
            <div className="h-[4px] flex-1 bg-slate-900"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {groupParticipants.map((p) => {
              const isMe = p.id === me.id;
              const isTarget = p.id === me.target_id;
              
              return (
                <div 
                  key={p.id} 
                  className={`group relative p-8 rounded-[2.5rem] transition-all duration-300 transform hover:-translate-y-2
                    ${isMe 
                      ? 'bg-green-500 text-white ring-[12px] ring-green-100 shadow-2xl' 
                      : 'bg-white border-4 border-slate-900 shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] hover:shadow-[15px_15px_0px_0px_rgba(0,0,0,1)]'
                    }`}
                >
                  <div className="flex justify-between items-start mb-6">
                    <div>
                        <span className={`text-xs px-3 py-1 rounded-full border-2 ${isMe ? 'bg-white text-green-600 border-white' : 'bg-slate-900 text-white border-slate-900'}`}>
                            {isMe ? "MA LISTE" : "PARTICIPANT"}
                        </span>
                        <h4 className="text-4xl mt-2 leading-none">{p.name}</h4>
                    </div>
                    {isMe ? <CheckCircle2 size={32} /> : (isTarget ? <Gift className="text-red-600" size={32} /> : <User size={32} className="opacity-10" />)}
                  </div>

                  <div className={`p-5 rounded-2xl ${isMe ? 'bg-green-600/50' : 'bg-slate-50 border-2 border-slate-100'}`}>
                    <div className="flex justify-between items-center mb-2">
                        <MessageSquare size={14} className="opacity-30" />
                        {savingId === p.id && <Loader2 size={14} className="animate-spin" />}
                    </div>
                    <textarea 
                      className={`w-full bg-transparent border-none p-0 focus:ring-0 text-xl font-black italic resize-none
                        ${isMe ? 'placeholder:text-white/50 text-white' : 'placeholder:text-slate-300 text-slate-800'}`}
                      placeholder={isMe ? "QU'EST-CE QUI TE FERAIT PLAISIR ?" : "AJOUTE UNE IDÉE POUR LUI..."}
                      rows={2}
                      defaultValue={p.wishlist || ""}
                      onBlur={(e) => handleUpdateWishlist(p.id, e.target.value)}
                    />
                  </div>
                  
                  {isMe && (
                    <p className="text-[10px] mt-4 font-bold text-green-100 flex items-center gap-1 italic">
                        <Sparkles size={10} /> Tes amis verront tes idées ici !
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* FOOTER */}
        <div className="pt-20 pb-10 text-center">
            <div className="inline-flex items-center gap-4 text-xs opacity-30 border-t-2 border-slate-900/10 pt-8 w-full justify-center">
                <span>FOUNSELYS.COM</span>
                <span className="h-1 w-1 bg-slate-900 rounded-full"></span>
                <span>SECRET SANTA ENGINE v3.0</span>
                <span className="h-1 w-1 bg-slate-900 rounded-full"></span>
                <span>2024-2025</span>
            </div>
        </div>
      </div>
    </div>
  );
}