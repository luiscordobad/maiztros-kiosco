'use client';
import { useState, useEffect } from 'react';
import { useCartStore } from '../store/cart';

const OPCIONES = {
  PAPAS: ['Doritos Nacho', 'Doritos Incógnita', 'Tostitos Salsa Verde', 'Tostitos Flamin Hot', 'Cheetos Torciditos', 'Ruffles Queso'],
  MARUCHAN: ['Pollo', 'Res', 'Camarón con Limón', 'Camarón Piquín', 'Queso', 'Habanero'],
  BOING: ['Mango', 'Guayaba', 'Manzana', 'Fresa'],
  REFRESCO: ['Coca-Cola', 'Coca Light', 'Coca Sin Azúcar', 'Sprite', 'Fresca', 'Fanta', 'Sidral Mundet'],
  BEBIDA_ALL: ['Coca-Cola', 'Sprite', 'Fresca', 'Fanta', 'Boing Mango', 'Boing Guayaba', 'Boing Manzana', 'Boing Fresa', 'Agua Natural']
};

const HIGH_PROFIT = ['don maiztro', 'combo pareja', 'combo familiar', 'construpapas'];

export default function KioscoClient({ products, modifiers }: { products: any[], modifiers: any[] }) {
  const { cart, addToCart, removeFromCart, getTotal } = useCartStore();
  
  // Limpiamos Ramaiztro
  const visibleProducts = products.filter(p => p.name.toLowerCase() !== 'ramaiztro');

  const polvos = modifiers.filter(m => m.type === 'POLVO');
  const aderezos = modifiers.filter(m => m.type === 'ADEREZO');
  const quesos = modifiers.filter(m => m.type === 'QUESO');
  const restricciones = modifiers.filter(m => m.type === 'RESTRICCION');

  const [appState, setAppState] = useState<'WELCOME' | 'MENU' | 'UPSELL' | 'CHECKOUT' | 'SUCCESS'>('WELCOME');
  const [orderType, setOrderType] = useState<'DINE_IN' | 'TAKEOUT'>('DINE_IN');
  
  const [activeProduct, setActiveProduct] = useState<any>(null);
  const [wizardStep, setWizardStep] = useState(0);
  const [wizardData, setWizardData] = useState<any>({}); 

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccessId, setOrderSuccessId] = useState<any>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');

  const getProductDesc = (name: string) => {
    if(name.includes('Individual')) return "Esquite Mediano + 1 Bebida";
    if(name.includes('Pareja')) return "2 Esquites (Toppings full) + 2 Bebidas";
    if(name.includes('Familiar')) return "2 Gdes + 2 Chicos (Toppings full) + 4 Bebidas";
    if(name === 'Construpapas') return "Tus papas con esquite encima.";
    if(name === 'Obra Maestra') return "Maruchan con nuestro esquite.";
    if(name === 'Don Maiztro') return "Maruchan + Papas + Esquite (1er topping gratis)";
    return "";
  };

  const getProductSteps = (p: any) => {
    const n = p.name.toLowerCase();
    if(n.includes('boing')) return [{t: 'Sabor de Boing', type: 'BOING'}];
    if(n.includes('refresco')) return [{t: 'Sabor de Refresco', type: 'REFRESCO'}];
    if(n.includes('construpapas')) return [{t: 'Bolsa de Papas', type: 'PAPAS'}, {t: 'Estilo de Esquite', type: 'TOPPINGS'}];
    if(n.includes('obra maestra')) return [{t: 'Sabor de Maruchan', type: 'MARUCHAN'}, {t: 'Estilo de Esquite', type: 'TOPPINGS'}];
    if(n.includes('don maiztro')) return [{t: 'Sabor de Maruchan', type: 'MARUCHAN'}, {t: 'Bolsa de Papas', type: 'PAPAS'}, {t: 'Estilo de Esquite', type: 'TOPPINGS'}];
    if(n.includes('individual')) return [{t: 'Esquite Mediano', type: 'TOPPINGS'}, {t: 'Tu Bebida', type: 'BEBIDA_ALL'}];
    if(n.includes('pareja')) return [{t: 'Esquite 1', type: 'TOPPINGS', isFree: true}, {t: 'Esquite 2', type: 'TOPPINGS', isFree: true}, {t: 'Bebida 1', type: 'BEBIDA_ALL'}, {t: 'Bebida 2', type: 'BEBIDA_ALL'}];
    if(n.includes('familiar')) return [{t: 'Esquite Grande 1', type: 'TOPPINGS', isFree: true}, {t: 'Esquite Grande 2', type: 'TOPPINGS', isFree: true}, {t: 'Esquite Chico 1', type: 'TOPPINGS', isFree: true}, {t: 'Esquite Chico 2', type: 'TOPPINGS', isFree: true}, {t: 'Bebida 1', type: 'BEBIDA_ALL'}, {t: 'Bebida 2', type: 'BEBIDA_ALL'}, {t: 'Bebida 3', type: 'BEBIDA_ALL'}, {t: 'Bebida 4', type: 'BEBIDA_ALL'}];
    return [{t: 'Personaliza tu antojo', type: 'TOPPINGS'}];
  };

  const handleStartOrder = (type: 'DINE_IN' | 'TAKEOUT') => {
    setOrderType(type);
    setAppState('MENU');
    window.scrollTo(0,0);
  };

  const handleProductClick = (product: any) => {
    if (product.name.toLowerCase() === 'agua natural') {
      addToCart(product, 0, 'Agua Natural');
      return; // Agua no detona upsell porque ya es bebida
    }
    setActiveProduct(product);
    setWizardStep(0);
    setWizardData({});
  };

  const handleNextOrFinish = () => {
    const activeSteps = getProductSteps(activeProduct);
    const isLastStep = wizardStep === activeSteps.length - 1;

    if (!isLastStep) { setWizardStep(prev => prev + 1); return; }

    let totalExtra = 0;
    let notesLines: string[] = [];

    activeSteps.forEach((step, index) => {
      const selections = wizardData[index] || [];
      if (selections.length === 0) return;
      if (step.type === 'TOPPINGS') {
        const paid = selections.filter((s:any) => s.type !== 'RESTRICCION').length;
        let baseCount = paid;
        if (activeProduct.name === 'Don Maiztro' && baseCount > 0) baseCount -= 1; 
        if (!step.isFree) {
          if (baseCount === 1) totalExtra += 15;
          if (baseCount === 2) totalExtra += 25;
          if (baseCount >= 3) totalExtra += 35;
        }
        notesLines.push(`${step.t}: ${selections.map((s:any) => s.name).join(', ')}`);
      } else { notesLines.push(`${step.t}: ${selections[0]}`); }
    });

    addToCart(activeProduct, totalExtra, notesLines.join(' | '));
    const wasDrinkOrCombo = activeProduct.category === 'BEBIDA' || activeProduct.category === 'COMBO';
    setActiveProduct(null);
    
    // Si no compró bebida ni combo, le ofrecemos bebida
    if (!wasDrinkOrCombo) {
      setAppState('UPSELL');
    }
  };

  // Función mágica: Navegar a bebidas automáticamente
  const handleGoToDrinks = () => {
    setAppState('MENU');
    setTimeout(() => {
      const section = document.getElementById('seccion-bebidas');
      if (section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  const handleCheckout = async (paymentMethod: string) => {
    if (!customerName) return alert("Ingresa tu nombre para tu ticket.");
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cart, totalAmount: getTotal(), customerName, customerEmail, paymentMethod, orderType })
      });
      const data = await response.json();
      if (response.ok) {
        setOrderSuccessId(data.orderId);
        useCartStore.setState({ cart: [] });
        setCustomerName(''); setCustomerEmail(''); 
        setAppState('SUCCESS');
        setTimeout(() => { setAppState('WELCOME'); setOrderSuccessId(null); }, 10000);
      }
    } catch (error) { alert("Error al procesar la orden."); }
    setIsSubmitting(false);
  };

  // COMPONENTES DE SECCIONES (Para evitar repetir código)
  const renderProductGrid = (items: any[]) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map((product) => (
        <div key={product.id} onClick={() => handleProductClick(product)} className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 flex flex-col justify-between cursor-pointer hover:border-yellow-400/50 hover:bg-zinc-800 transition-all">
          <div>
            <h2 className="text-xl font-bold mb-1">{product.name}</h2>
            {getProductDesc(product.name) && <p className="text-zinc-500 text-xs mb-4">{getProductDesc(product.name)}</p>}
          </div>
          <div className="mt-auto flex items-center justify-between pt-4 border-t border-zinc-800/50">
            <p className="text-white text-2xl font-black">${product.basePrice.toFixed(2)}</p>
            <span className="text-yellow-400 font-bold text-sm bg-yellow-400/10 px-4 py-2 rounded-xl">Agregar</span>
          </div>
        </div>
      ))}
    </div>
  );

  if (appState === 'WELCOME') {
    return (
      <div className="h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]">
        <h1 className="text-8xl md:text-[9rem] font-black text-yellow-400 tracking-tighter mb-4 shadow-black drop-shadow-2xl">MAIZTROS</h1>
        <p className="text-3xl font-bold text-zinc-300 mb-16 italic">¿Dónde disfrutarás tu antojo?</p>
        <div className="flex flex-col md:flex-row gap-8 w-full max-w-5xl">
          <button onClick={() => handleStartOrder('DINE_IN')} className="flex-1 bg-yellow-400 hover:bg-yellow-300 text-zinc-950 h-80 rounded-[3rem] flex flex-col items-center justify-center gap-6 transition-transform hover:scale-105 active:scale-95 shadow-[0_0_50px_rgba(250,204,21,0.2)]">
            <span className="text-8xl">🍽️</span>
            <span className="text-4xl font-black uppercase">Comer Aquí</span>
          </button>
          <button onClick={() => handleStartOrder('TAKEOUT')} className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-white h-80 rounded-[3rem] flex flex-col items-center justify-center gap-6 transition-transform hover:scale-105 active:scale-95 border-2 border-zinc-700 shadow-2xl">
            <span className="text-8xl">🎒</span>
            <span className="text-4xl font-black uppercase">Para Llevar</span>
          </button>
        </div>
      </div>
    );
  }

  if (appState === 'SUCCESS') {
    return (
      <div className="h-screen bg-green-500 text-white flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-8xl font-black mb-6">¡ORDEN CONFIRMADA!</h1>
        <p className="text-4xl font-bold mb-12 opacity-90">{orderType === 'TAKEOUT' ? 'Empacando para llevar 🎒' : 'Preparando para comer aquí 🍽️'}</p>
        <div className="bg-white/20 p-16 rounded-[4rem] border-2 border-white/30 shadow-2xl backdrop-blur-md">
          <p className="text-2xl uppercase tracking-[0.3em] font-bold opacity-80 mb-6">Número de Turno</p>
          <p className="text-[10rem] leading-none font-black italic tracking-tighter drop-shadow-2xl">#{orderSuccessId?.slice(-4).toUpperCase()}</p>
        </div>
        <p className="mt-16 text-3xl font-bold bg-zinc-950 text-white px-8 py-4 rounded-full animate-bounce">Espera a que llamemos tu nombre</p>
      </div>
    );
  }

  if (appState === 'CHECKOUT') {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col lg:flex-row p-6 md:p-12 gap-8 text-white">
        <div className="flex-1 bg-zinc-900 rounded-[3rem] p-8 md:p-12 flex flex-col border border-zinc-800 shadow-2xl">
          <h2 className="text-4xl font-black mb-8 border-b border-zinc-800 pb-6 text-yellow-400">Tu Orden</h2>
          <div className="flex-1 overflow-y-auto space-y-4 pr-4">
            {cart.map((item) => (
              <div key={item.id} className="bg-zinc-950 border border-zinc-800 p-6 rounded-3xl flex justify-between items-start">
                <div className="flex-1">
                  <p className="font-black text-2xl">{item.product.name}</p>
                  {item.notes && <p className="text-zinc-500 text-sm mt-3 font-medium leading-relaxed whitespace-pre-wrap">{item.notes.split(' | ').join('\n')}</p>}
                </div>
                <div className="text-right ml-6 flex flex-col items-end">
                  <p className="text-white font-black text-3xl">${item.totalPrice.toFixed(2)}</p>
                  <button onClick={() => removeFromCart(item.id)} className="text-red-400 bg-red-400/10 px-4 py-2 rounded-xl text-sm font-bold mt-4 hover:bg-red-400 hover:text-zinc-950 transition-colors">Eliminar</button>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-8 pt-8 border-t border-zinc-800 flex justify-between items-end">
            <button onClick={() => setAppState('MENU')} className="text-zinc-400 text-xl font-bold hover:text-white flex items-center gap-2">← Agregar más</button>
            <div className="text-right">
              <p className="text-zinc-500 text-xl font-bold uppercase tracking-widest mb-1">Total a Pagar</p>
              <p className="text-7xl text-yellow-400 font-black tracking-tighter">${getTotal().toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="w-full lg:w-[450px] flex flex-col gap-6">
          <div className="bg-zinc-900 rounded-[3rem] p-8 border border-zinc-800 shadow-2xl">
            <h3 className="text-xl font-black mb-6 uppercase tracking-widest text-zinc-500">¿A nombre de quién?</h3>
            <div className="space-y-4">
              <input type="text" placeholder="Tu Nombre *" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="w-full bg-zinc-950 border border-zinc-700 p-5 rounded-2xl focus:border-yellow-400 outline-none text-xl font-bold"/>
              <input type="email" placeholder="Correo (Ticket Digital)" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} className="w-full bg-zinc-950 border border-zinc-700 p-5 rounded-2xl focus:border-yellow-400 outline-none text-xl font-bold"/>
            </div>
          </div>
          <div className="bg-zinc-900 rounded-[3rem] p-8 border border-zinc-800 shadow-2xl flex-1 flex flex-col">
            <h3 className="text-xl font-black mb-6 uppercase tracking-widest text-zinc-500">Forma de Pago</h3>
            <div className="flex-1 flex flex-col gap-4 justify-center">
              <button onClick={() => handleCheckout('TERMINAL')} disabled={isSubmitting || cart.length===0} className="bg-blue-500 hover:bg-blue-400 text-white py-6 rounded-2xl font-black text-xl shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3">💳 Tarjeta (Terminal)</button>
              <button onClick={() => handleCheckout('EFECTIVO_CAJA')} disabled={isSubmitting || cart.length===0} className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-white py-6 rounded-2xl font-black text-xl shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3">💵 Pagar en Caja</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- MENU Y WIZARD ---
  return (
    <div className="flex flex-col min-h-screen bg-zinc-950 text-white font-sans relative pb-40">
      <header className="p-6 md:p-8 flex justify-between items-center bg-zinc-950/80 backdrop-blur-lg border-b border-zinc-800 sticky top-0 z-40">
        <h1 className="text-3xl font-black text-yellow-400 tracking-tight cursor-pointer" onClick={() => setAppState('WELCOME')}>MAIZTROS</h1>
        <div className="flex items-center gap-4">
          <div className="bg-zinc-900 px-6 py-3 rounded-full border border-zinc-700 font-bold text-sm tracking-widest uppercase text-zinc-300">
            {orderType === 'DINE_IN' ? '🍽️ Comer Aquí' : '🎒 Para Llevar'}
          </div>
          <button onClick={() => setAppState('WELCOME')} className="text-zinc-500 hover:text-white font-bold text-sm underline">Cambiar</button>
        </div>
      </header>

      <div className="p-6 md:p-8 max-w-7xl mx-auto w-full space-y-16">
        
        <section id="seccion-top">
          <h2 className="text-4xl font-black mb-8 flex items-center gap-3"><span className="text-5xl">⭐</span> Los Más Vendidos</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {visibleProducts.filter(p => HIGH_PROFIT.includes(p.name.toLowerCase())).map((product) => (
              <div key={product.id} onClick={() => handleProductClick(product)} className="bg-gradient-to-br from-zinc-800 to-zinc-900 border-2 border-yellow-400 rounded-[2rem] p-8 flex flex-col justify-between cursor-pointer hover:scale-[1.02] transition-transform shadow-[0_10px_30px_rgba(250,204,21,0.15)] relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-yellow-400 text-zinc-950 font-black text-xs px-6 py-2 rounded-bl-2xl tracking-widest shadow-md">TOP</div>
                <div>
                  <h2 className="text-3xl font-black mb-3 text-white">{product.name}</h2>
                  <p className="text-zinc-400 text-sm leading-relaxed">{getProductDesc(product.name)}</p>
                </div>
                <div className="mt-8 flex items-center justify-between">
                  <p className="text-yellow-400 text-4xl font-black">${product.basePrice.toFixed(2)}</p>
                  <span className="bg-yellow-400 text-zinc-950 h-12 w-12 rounded-full flex items-center justify-center text-2xl font-black shadow-lg">＋</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="seccion-esquites">
          <h2 className="text-2xl font-black mb-6 text-zinc-400 uppercase tracking-widest border-b border-zinc-800 pb-4">🌽 Esquites Clásicos</h2>
          {renderProductGrid(visibleProducts.filter(p => p.category === 'ESQUITE' && !HIGH_PROFIT.includes(p.name.toLowerCase())))}
        </section>

        <section id="seccion-especialidades">
          <h2 className="text-2xl font-black mb-6 text-zinc-400 uppercase tracking-widest border-b border-zinc-800 pb-4">🔥 Especialidades</h2>
          {renderProductGrid(visibleProducts.filter(p => p.category === 'ESPECIALIDAD' && !HIGH_PROFIT.includes(p.name.toLowerCase())))}
        </section>

        <section id="seccion-combos">
          <h2 className="text-2xl font-black mb-6 text-zinc-400 uppercase tracking-widest border-b border-zinc-800 pb-4">📦 Combos</h2>
          {renderProductGrid(visibleProducts.filter(p => p.category === 'COMBO' && !HIGH_PROFIT.includes(p.name.toLowerCase())))}
        </section>

        <section id="seccion-bebidas" className="scroll-mt-32">
          <h2 className="text-3xl font-black mb-6 text-blue-400 uppercase tracking-widest border-b border-zinc-800 pb-4 flex items-center gap-3">🥤 Bebidas Frías</h2>
          {renderProductGrid(visibleProducts.filter(p => p.category === 'BEBIDA'))}
        </section>
      </div>

      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-6 md:p-8 bg-zinc-900/95 backdrop-blur-xl border-t border-zinc-800 z-40 flex justify-between items-center shadow-[0_-20px_50px_rgba(0,0,0,0.6)]">
          <div className="flex flex-col ml-4">
            <span className="text-zinc-400 font-black tracking-widest uppercase text-sm mb-1">Orden Actual ({cart.length})</span>
            <span className="text-5xl text-yellow-400 font-black tracking-tighter">${getTotal().toFixed(2)}</span>
          </div>
          <button onClick={() => setAppState('CHECKOUT')} className="bg-yellow-400 text-zinc-950 px-10 md:px-16 py-6 rounded-[2rem] font-black text-2xl hover:bg-yellow-300 shadow-[0_10px_30px_rgba(250,204,21,0.3)] active:scale-95 transition-all flex items-center gap-4">
            Pagar Orden <span className="text-3xl">➔</span>
          </button>
        </div>
      )}

      {/* UPSELL MODAL */}
      {appState === 'UPSELL' && (
        <div className="fixed inset-0 bg-black/95 flex justify-center items-center p-4 z-50 backdrop-blur-md">
          <div className="bg-gradient-to-b from-zinc-800 to-zinc-950 border border-zinc-700 w-full max-w-xl rounded-[3rem] flex flex-col shadow-2xl p-12 text-center animate-in zoom-in duration-300">
            <span className="text-8xl mb-6 drop-shadow-xl animate-bounce">🥤</span>
            <h2 className="text-5xl font-black text-white mb-4 tracking-tight">¿Tienes sed?</h2>
            <p className="text-xl text-zinc-400 mb-12 font-medium">No dejes tu esquite solo. Acompáñalo con algo frío.</p>
            <div className="flex flex-col gap-4">
              <button onClick={handleGoToDrinks} className="bg-yellow-400 text-zinc-950 py-6 rounded-2xl font-black text-2xl shadow-xl hover:bg-yellow-300 transition-colors">
                Sí, quiero una bebida
              </button>
              <button onClick={() => setAppState('MENU')} className="bg-transparent text-zinc-500 py-4 rounded-2xl font-bold text-lg hover:text-white transition-colors">
                No gracias, solo quiero comer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WIZARD MODAL */}
      {activeProduct && getProductSteps(activeProduct)[wizardStep] && (
        <div className="fixed inset-0 bg-black/95 flex justify-center items-center p-4 z-50 backdrop-blur-md">
          <div className="bg-zinc-950 border border-zinc-800 w-full max-w-4xl rounded-[3rem] flex flex-col shadow-2xl overflow-hidden h-[90vh] md:h-auto md:max-h-[90vh]">
            <div className="p-8 border-b border-zinc-800 flex justify-between items-center bg-zinc-900">
              <div>
                <p className="text-yellow-400 font-bold tracking-widest uppercase text-sm mb-2">Paso {wizardStep + 1} de {getProductSteps(activeProduct).length}</p>
                <h2 className="text-3xl font-black text-white">{getProductSteps(activeProduct)[wizardStep].t}</h2>
              </div>
              <button onClick={() => setActiveProduct(null)} className="bg-zinc-800 text-zinc-400 h-16 w-16 rounded-full flex items-center justify-center text-3xl font-bold hover:text-white hover:bg-zinc-700 transition-colors">✕</button>
            </div>
            
            <div className="p-8 overflow-y-auto flex-1 space-y-10">
              {getProductSteps(activeProduct)[wizardStep].type === 'TOPPINGS' ? (
                <>
                  {[ {t: 'Polvito de Papas', m: polvos}, {t: 'Aderezos', m: aderezos}, {t: 'Quesos', m: quesos} ].map(sec => (
                    <div key={sec.t}>
                      <h3 className="text-lg font-black text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-yellow-400"></span>{sec.t}</h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {sec.m.map((mod:any) => (
                          <button key={mod.id} onClick={() => {
                            const c = wizardData[wizardStep] || [];
                            setWizardData({...wizardData, [wizardStep]: c.find((m:any)=>m.id===mod.id) ? c.filter((m:any)=>m.id!==mod.id) : [...c, mod]});
                          }} className={`p-5 rounded-2xl border-2 text-sm md:text-base font-black transition-all ${(wizardData[wizardStep] || []).find((m:any) => m.id === mod.id) ? 'bg-yellow-400 text-zinc-950 border-yellow-400 scale-[0.98]' : 'bg-zinc-900 border-zinc-700 hover:border-zinc-500 text-zinc-300'}`}>{mod.name}</button>
                        ))}
                      </div>
                    </div>
                  ))}
                  <div>
                    <h3 className="text-lg font-black text-red-400 uppercase tracking-widest mb-4 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-red-400"></span>Restricciones</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {restricciones.map((mod:any) => (
                        <button key={mod.id} onClick={() => {
                          const c = wizardData[wizardStep] || [];
                          setWizardData({...wizardData, [wizardStep]: c.find((m:any)=>m.id===mod.id) ? c.filter((m:any)=>m.id!==mod.id) : [...c, mod]});
                        }} className={`p-5 rounded-2xl border-2 text-sm md:text-base font-black transition-all ${(wizardData[wizardStep] || []).find((m:any) => m.id === mod.id) ? 'bg-red-500 text-white border-red-500 scale-[0.98]' : 'bg-zinc-900 border-zinc-700 hover:border-red-400/50 text-zinc-300'}`}>{mod.name}</button>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {(OPCIONES as any)[getProductSteps(activeProduct)[wizardStep].type].map((opt: string) => (
                    <button key={opt} onClick={() => setWizardData({...wizardData, [wizardStep]: [opt]})} className={`p-6 rounded-2xl border-2 font-black transition-all text-xl ${(wizardData[wizardStep] || []).includes(opt) ? 'bg-yellow-400 text-zinc-950 border-yellow-400 scale-[0.98] shadow-lg' : 'bg-zinc-900 border-zinc-700 hover:border-zinc-500 text-zinc-300'}`}>{opt}</button>
                  ))}
                </div>
              )}
            </div>

            <div className="p-8 border-t border-zinc-800 bg-zinc-900">
              <button onClick={handleNextOrFinish} disabled={getProductSteps(activeProduct)[wizardStep].type !== 'TOPPINGS' && !(wizardData[wizardStep] && wizardData[wizardStep].length > 0)} className="w-full bg-yellow-400 text-zinc-950 py-6 rounded-2xl font-black text-2xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-yellow-300 active:scale-[0.98] transition-transform">
                {wizardStep === getProductSteps(activeProduct).length - 1 ? 'Terminar y Agregar' : 'Siguiente Paso ➔'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
