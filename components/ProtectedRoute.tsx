'use client';
import { useState, useEffect } from 'react';

// AQUÍ ESTÁ LA SOLUCIÓN: Agregamos requiredRole a las reglas de TypeScript
export default function ProtectedRoute({ children, title, requiredRole }: { children: any, title: string, requiredRole?: string }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [role, setRole] = useState<'ADMIN' | 'CAJERO' | 'KDS' | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  // ==========================================
  // AQUÍ DEFINES LOS PINES DE TU NEGOCIO
  // ==========================================
  const PIN_JEFE = '5809';   // Ve finanzas, auditoría, marketing, clientes, etc.
  const PIN_CAJERO = '2026'; // Solo ve Ventas e Inventario
  const PIN_KDS = '2026';    // (Para las pantallas de cocina)

  useEffect(() => {
    // Revisa si ya habían iniciado sesión antes para no pedir el PIN a cada rato
    const savedRole = sessionStorage.getItem('maiztros_role');
    if (savedRole) {
      setRole(savedRole as 'ADMIN' | 'CAJERO' | 'KDS');
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(false);

    if (pin === PIN_JEFE) {
      setRole('ADMIN');
      sessionStorage.setItem('maiztros_role', 'ADMIN');
      setIsAuthenticated(true);
    } else if (pin === PIN_CAJERO) {
      setRole('CAJERO');
      sessionStorage.setItem('maiztros_role', 'CAJERO');
      setIsAuthenticated(true);
    } else if (pin === PIN_KDS) {
      setRole('KDS');
      sessionStorage.setItem('maiztros_role', 'KDS');
      setIsAuthenticated(true);
    } else {
      setError(true);
      setPin('');
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('maiztros_role');
    setIsAuthenticated(false);
    setRole(null);
    setPin('');
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6">
        <div className="bg-zinc-900 border border-zinc-800 p-10 rounded-[3rem] w-full max-w-sm shadow-2xl text-center">
          <div className="bg-yellow-400 w-20 h-20 rounded-full flex items-center justify-center text-4xl mx-auto mb-6 shadow-lg shadow-yellow-400/20">🌽</div>
          <h1 className="text-3xl font-black text-white mb-2">{title}</h1>
          <p className="text-zinc-500 font-bold mb-8 text-sm">Ingresa tu PIN de acceso</p>
          
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <input 
                type="password" 
                value={pin} 
                onChange={(e) => setPin(e.target.value)} 
                maxLength={4}
                placeholder="****"
                className={`w-full bg-zinc-950 border-2 p-5 rounded-2xl text-center text-4xl font-black tracking-[0.5em] text-white outline-none transition-colors ${error ? 'border-red-500 focus:border-red-500' : 'border-zinc-800 focus:border-yellow-400'}`}
                autoFocus
              />
              {error && <p className="text-red-500 text-xs font-bold mt-3 animate-bounce">PIN Incorrecto. Intenta de nuevo.</p>}
            </div>
            <button type="submit" className="w-full bg-yellow-400 hover:bg-yellow-300 text-zinc-950 font-black text-xl py-4 rounded-2xl shadow-lg transition-transform active:scale-95">
              Entrar ➔
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Si pasamos la prueba del PIN, renderizamos el panel.
  // Si el componente que lo llama le pasó una función (como el Admin), le inyectamos el ROL.
  return (
    <>
      <button onClick={handleLogout} className="fixed bottom-6 right-6 bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-white hover:border-red-500 px-4 py-2 rounded-xl text-xs font-bold z-50 transition-colors shadow-xl">
        Cerrar Sesión 🔒
      </button>
      {typeof children === 'function' ? children(role) : children}
    </>
  );
}
