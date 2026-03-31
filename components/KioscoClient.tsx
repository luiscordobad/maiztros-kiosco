'use client';
import { useState } from 'react';
import { useCartStore } from '../../store/cart';

export default function KioscoClient({ products, modifiers }: { products: any[], modifiers: any[] }) {
  const { cart, addToCart, removeFromCart, getTotal } = useCartStore();
  
  // Control de la ventana flotante
  const [activeProduct, setActiveProduct] = useState<any>(null);
  const [selectedMods, setSelectedMods] = useState<any[]>([]);

  // Separar toppings por categoría para mostrarlos bonito
  const polvos = modifiers.filter(m => m.type === 'POLVO');
  const aderezos = modifiers.filter(m => m.type === 'ADEREZO');
  const quesos = modifiers.filter(m => m.type === 'QUESO');
  const restricciones = modifiers.filter(m => m.type === 'RESTRICCION');

  // Lógica de Precios de Maiztros
  const calculateExtraCost = () => {
    const paidToppingsCount = selectedMods.filter(m => m.type !== 'RESTRICCION').length;
    if (paidToppingsCount === 0) return 0;
    if (paidToppingsCount === 1) return 15;
    if (paidToppingsCount === 2) return 25;
    return 35; // 3 o más (Ilimitados)
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

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-zinc-950 text-white font-sans relative">
      
      {/* Menú Principal */}
      <div className="flex-1 p-6 md:p-12 h-screen overflow-y-auto">
        <header className="mb-10 text-center md:text-left">
          <h1 className="text-5xl font-black text-yellow-400 tracking-tight">MAIZTROS</h1>
          <p className="text-zinc-400 text-lg mt-2">Bienvenido. Ordena tu antojo aquí.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <div key={product.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-lg flex flex-col justify-between hover:border-yellow-400/50 transition-colors">
              <div>
                <span className="inline-block px-3 py-1 bg-zinc-800 text-zinc-300 text-xs font-bold uppercase tracking-wider rounded-full mb-3">
                  {product.category}
                </span>
                <h2 className="text-2xl font-bold mb-1">{product.name}</h2>
              </div>
              <div className="mt-6 flex items-center justify-between">
                <p className="text-yellow-400 text-2xl font-black">${product.basePrice.toFixed(2)}</p>
                <button 
                  onClick={() => {
                    setActiveProduct(product);
                    setSelectedMods([]); // Limpiamos opciones previas
                  }}
                  className="bg-yellow-400 text-zinc-950 px-4 py-2 rounded-xl font-bold hover:bg-yellow-300 transition-colors active:scale-95"
                >
                  Configurar
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Carrito Lateral */}
      <div className="w-full lg:w-[400px] bg-zinc-900 border-l border-zinc-800 p-6 flex flex-col h-screen">
        <h2 className="text-3xl font-black text-white mb-6">Tu Orden</h2>
        <div className="flex-1 overflow-y-auto">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-zinc-500">
              <p className="text-lg font-bold">Tu carrito está vacío</p>
            </div>
          ) : (
            <ul className="space-y-4">
              {cart.map((item) => (
                <li key={item.id} className="flex justify-between items-start bg-zinc-800 p-4 rounded-xl border border-zinc-700">
                  <div className="flex-1">
                    <p className="font-bold text-lg leading-tight">{item.product.name}</p>
                    {/* Imprimimos los toppings que eligió */}
                    {item.modifiers.length > 0 && (
                      <p className="text-xs text-zinc-400 mt-1 leading-snug">
                        {item.modifiers.map(m => m.name).join(', ')}
                      </p>
                    )}
                    <p className="text-yellow-400 font-bold mt-2">${item.totalPrice.toFixed(2)}</p>
                  </div>
                  <button 
                    onClick={() => removeFromCart(item.id)}
                    className="ml-4 text-zinc-500 hover:text-red-400 bg-zinc-900 rounded-full w-8 h-8 flex items-center justify-center font-bold"
                  >✕</button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="mt-6 pt-6 border-t border-zinc-800">
          <div className="flex justify-between items-center mb-6">
            <span className="text-2xl text-zinc-400 font-bold">Total:</span>
            <span className="text-4xl text-yellow-400 font-black">${getTotal().toFixed(2)}</span>
          </div>
          <button disabled={cart.length === 0} className="w-full bg-yellow-400 text-zinc-950 py-4 rounded-xl font-black text-xl hover:bg-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed">
            Pagar Orden
          </button>
        </div>
      </div>

      {/* MODAL: Ventana Flotante de Toppings */}
      {activeProduct && (
        <div className="fixed inset-0 bg-black/80 flex justify-center items-center p-4 z-50">
          <div className="bg-zinc-900 border border-zinc-700 w-full max-w-2xl max-h-[90vh] rounded-2xl flex flex-col shadow-2xl">
            
            {/* Cabecera del Modal */}
            <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
              <div>
                <h2 className="text-3xl font-black text-yellow-400">{activeProduct.name}</h2>
                <p className="text-zinc-400 mt-1">Personaliza tu antojo. +1: $15 | +2: $25 | Ilimitados: $35</p>
              </div>
              <button onClick={() => setActiveProduct(null)} className="text-zinc-500 hover:text-white text-3xl font-bold">✕</button>
            </div>

            {/* Opciones con scroll */}
            <div className="p-6 overflow-y-auto flex-1">
              
              {/* Sección Polvos */}
              <h3 className="text-xl font-bold mb-3 border-b border-zinc-700 pb-2">Polvito de Papas</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                {polvos.map(mod => (
                  <button key={mod.id} onClick={() => toggleModifier(mod)} 
                    className={`p-3 rounded-lg border text-sm font-bold text-left transition-colors ${selectedMods.find(m => m.id === mod.id) ? 'bg-yellow-400 text-zinc-950 border-yellow-400' : 'bg-zinc-800 border-zinc-700 hover:border-zinc-500'}`}>
                    {mod.name}
                  </button>
                ))}
              </div>

              {/* Sección Aderezos */}
              <h3 className="text-xl font-bold mb-3 border-b border-zinc-700 pb-2">Aderezos</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                {aderezos.map(mod => (
                  <button key={mod.id} onClick={() => toggleModifier(mod)} 
                    className={`p-3 rounded-lg border text-sm font-bold text-left transition-colors ${selectedMods.find(m => m.id === mod.id) ? 'bg-yellow-400 text-zinc-950 border-yellow-400' : 'bg-zinc-800 border-zinc-700 hover:border-zinc-500'}`}>
                    {mod.name}
                  </button>
                ))}
              </div>

              {/* Sección Quesos */}
              <h3 className="text-xl font-bold mb-3 border-b border-zinc-700 pb-2">Quesos</h3>
              <div className="grid grid-cols-2 gap-3 mb-6">
                {quesos.map(mod => (
                  <button key={mod.id} onClick={() => toggleModifier(mod)} 
                    className={`p-3 rounded-lg border text-sm font-bold text-left transition-colors ${selectedMods.find(m => m.id === mod.id) ? 'bg-yellow-400 text-zinc-950 border-yellow-400' : 'bg-zinc-800 border-zinc-700 hover:border-zinc-500'}`}>
                    {mod.name}
                  </button>
                ))}
              </div>

              {/* Sección Restricciones */}
              <h3 className="text-xl font-bold mb-3 border-b border-zinc-700 pb-2 text-red-400">Restricciones Base (Gratis)</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {restricciones.map(mod => (
                  <button key={mod.id} onClick={() => toggleModifier(mod)} 
                    className={`p-3 rounded-lg border text-sm font-bold text-left transition-colors ${selectedMods.find(m => m.id === mod.id) ? 'bg-red-500 text-white border-red-500' : 'bg-zinc-800 border-zinc-700 hover:border-red-500/50'}`}>
                    {mod.name}
                  </button>
                ))}
              </div>

            </div>

            {/* Botón Flotante para Confirmar */}
            <div className="p-6 border-t border-zinc-800 bg-zinc-900 rounded-b-2xl">
              <button onClick={handleConfirmAdd} className="w-full bg-yellow-400 text-zinc-950 py-4 rounded-xl font-black text-xl hover:bg-yellow-300">
                Añadir al Carrito - ${(activeProduct.basePrice + calculateExtraCost()).toFixed(2)}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
