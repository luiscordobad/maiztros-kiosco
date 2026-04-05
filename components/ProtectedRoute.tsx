'use client';
import { useState, useEffect } from 'react';

export default function ProtectedRoute({ children, title }: { children: React.ReactNode, title: string }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState('');

  useEffect(() => {
    if (sessionStorage.getItem('maiztros_auth') === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = () => {
    if (pin === '2026') { // PIN MAESTRO (Puedes cambiarlo)
      sessionStorage.setItem('maiztros_auth', 'true');
      setIsAuthenticated(true);
    } else {
      alert('PIN Incorrecto 🛑');
      setPin('');
    }
  };

  if (isAuthenticated) return <>{children}</>;

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-white font-sans">
      <span className="text-[6rem] mb-6">🔒</span>
      <h1 className="text-4xl font-black mb-8 text-center text-yellow-400">{title}</h1>
      <p className="text-zinc-500 mb-6 font-bold uppercase tracking-widest">Acceso Restringido</p>
      <input 
        type="password" 
        placeholder="****" 
        value={pin} 
        onChange={e => setPin(e.target.value)} 
        className="bg-zinc-900 border-2 border-zinc-700 text-center text-5xl p-4 rounded-2xl mb-8 w-64 tracking-[1em] focus:border-yellow-400 outline-none" 
        maxLength={4} 
      />
      <button onClick={handleLogin} className="bg-yellow-400 text-zinc-950 font-black text-2xl px-16 py-5 rounded-2xl hover:bg-yellow-300 transition-transform active:scale-95 shadow-xl">
        Desbloquear
      </button>
    </div>
  );
}
