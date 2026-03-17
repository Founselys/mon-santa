"use client";
import React, { useState, useEffect } from 'react';
import { Gift, ExternalLink, Link as LinkIcon, Loader2, ArrowLeft } from 'lucide-react';
import { supabase } from '@/utils/supabase';

export default function WishlistPage({ params }: { params: { groupId: string } }) {
  const [participant, setParticipant] = useState<any>(null);
  const [target, setTarget] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // États pour MA wishlist
  const [myWishlistText, setMyWishlistText] = useState('');
  const [myWishlistUrl, setMyWishlistUrl] = useState('');

  useEffect(() => {
    const loadData = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const participantId = urlParams.get('p');

      if (!participantId) {
        setLoading(false);
        return;
      }

      // 1. Charger mes infos
      const { data: p } = await supabase
        .from('participants')
        .select('*, groups(name)')
        .eq('id', participantId)
        .single();

      if (p) {
        setParticipant(p);
        const myData = parseWishlist(p.wishlist);
        setMyWishlistText(myData.text);
        setMyWishlistUrl(myData.url);

        // 2. Charger les infos de ma cible
        if (p.target_id) {
          const { data: t } = await supabase
            .from('participants')
            .select('*')
            .eq('id', p.target_id)
            .single();
          setTarget(t);
        }
      }
      setLoading(false);
    };
    loadData();
  }, [params.groupId]);

  const parseWishlist = (raw: string) => {
    try {
      const parsed = JSON.parse(raw);
      return { text: parsed.text || '', url: parsed.url || '' };
    } catch {
      return { text: raw || '', url: '' };
    }
  };

  const saveMyWishlist = async () => {
    setSaving(true);
    const combined = JSON.stringify({ text: myWishlistText, url: myWishlistUrl });
    const { error } = await supabase
      .from('participants')
      .update({ wishlist: combined })
      .eq('id', participant.id);
    
    if (!error) alert("Ta liste a été mise à jour ! 🎅");
    setSaving(false);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center italic font-black"><Loader2 className="animate-spin" /></div>;
  if (!participant) return <div className="p-20 text-center font-black italic">LIEN INVALIDE OU EXPIRE</div>;

  const targetWishlist = target ? parseWishlist(target.wishlist) : { text: '', url: '' };

  return (
    <div className="min-h-screen bg-slate-50 p-6 italic font-black uppercase tracking-tighter text-slate-900">
      <div className="max-w-2xl mx-auto space-y-10">
        
        <div className="text-center pt-10">
          <Gift className="mx-auto text-red-600 mb-4" size={50} />
          <h1 className="text-4xl text-red-600">{participant.groups.name}</h1>
          <p className="opacity-40">ESPACE DE : {participant.name}</p>
        </div>

        {/* SECTION : QUI JE DOIS GÂTER */}
        <div className="bg-white p-8 rounded-[3rem] border-4 border-red-500 shadow-2xl scale-105">
          <p className="text-[10px] text-red-500 mb-2">TA CIBLE :</p>
          <h2 className="text-5xl mb-6">{target?.name || "NON DÉFINI"}</h2>
          
          <div className="bg-slate-50 p-6 rounded-2xl border-2 border-dashed border-slate-200">
            <p className="text-xs text-slate-400 mb-3">SA WISHLIST :</p>
            {targetWishlist.text ? (
              <p className="text-xl mb-4 italic">"{targetWishlist.text}"</p>
            ) : (
              <p className="text-sm opacity-20">RIEN POUR L'INSTANT...</p>
            )}
            
            {targetWishlist.url && (
              <a href={targetWishlist.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-600 text-xs hover:underline">
                <ExternalLink size={16} /> VOIR LE LIEN DU CADEAU
              </a>
            )}
          </div>
        </div>

        {/* SECTION : MA PROPRE LISTE */}
        <div className="bg-slate-900 text-white p-8 rounded-[3rem] shadow-xl">
          <h3 className="text-xs text-red-500 mb-6 flex items-center gap-2 underline underline-offset-4">
            <LinkIcon size={14} /> METTRE À JOUR MES ENVIES
          </h3>
          <div className="space-y-4">
            <textarea 
              className="w-full bg-slate-800 border-none rounded-2xl p-4 text-white font-black italic outline-none focus:ring-2 ring-red-500"
              rows={3}
              placeholder="QU'EST-CE QUI TE FERAIT PLAISIR ?"
              value={myWishlistText}
              onChange={e => setMyWishlistText(e.target.value)}
            />
            <div className="relative">
              <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input 
                className="w-full bg-slate-800 border-none rounded-2xl p-4 pl-12 text-blue-400 font-black italic outline-none"
                placeholder="LIEN URL DE TON CADEAU"
                value={myWishlistUrl}
                onChange={e => setMyWishlistUrl(e.target.value)}
              />
            </div>
            <button 
              onClick={saveMyWishlist}
              disabled={saving}
              className="w-full py-5 bg-red-600 hover:bg-red-700 text-white rounded-2xl transition-all font-black"
            >
              {saving ? "EN COURS..." : "ENREGISTRER MES SOUHAITS"}
            </button>
          </div>
        </div>

        <p className="text-center text-[8px] opacity-30 pb-10">FOUNSELYS.COM - TON SECRET SANTA PRIVÉ</p>
      </div>
    </div>
  );
}