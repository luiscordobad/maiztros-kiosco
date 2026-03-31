'use client';
import { useState } from 'react';
import { useCartStore } from '../store/cart';

export default function KioscoClient({ products, modifiers }: { products: any[], modifiers: any[] }) {
  const { cart, addToCart, removeFromCart, getTotal } = useCartStore();
  
  const [activeProduct, setActiveProduct] = useState<any>(null);
  const [selectedMods, setSelectedMods] = useState<any[]>([]);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<any>(null);

  // Estados para datos del cliente
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [showForm, setShowForm] = useState(false);

  const polvos = modifiers.filter(m => m.type === 'POLVO');
  const aderezos = modifiers.filter(m => m.type === 'ADEREZO');
  const quesos = modifiers.filter(m => m.type === 'QUESO');
  const restricciones = modifiers.filter(m => m.type === 'RESTRICCION');

  const calculateExtraCost = () => {
    const paidToppingsCount = selectedMods.filter(m => m.type !== 'RESTRICCION').length;
    if (paidToppingsCount === 0) return 0;
    if (paidToppingsCount === 1) return 15;
    if (paidToppingsCount === 2) return 25;
    return 35;
  };

  const toggleModifier = (mod: any) => {
    if (selectedMods.find(m => m.id === mod.id)) {
      setSelectedMods(selectedMods.filter(m => m.id !== mod.id));
    } else {
      setSelectedMods([...selectedMods, mod]);
    }
  };

  const handleConfirmAdd = () => {
    addToCart(activeProduct, selectedMods, calculateExtraCost());
    setActiveProduct(null);
    setSelectedMods([]);
  };

  const handleCheckout = async () => {
    if (!customerName) return alert("Por favor, ingresa tu nombre para llamarte cuando esté listo.");
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cart, totalAmount: getTotal(), customerName, customerPhone })
      });
      const data = await response.json();
      if (response.ok) {
        setOrderSuccess(data.orderId);
        useCartStore.setState({ cart: [] });
        setCustomerName('');
        setCustomerPhone('');
        setShowForm(false);
        setTimeout(() => setOrderSuccess(null), 8000);
      }
    } catch (error) {
      alert("Error al procesar la orden.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (orderSuccess) {
    return (
      <div className="min-h-screen bg-green-600 text-white flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-7xl font-black mb-4">¡GRACIAS!</h1>
        <p className="text-3xl font-bold mb-2 uppercase">{customerName || 'Cliente'}</p>
        <p className="text-xl mb-10 opacity-90 text-zinc-100 italic">Tu orden se está preparando en este momento.</p>
        <div className="bg-white/10 p-8 rounded-3xl border border-white/20">
          <p className="text-sm uppercase tracking-widest opacity-70 mb-2">Tu número de orden es:</p>
          <p className="text-8xl font-black italic tracking-tighter">#{orderSuccess.slice(-4).toUpperCase()}</p>
        </div>
        <p className="mt-12 text-zinc-200">En un momento te llamaremos por tu nombre.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-zinc-950 text-white font-sans relative">
      <div className="flex-1 p-6 md:p-12 h-screen overflow-y-auto">
        <header className="mb-10 text-center md:text-left">
          <h1 className="text-5xl font-black text-yellow-400 tracking-tight">MAIZTROS</h1>
          <p className="text-zinc-400 text-lg mt-2">Bienvenido. Ordena tu antojo aquí.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <div key={product.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col justify-between hover:border-yellow-400/50 transition-colors">
              <div>
                <span className="inline-block px-3 py-1 bg-zinc-800 text-zinc-300 text-xs font-bold uppercase tracking-wider rounded-full mb-3">{product.category}</span>
                <h2 className="text-2xl font-bold mb-1">{product.name}</h2>
              </div>
              <div className="mt-6 flex items-center justify-between">
                <p className="text-yellow-400 text-2xl font-black">${product.basePrice.toFixed(2)}</p>
                <button onClick={() => {setActiveProduct(product); setSelectedMods([]);}} className="bg-yellow-400 text-zinc-950 px-4 py-2 rounded-xl font-bold active:scale-95 transition-all">Configurar</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="w-full lg:w-[400px] bg-zinc-900 border-l border-zinc-800 p-6 flex flex-col h-screen">
        <h2 className="text-3xl font-black text-white mb-6 italic">Tu Orden</h2>
        <div className="flex-1 overflow-y-auto space-y-4">
          {cart.length === 0 ? <p className="text-zinc-500 text-center mt-20">El carrito está vacío</p> : 
            cart.map((item) => (
              <div key={item.id} className="bg-zinc-800 p-4 rounded-xl border border-zinc-700 flex justify-between">
                <div>
                  <p className="font-bold text-lg leading-none">{item.product.name}</p>
                  <p className="text-xs text-zinc-400 mt-2">{item.modifiers.map((m: any) => m.name).join(', ')}</p>
                  <p className="text-yellow-400 font-bold mt-1">${item.totalPrice.toFixed(2)}</p>
                </div>
                <button onClick={() => removeFromCart(item.id)} className="text-zinc-500">✕</button>
              </div>
            ))
          }
        </div>
        <div className="mt-6 pt-6 border-t border-zinc-800">
          <div className="flex justify-between items-center mb-6">
            <span className="text-xl text-zinc-400">Total:</span>
            <span className="text-4xl text-yellow-400 font-black">${getTotal().toFixed(2)}</span>
          </div>
          
          {showForm ? (
            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <input 
                type="text" placeholder="Tu Nombre (Obligatorio)" value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 p-4 rounded-xl focus:border-yellow-400 outline-none text-lg"
              />
              <input 
                type="tel" placeholder="WhatsApp (Opcional)" value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 p-4 rounded-xl focus:border-yellow-400 outline-none text-lg"
              />
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowForm(false)} className="bg-zinc-800 px-4 rounded-xl text-zinc-400">Atrás</button>
                <button onClick={handleCheckout} disabled={isSubmitting} className="flex-1 bg-yellow-400 text-zinc-950 py-4 rounded-xl font-black text-xl">
                  {isSubmitting ? 'Procesando...' : 'Confirmar y Pagar'}
                </button>
              </div>
            </div>
          ) : (
            <button 
              disabled={cart.length === 0}
              onClick={() => setShowForm(true)}
              className="w-full bg-yellow-400 text-zinc-950 py-4 rounded-xl font-black text-xl disabled:opacity-50"
            >Pagar Orden</button>
          )}
        </div>
      </div>

      {activeProduct && (
        <div className="fixed inset-0 bg-black/80 flex justify-center items-center p-4 z-50">
          <div className="bg-zinc-900 border border-zinc-700 w-full max-w-2xl rounded-2xl flex flex-col shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
              <div>
                <h2 className="text-3xl font-black text-yellow-400 uppercase italic">{activeProduct.name}</h2>
                <p className="text-zinc-400 text-sm mt-1 uppercase tracking-widest">+1: $15 | +2: $25 | Ilimitados: $35</p>
              </div>
              <button onClick={() => setActiveProduct(null)} className="text-zinc-500 text-3xl font-bold">✕</button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh] space-y-6">
              {[ {t: 'Polvito de Papas', m: polvos}, {t: 'Aderezos', m: aderezos}, {t: 'Quesos', m: quesos} ].map(sec => (
                <div key={sec.t}>
                  <h3 className="text-sm font-black text-zinc-500 uppercase tracking-widest mb-3">{sec.t}</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {sec.m.map(mod => (
                      <button key={mod.id} onClick={() => toggleModifier(mod)} className={`p-3 rounded-xl border text-sm font-bold transition-all ${selectedMods.find(m => m.id === mod.id) ? 'bg-yellow-400 text-zinc-950 border-yellow-400 scale-[0.98]' : 'bg-zinc-800 border-zinc-700 hover:border-zinc-500'}`}>{mod.name}</button>
                    ))}
                  </div>
                </div>
              ))}
              <div>
                <h3 className="text-sm font-black text-red-400/70 uppercase tracking-widest mb-3">Restricciones (Gratis)</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {restricciones.map(mod => (
                    <button key={mod.id} onClick={() => toggleModifier(mod)} className={`p-3 rounded-xl border text-sm font-bold transition-all ${selectedMods.find(m => m.id === mod.id) ? 'bg-red-500 text-white border-red-500' : 'bg-zinc-800 border-zinc-700 hover:border-red-400/30'}`}>{mod.name}</button>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-zinc-800 bg-zinc-950">
              <button onClick={handleConfirmAdd} className="w-full bg-yellow-400 text-zinc-950 py-4 rounded-xl font-black text-xl">Añadir - ${(activeProduct.basePrice + calculateExtraCost()).toFixed(2)}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
