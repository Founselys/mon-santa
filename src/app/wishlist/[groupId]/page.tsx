"use client";
import React, { useState, useEffect, use } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/utils/supabase';
import { Gift, Plus, Loader2, User, EyeOff, Sparkles, Send, CheckCircle2 } from 'lucide-react';

export default function WishlistPage({ params }: { params: Promise<{ groupId: string }> }) {
  const resolvedParams = use(params);
  const groupId = resolvedParams.groupId;
  const searchParams = useSearchParams();
  const myId = searchParams.get('u'); 

  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [wishlist, setWishlist] = useState<any[]>([]);
  const [newItem, setNewItem] = useState('');

  useEffect(() => {
    if (groupId && myId) {
      fetchData();
    }
  }, [groupId, myId]);

  const fetchData = async () => {
    setLoading(true);
    const { data: pData } = await supabase.from('participants').select('*').eq('group_id', groupId);
    if (!pData) return;
    setParticipants(pData);
    
    const myProfile = pData.find(p => String(p.id) === String(myId));
    if (myProfile) {
      setMe(myProfile);
      const myTarget = pData.find(p => String(p.id) === String(myProfile.target_id));
      setSelectedMember(myTarget || myProfile);
      fetchWishlist(myTarget?.name || myProfile.name);
    }
    setLoading(false);
  };

  const fetchWishlist = async (name: string) => {
    const { data } = await supabase
      .from('wishlists')
      .select('*')
      .eq('group_id', groupId)
      .eq('participant_name', name)
      .order('created_at', { ascending: false });
    setWishlist(data || []);
  };

  const addItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.trim() || !selectedMember) return;
    await supabase.from('wishlists').insert([{ 
      group_id: groupId, 
      participant_name: selectedMember.name, 
      item_name: newItem,
      suggested_by: me.name 
    }]);
    setNewItem('');
    fetchWishlist(selectedMember.name);
  };

  if (!myId) return <div className="p-20 text-center font-bold text-slate-300">Lien invalide.</div>;
  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-red-600" size={40} /></div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-20 font-sans antialiased text-left">
      <div className="bg-white border-b border-slate-100 p-8 mb-8 text-center shadow-sm sticky top-0 z-50">
        <Sparkles className="mx-auto text-red-600 mb-2" size={28} fill="currentColor" />
        <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Espace de {me?.name}</h1>
      </div>

      <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-3 gap-10">
        <div className="space-y-4">
          <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-4">Membres</h3>
          <div className="space-y-3">
            {participants.map(p => (
              <button key={p.id} onClick={() => {setSelectedMember(p); fetchWishlist(p.name);}}
                className={`w-full p-5 rounded-[2rem] border-2 flex items-center justify-between transition-all group ${
                  selectedMember?.id === p.id ? 'bg-slate-900 border-slate-900 text-white shadow-xl' : 'bg-white border-slate-100 text-slate-700 hover:border-red-300'
                }`}>
                <div className="flex items-center gap-3">
                    <User size={18} />
                    <span className="font-bold">{p.name} {p.id === me.id ? "(Moi)" : ""}</span>
                </div>
                {p.id === me.target_id && <Gift size={16} className="text-red-500" fill="currentColor" />}
              </button>
            ))}
          </div>
        </div>

        <div className="md:col-span-2 bg-white p-8 md:p-12 rounded-[2.5rem] border border-slate-200 shadow-sm relative overflow-hidden">
          <h2 className="text-3xl font-black mb-10 text-slate-800 uppercase tracking-tight">
            Cadeaux pour <span className="text-red-600">{selectedMember?.name}</span>
          </h2>

          <div className="space-y-4 mb-12 flex-1">
            {wishlist.length === 0 ? (
                <p className="text-center py-10 text-slate-300 italic">Aucune idée...</p>
            ) : (
                wishlist.map(i => {
                    // SECURITÉ : Si c'est MA liste, je ne vois PAS les idées suggérées par les AUTRES
                    const isSecretFromOther = selectedMember.id === me.id && i.suggested_by !== me.name;
                    
                    // DESIGN : Si c'est LUI-MÊME qui a donné l'idée pour LUI-MÊME
                    const isSelfSuggestion = selectedMember.name === i.suggested_by;

                    if (isSecretFromOther) {
                        return (
                            <div key={i.id} className="p-6 bg-slate-900 rounded-2xl border border-slate-800 flex justify-between items-center opacity-70">
                                <div className="flex items-center gap-3 text-white/40 italic font-black uppercase text-xs tracking-widest">
                                    <EyeOff size={18} className="text-red-500" /> Surprise d'un ami...
                                </div>
                            </div>
                        );
                    }

                    return (
                        <div key={i.id} className={`p-6 rounded-2xl border-2 flex justify-between items-center group transition-all ${
                          isSelfSuggestion 
                          ? 'bg-green-50 border-green-200 hover:border-green-300' // Fond vert si suggestion de soi-même
                          : 'bg-slate-50 border-slate-100 hover:border-red-200'
                        }`}>
                            <div className="flex flex-col">
                                <span className="font-black text-slate-800 text-xl uppercase tracking-tight leading-none mb-1">
                                  {i.item_name}
                                </span>
                                <span className={`text-[10px] font-black uppercase tracking-widest ${isSelfSuggestion ? 'text-green-600' : 'text-slate-400'}`}>
                                  {isSelfSuggestion ? `Ajouté par ${selectedMember.name} (Lui-même)` : `Suggéré par ${i.suggested_by}`}
                                </span>
                            </div>
                            {isSelfSuggestion && <CheckCircle2 size={20} className="text-green-500" />}
                        </div>
                    );
                })
            )}
          </div>

          <form onSubmit={addItem} className="flex gap-3">
            <input 
              value={newItem} onChange={e => setNewItem(e.target.value)}
              placeholder={`Ajouter une idée...`}
              className="flex-1 p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:bg-white focus:border-red-500 font-bold transition-all text-slate-800 shadow-inner"
            />
            <button className="bg-red-600 text-white p-5 rounded-2xl hover:bg-red-700 transition shadow-xl shadow-red-100 active:scale-95"><Plus size={24}/></button>
          </form>
        </div>
      </div>
    </div>
  );
}