"use client";
import React, { useState, useEffect } from 'react';
import { Gift, ExternalLink, Link as LinkIcon, Loader2, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/utils/supabase';

export default function WishlistPage({ params }: { params: { groupId: string } }) {
  const [participant, setParticipant] = useState<any>(null);
  const [target, setTarget] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [myWishlistText, setMyWishlistText] = useState('');
  const [myWishlistUrl, setMyWishlistUrl] = useState('');

  useEffect(() => {
    const loadData = async () => {
      // On récupère l'ID du participant dans l'URL (?p=...)
      const urlParams = new URLSearchParams(window.location.search);
      const participantId = urlParams.get('p');

      if (!participantId) {
        setLoading(false);
        return;
      }

      // 1. Charger mes infos (nom, ma wishlist, mon groupe)
      const { data: p } = await supabase
        .from('participants')
        .select('*, groups(name)')
        .eq('id', participantId)
        .single();

      if (p) {
        setParticipant(p);
        // On décode la wishlist (qui est soit du texte, soit du JSON)
        try {
          const parsed = JSON.parse(p.wishlist);
          setMyWishlistText(parsed.text || '');
          setMyWishlistUrl(parsed.url || '');
        } catch {
          setMyWishlistText(p.wishlist || '');
        }

        // 2. Charger ma cible (celui à qui j'offre)
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

  const saveMyWishlist = async () => {
    setSaving(true);
    const combined = JSON.stringify({ text: myWishlistText, url: myWishlistUrl });
    const { error } = await supabase
      .from('participants')
      .update({ wishlist: combined })
      .eq('id', participant.id);
    
    if (!error) alert("Ta liste est enregistrée ! 🎁");
    setSaving(false);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center font-black italic uppercase"><Loader2 className="animate-spin mr-2" /> Chargement...</div>;
  if (!participant) return <div className="p-20 text-center font-black italic uppercase">Lien invalide ou expiré</div>;

  // Parser la wishlist de la cible
  let targetWish = { text: '', url: '' };
  if (target?.wishlist) {
    try { targetWish = JSON.parse(target.wishlist); }
    catch { targetWish = { text: target.wishlist, url: '' }; }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 italic font-black uppercase tracking-tighter text-slate-900">
      <div className="max-w-2xl mx-auto space-y-10">
        
        <div className="text-center pt-10">
          <Gift className="mx-auto text-red-600 mb-4" size={50} />
          <h1 className="text-4xl text-red-600 leading-none">{participant.groups.name}</h1>
          <p className="opacity-40 text-sm mt-2">ESPACE PERSONNEL DE : {participant.name}</p>
        </div>

        {/* SECTION : CIBLE */}
        <div className="bg-white p-8 rounded-[3rem] border-4 border-red-500 shadow-2xl">
          <p className="text-[10px] text-red-500 mb-2">TU DOIS OFFRIR UN CADEAU À :</p>
          <h2 className="text-5xl mb-6">{target?.name || "EN ATTENTE..."}</h2>
          
          <div className="bg-slate-50 p-6 rounded-2xl border-2 border-dashed border-slate-200">
            <p className="text-xs text-slate-400 mb-3">SES ENVIES :</p>
            {targetWish.text ? (
              <p className="text-xl mb-4 italic">"{targetWish.text}"</p>
            ) : (
              <p className="text-sm opacity-20 italic font-medium">CETTE PERSONNE N'A PAS ENCORE REMPLI SA LISTE</p>
            )}
            
            {targetWish.url && (
              <a href={targetWish.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-600 text-xs hover:underline mt-4">
                <ExternalLink size={16} /> VOIR LE LIEN DU CADEAU
              </a>
            )}
          </div>
        </div>

        {/* SECTION : MA LISTE */}
        <div className="bg-slate-900 text-white p-8 rounded-[3rem] shadow-xl">
          <h3 className="text-xs text-red-500 mb-6 flex items-center gap-2 underline underline-offset-4 font-black">
            <LinkIcon size={14} /> METTRE À JOUR MES SOUHAITS
          </h3>
          <div className="space-y-4">
            <textarea 
              className="w-full bg-slate-800 border-none rounded-2xl p-4 text-white font-black italic outline-none focus:ring-2 ring-red-500 placeholder:opacity-20"
              rows={3}
              placeholder="QU'EST-CE QUI TE FERAIT PLAISIR ?"
              value={myWishlistText}
              onChange={e => setMyWishlistText(e.target.value)}
            />
            <div className="relative">
              <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input 
                className="w-full bg-slate-800 border-none rounded-2xl p-4 pl-12 text-blue-400 font-black italic outline-none placeholder:opacity-20"
                placeholder="LIEN URL DU CADEAU (FACULTATIF)"
                value={myWishlistUrl}
                onChange={e => setMyWishlistUrl(e.target.value)}
              />
            </div>
            <button 
              onClick={saveMyWishlist}
              disabled={saving}
              className="w-full py-5 bg-red-600 hover:bg-red-700 text-white rounded-2xl transition-all font-black"
            >
              {saving ? "ENREGISTREMENT..." : "SAUVEGARDER MA LISTE"}
            </button>
          </div>
        </div>
        <p className="text-center text-[10px] opacity-20 pb-10">FOUNSELYS.COM - SECRET SANTA SÉCURISÉ</p>
      </div>
    </div>
  );
}