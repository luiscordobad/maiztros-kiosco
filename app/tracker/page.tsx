'use client';
import { useState, useEffect } from 'react';

export default function OrderTracker() {
  const [preparing, setPreparing] = useState<any[]>([]);
  const [ready, setReady] = useState<any[]>([]);

  const fetchTracker = async () => {
    const res = await fetch('/api/tracker');
    const data = await res.json();
    if (data.success) {
      setPreparing(data.preparing);
      setReady(data.ready);
    }
  };

  useEffect(() => {
    fetchTracker();
    const interval = setInterval(fetchTracker, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-screen flex bg-zinc-950 font-sans overflow-hidden">
      <div className="flex-1 flex flex-col border-r-4 border-zinc-900">
        <div className="bg-yellow-400 p-8 text-center shadow-lg z-10">
          <h1 className="text-5xl font-black text-zinc-950 uppercase tracking-[0.2em]">Preparando ⏳</h1>
        </div>
        <div className="flex-1 p-8 grid grid-cols-2 gap-6 content-start overflow-hidden">
          {preparing.map(o => (
             <div key={o.id} className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl text-center">
               <p className="text-7xl font-black text-white italic tracking-tighter">#{o.turnNumber}</p>
             </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-zinc-900/50">
        <div className="bg-green-500 p-8 text-center shadow-lg z-10">
          <h1 className="text-5xl font-black text-white uppercase tracking-[0.2em]">¡Listos! ✅</h1>
        </div>
        <div className="flex-1 p-8 grid grid-cols-2 gap-6 content-start overflow-hidden">
          {ready.map(o => (
             <div key={o.id} className="bg-green-500/20 border-4 border-green-500 p-6 rounded-3xl text-center animate-pulse shadow-[0_0_50px_rgba(34,197,94,0.3)]">
               <p className="text-7xl font-black text-green-400 italic tracking-tighter">#{o.turnNumber}</p>
             </div>
          ))}
        </div>
      </div>
    </div>
  );
}
