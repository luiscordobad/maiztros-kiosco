'use client';
import { useState, useEffect } from 'react';
import { useCartStore } from '../store/cart';

// Opciones fijas para los selectores del wizard
const OPCIONES = {
  PAPAS: ['Doritos Nacho', 'Tostitos Salsa Verde', 'Tostitos Flamin Hot', 'Ruffles Queso', 'Cheetos Torciditos', 'Sabritas Sal'],
  MARUCHAN: ['Pollo', 'Res', 'Camarón con Limón', 'Camarón Piquín', 'Queso', 'Habanero'],
  BOING: ['Mango', 'Guayaba', 'Manzana', 'Fresa'],
  REFRESCO: ['Coca-Cola', 'Sprite', 'Fresca', 'Fanta', 'Sidral Mundet'],
  BEBIDA_ALL: ['Coca-Cola', 'Sprite', 'Fresca', 'Boing Mango', 'Boing Guayaba', 'Boing Fresa', 'Agua Natural']
};

export default function KioscoClient({ products, modifiers }: { products: any[], modifiers: any[] }) {
  const { cart, addToCart, removeFromCart, getTotal } = useCartStore();
  
  // Filtro de seguridad
  const visibleProducts = products.filter(p => !p.name.toLowerCase().includes('ramaiztro'));

  // Modificadores agrupados
  const polvos = modifiers.filter(m => m.type === 'POLVO');
  const aderezos = modifiers.filter(m => m.type === 'ADEREZO');
  const quesos = modifiers.filter(m => m.type === 'QUESO');
  const restricciones = modifiers.filter(m => m.type === 'RESTRICCION');
  const chiles = modifiers.filter(m => m.type === 'CHILE');

  // Estados de flujo
  const [appState, setAppState] = useState<'WELCOME' | 'MENU' | 'SUCCESS'>('WELCOME');
  const [orderType, setOrderType] = useState<'DINE_IN' | 'TAKEOUT'>('DINE_IN');
  
  // Estados del Wizard
  const [activeProduct, setActiveProduct] = useState<any>(null);
  const [wizardStep, setWizardStep] = useState(0);
  const [wizardData, setWizardData] = useState<any>({}); 

  // Estados del Checkout y Propinas
  const [customerName, setCustomerName] = useState('');
  const [orderSuccessId, setOrderSuccessId] = useState<any>(null);
  const [showTipModal, setShowTipModal] = useState(false);
  const [selectedTipMethod, setSelectedTipMethod] = useState<'TERMINAL' | 'EFECTIVO_CAJA' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estados Terminal
  const [waitingTerminal, setWaitingTerminal] = useState(false);
  const [terminalIntentId, setTerminalIntentId] = useState<string | null>(null);
  const [terminalStatusMsg, setTerminalStatusMsg] = useState('Conectando...');

  // --- AUTO-RESET ---
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    const resetApp = () => {
      if (appState !== 'WELCOME' && appState !== 'SUCCESS' && !waitingTerminal && !isSubmitting && !showTipModal) {
        useCartStore.setState({ cart: [] }); setCustomerName(''); setActiveProduct(null); setAppState('WELCOME');
      }
    };
    const resetTimer = () => { clearTimeout(timeoutId); timeoutId = setTimeout(resetApp, 120000); };
    window.addEventListener('click', resetTimer); window.addEventListener('touchstart', resetTimer);
    resetTimer();
    return () => { clearTimeout(timeoutId); window.removeEventListener('click', resetTimer); window.removeEventListener('touchstart', resetTimer); };
  }, [appState, waitingTerminal, isSubmitting, showTipModal]);

  // --- FLUJO DE PERSONALIZACIÓN POR PRODUCTO ---
  const getProductSteps = (p: any) => {
    const n = p.name.toLowerCase();
    
    // Bebidas Sencillas
    if(n.includes('boing')) return [{t: 'Sabor de Boing', type: 'BOING'}];
    if(n.includes('refresco')) return [{t: 'Sabor de Refresco', type: 'REFRESCO'}];
    
    // Combos Oficiales
    if(n.includes('combo individual')) return [{t: 'Personaliza tu Esquite', type: 'TOPPINGS'}, {t: 'Tu Bebida', type: 'BEBIDA_ALL'}];
    if(n.includes('combo pareja')) return [{t: 'Esquite 1', type: 'TOPPINGS'}, {t: 'Esquite 2', type: 'TOPPINGS'}, {t: 'Bebida 1', type: 'BEBIDA_ALL'}, {t: 'Bebida 2', type: 'BEBIDA_ALL'}];
    if(n.includes('combo familiar')) return [{t: 'Esq. Grande 1', type: 'TOPPINGS'}, {t: 'Esq. Grande 2', type: 'TOPPINGS'}, {t: 'Esq. Chico 1', type: 'TOPPINGS'}, {t: 'Esq. Chico 2', type: 'TOPPINGS'}, {t: 'Bebida 1', type: 'BEBIDA_ALL'}, {t: 'Bebida 2', type: 'BEBIDA_ALL'}, {t: 'Bebida 3', type: 'BEBIDA_ALL'}, {t: 'Bebida 4', type: 'BEBIDA_ALL'}];
    
    // Especialidades Oficiales
    if(n.includes('construpapas')) return [{t: 'Elige tu Bolsa de Papas', type: 'PAPAS'}, {t: 'Estilo de Esquite encima', type: 'TOPPINGS'}];
    if(n.includes('obra maestra')) return [{t: 'Sabor de Maruchan', type: 'MARUCHAN'}, {t: 'Estilo de Esquite encima', type: 'TOPPINGS'}];
    if(n.includes('don maiztro')) return [{t: 'Sabor de Maruchan', type: 'MARUCHAN'}, {t: 'Bolsa de Papas', type: 'PAPAS'}, {t: 'Estilo de Esquite encima', type: 'TOPPINGS'}];
    
    // Antojos Sueltos
    if(n.includes('bolsa de papas')) return [{t: 'Elige tus Papas', type: 'PAPAS'}];
    if(n.includes('maruchan preparada sola')) return [{t: 'Sabor de Maruchan', type: 'MARUCHAN'}];
    
    // Esquites Solos y Gomitas (Pica lo que quieras)
    if(p.category === 'ESQUITE' || n.includes('enchilados')) return [{t: 'Pica lo que quieras (Toppings)', type: 'TOPPINGS'}];
    
    return []; // Agua Natural
  };

  const handleProductClick = (product: any) => {
    const steps = getProductSteps(product);
    if (steps.length === 0) {
      addToCart(product, 0, product.name);
      return; 
    }
    setActiveProduct(product); setWizardStep(0); setWizardData({});
  };

  const handleNextOrFinish = () => {
    const activeSteps = getProductSteps(activeProduct);
    const isLastStep = wizardStep === activeSteps.length - 1;

    if (!isLastStep) { setWizardStep(prev => prev + 1); return; }

    let totalExtra = 0; let notesLines: string[] = [];

    activeSteps.forEach((step, index) => {
      const selections = wizardData[index] || [];
      if (selections.length === 0) return;
      if (step.type === 'TOPPINGS') {
        notesLines.push(`${step.t}: ${selections.map((s:any) => s.name).join(', ')}`);
      } else { 
        notesLines.push(`${step.t}: ${selections[0]}`); 
      }
    });

    addToCart(activeProduct, totalExtra, notesLines.join(' | '));
    setActiveProduct(null);
  };

  // --- LÓGICA DE COBRO Y TERMINAL ---
  const checkTerminalStatus = async (intentId: string, tipAmount: number) => {
    try {
      const res = await fetch(`/api/terminal?intentId=${intentId}`);
      const data = await res.json();
      const currentState = (data.state || '').toUpperCase();

      if (currentState === 'OPEN') setTerminalStatusMsg('💳 Esperando que pases la tarjeta...');
      if (currentState === 'PROCESSING') setTerminalStatusMsg('⏳ Procesando el pago...');

      if (currentState === 'FINISHED') {
        setTerminalStatusMsg('✅ ¡Pago aprobado! Imprimiendo recibo...');
        executeOrderSave('TERMINAL', tipAmount);
        return true; 
      }
      
      if (currentState === 'CANCELED' || currentState === 'ABANDONED') {
        alert('El cobro fue cancelado en la terminal física.');
        setWaitingTerminal(false); setTerminalIntentId(null); setIsSubmitting(false);
        return true;
      }
      return false; 
    } catch (e) {
      setTerminalStatusMsg('📡 Esperando señal...');
      return false;
    }
  };

  const executeOrderSave = async (paymentMethod: string, tipAmount: number) => {
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cart, totalAmount: getTotal(), tipAmount, customerName, paymentMethod, orderType })
      });
      const data = await response.json();
      if (response.ok) {
        setOrderSuccessId(data.orderId);
        useCartStore.setState({ cart: [] }); setCustomerName('');
        setWaitingTerminal(false); setTerminalIntentId(null); setShowTipModal(false);
        setAppState('SUCCESS');
        setTimeout(() => { setAppState('WELCOME'); setOrderSuccessId(null); }, 10000);
      }
    } catch (error) { alert("Error guardando orden en base de datos."); }
    setIsSubmitting(false);
  };

  const triggerTipModal = (paymentMethod: 'TERMINAL' | 'EFECTIVO_CAJA') => {
    if (!customerName) return alert("Ingresa tu nombre para tu ticket.");
    setSelectedTipMethod(paymentMethod); setShowTipModal(true);
  };

  const processFinalCheckout = async (tipAmount: number) => {
    setShowTipModal(false); setIsSubmitting(true);
    const finalTotal = getTotal() + tipAmount;

    if (selectedTipMethod === 'TERMINAL') {
      try {
        setTerminalStatusMsg('Buscando tu terminal...');
        const res = await fetch('/api/terminal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: finalTotal, description: 'Orden Maiztros' })
        });
        const data = await res.json();
        
        if (data.success) {
          setWaitingTerminal(true); setTerminalIntentId(data.intentId);
          setTerminalStatusMsg('💳 Esperando tarjeta en la terminal...');
          const interval = setInterval(async () => {
            const finished = await checkTerminalStatus(data.intentId, tipAmount);
            if (finished) clearInterval(interval);
          }, 3000);
        } else {
          alert(data.error || 'Error conectando con la terminal.'); setIsSubmitting(false);
        }
      } catch (e) {
        alert("Error de conexión con la nube de Mercado Pago."); setIsSubmitting(false);
      }
    } else {
      executeOrderSave(selectedTipMethod!, tipAmount);
    }
  };

  const renderProductGrid = (items: any[]) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map((product) => (
        <div key={product.id} onClick={() => handleProductClick(product)} className="bg-zinc-900 border border-zinc-800 rounded-[2rem] p-6 flex flex-col justify-between cursor-pointer hover:border-yellow-400/50 hover:bg-zinc-800 transition-all shadow-lg active:scale-95">
          <div>
            <h2 className="text-xl font-black mb-1 text-white">{product.name}</h2>
          </div>
          <div className="mt-4 flex items-center justify-between pt-4 border-t border-zinc-800/50">
            <p className="text-white text-2xl font-black">${product.basePrice.toFixed(2)}</p>
            <span className="text-yellow-400 font-bold text-sm bg-yellow-400/10 px-4 py-2 rounded-xl">Agregar ➔</span>
          </div>
        </div>
      ))}
    </div>
  );

  // --- PANTALLA INICIAL ---
  if (appState === 'WELCOME') {
    return (
      <div className="h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]">
        <h1 className="text-8xl md:text-[9rem] font-black text-yellow-400 tracking-tighter mb-4 shadow-black drop-shadow-2xl">MAIZTROS</h1>
        <p className="text-3xl font-bold text-zinc-300 mb-16 italic">¿Dónde disfrutarás tu antojo?</p>
        <div className="flex flex-col md:flex-row gap-8 w-full max-w-5xl">
          <button onClick={() => { setOrderType('DINE_IN'); setAppState('MENU'); }} className="flex-1 bg-yellow-400 hover:bg-yellow-300 text-zinc-950 h-80 rounded-[3rem] flex flex-col items-center justify-center gap-6 transition-transform hover:scale-105 active:scale-95 shadow-2xl">
            <span className="text-8xl">🍽️</span><span className="text-4xl font-black uppercase">Comer Aquí</span>
          </button>
          <button onClick={() => { setOrderType('TAKEOUT'); setAppState('MENU'); }} className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-white h-80 rounded-[3rem] flex flex-col items-center justify-center gap-6 transition-transform hover:scale-105 active:scale-95 border-2 border-zinc-700 shadow-2xl">
            <span className="text-8xl">🎒</span><span className="text-4xl font-black uppercase">Para Llevar</span>
          </button>
        </div>
      </div>
    );
  }

  // --- PANTALLA DE ÉXITO ---
  if (appState === 'SUCCESS') {
    return (
      <div className="h-screen bg-green-500 text-white flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-8xl font-black mb-6">¡ORDEN CONFIRMADA!</h1>
        <p className="text-4xl font-bold mb-12 opacity-90">{orderType === 'TAKEOUT' ? 'Empacando para llevar 🎒' : 'Preparando para comer aquí 🍽️'}</p>
        <div className="bg-white/20 p-16 rounded-[4rem] border-2 border-white/30 shadow-2xl backdrop-blur-md">
          <p className="text-2xl uppercase tracking-[0.3em] font-bold opacity-80 mb-6">Número de Turno</p>
          <p className="text-[10rem] leading-none font-black italic tracking-tighter drop-shadow-2xl">{orderSuccessId}</p>
        </div>
      </div>
    );
  }

  // --- PANTALLA DEL MENÚ ---
  return (
    <div className="flex flex-col min-h-screen bg-zinc-950 text-white font-sans relative pb-40">
      <header className="p-6 flex justify-between items-center bg-zinc-950 border-b border-zinc-800 sticky top-0 z-40">
        <h1 className="text-3xl font-black text-yellow-400 cursor-pointer" onClick={() => setAppState('WELCOME')}>MAIZTROS</h1>
        <div className="bg-zinc-900 px-6 py-2 rounded-full border border-zinc-700 font-bold text-zinc-300">
            {orderType === 'DINE_IN' ? '🍽️ Comer Aquí' : '🎒 Para Llevar'}
        </div>
      </header>

      <div className="p-6 max-w-7xl mx-auto w-full space-y-16">
        <section id="combos">
          <h2 className="text-4xl font-black mb-8 flex items-center gap-3"><span className="text-5xl">📦</span> Combos Maiztros</h2>
          {renderProductGrid(visibleProducts.filter(p => p.category === 'COMBO'))}
        </section>

        <section id="esquites">
          <h2 className="text-3xl font-black mb-6 text-zinc-400 uppercase tracking-widest flex items-center gap-3"><span className="text-4xl">🌽</span> Esquites</h2>
          {renderProductGrid(visibleProducts.filter(p => p.category === 'ESQUITE'))}
        </section>

        <section id="especialidades">
          <h2 className="text-3xl font-black mb-6 text-zinc-400 uppercase tracking-widest flex items-center gap-3"><span className="text-4xl">🔥</span> Especialidades</h2>
          {renderProductGrid(visibleProducts.filter(p => p.category === 'ESPECIALIDAD'))}
        </section>

        <section id="maruchans_solas">
          <h2 className="text-3xl font-black mb-6 text-orange-400 uppercase tracking-widest flex items-center gap-3"><span className="text-4xl">🍜</span> Maruchans Solas</h2>
          {renderProductGrid(visibleProducts.filter(p => p.category === 'MARUCHAN_SOLA'))}
        </section>

        <section id="papas_solas">
          <h2 className="text-3xl font-black mb-6 text-zinc-400 uppercase tracking-widest flex items-center gap-3"><span className="text-4xl">🥔</span> Papas Solas</h2>
          {renderProductGrid(visibleProducts.filter(p => p.category === 'PAPA_SOLA'))}
        </section>

        <section id="bebidas">
          <h2 className="text-3xl font-black mb-6 text-blue-400 uppercase tracking-widest flex items-center gap-3"><span className="text-4xl">🥤</span> Bebidas</h2>
          {renderProductGrid(visibleProducts.filter(p => p.category === 'BEBIDA'))}
        </section>

        <section id="antojos">
          <h2 className="text-3xl font-black mb-6 text-purple-400 uppercase tracking-widest flex items-center gap-3"><span className="text-4xl">🍬</span> Gomitas y Antojos</h2>
          {renderProductGrid(visibleProducts.filter(p => p.category === 'ANTOJO'))}
        </section>
      </div>

      {/* --- BARRA DEL CARRITO Y PAGO --- */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-6 bg-zinc-900 border-t border-zinc-800 z-40 flex justify-between items-center shadow-[0_-20px_50px_rgba(0,0,0,0.6)] backdrop-blur-sm">
          <div className="flex flex-col">
            <span className="text-zinc-400 font-black uppercase text-sm mb-1">Orden Actual ({cart.length})</span>
            <span className="text-5xl text-yellow-400 font-black">${getTotal().toFixed(2)}</span>
          </div>
          
          <div className="flex flex-col gap-2 items-end">
            <input type="text" placeholder="Nombre para Ticket *" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="bg-zinc-950 border border-zinc-700 p-4 rounded-xl text-white outline-none focus:border-yellow-400 w-60 font-bold text-lg"/>
            <div className="flex gap-4">
                <button onClick={() => triggerTipModal('EFECTIVO_CAJA')} disabled={isSubmitting} className="bg-green-600 text-white px-8 py-4 rounded-xl font-bold hover:bg-green-500 active:scale-95 transition-all text-lg">💵 Efectivo en Caja</button>
                <button onClick={() => triggerTipModal('TERMINAL')} disabled={isSubmitting} className="bg-blue-600 text-white px-8 py-4 rounded-xl font-bold hover:bg-blue-500 active:scale-95 transition-all text-lg">💳 Tarjeta (Smart 2)</button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL DE PROPINA --- */}
      {showTipModal && (
        <div className="fixed inset-0 bg-zinc-950/95 backdrop-blur-md flex flex-col justify-center items-center z-[60] p-8">
          <div className="bg-zinc-900 border border-zinc-800 rounded-[3rem] p-12 max-w-3xl w-full shadow-2xl text-center">
            <span className="text-[6rem] mb-6 block">🌽</span>
            <h2 className="text-5xl font-black text-white mb-4">¿Deseas apoyar al equipo?</h2>
            <p className="text-xl text-zinc-400 mb-10">Tu propina va directo a los Maiztros que preparan tu antojo.</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {[0.10, 0.15, 0.20].map((pct) => {
                const tipAmt = Math.round(getTotal() * pct);
                return (
                  <button key={pct} onClick={() => processFinalCheckout(tipAmt)} className="bg-zinc-800 hover:bg-yellow-400 hover:text-zinc-950 border border-zinc-700 p-6 rounded-2xl transition-all shadow-lg group">
                    <p className="text-3xl font-black mb-1">{pct * 100}%</p>
                    <p className="text-zinc-400 group-hover:text-zinc-800 font-bold">${tipAmt.toFixed(2)}</p>
                  </button>
                );
              })}
              <button onClick={() => processFinalCheckout(0)} className="bg-zinc-800/50 hover:bg-zinc-700 border border-zinc-700/50 p-6 rounded-2xl transition-all flex flex-col justify-center items-center text-zinc-400 hover:text-white">
                <p className="text-xl font-bold">Sin<br/>Propina</p>
              </button>
            </div>
            <button onClick={() => setShowTipModal(false)} className="text-zinc-500 font-bold underline hover:text-white">← Regresar</button>
          </div>
        </div>
      )}

      {/* --- MODAL TERMINAL --- */}
      {waitingTerminal && (
        <div className="fixed inset-0 bg-zinc-950/95 backdrop-blur-md flex flex-col justify-center items-center z-[70] text-center p-8">
          <span className="text-[10rem] animate-pulse mb-8">💳</span>
          <h2 className="text-6xl font-black text-yellow-400 mb-6">Terminal Lista</h2>
          <p className="text-3xl text-zinc-300 font-medium bg-zinc-900 px-8 py-4 rounded-full border border-zinc-700 shadow-xl">{terminalStatusMsg}</p>
        </div>
      )}

      {/* --- WIZARD PERSONALIZACIÓN --- */}
      {activeProduct && getProductSteps(activeProduct)[wizardStep] && (
        <div className="fixed inset-0 bg-black/95 flex justify-center items-center p-4 z-50 backdrop-blur-md">
          <div className="bg-zinc-950 border border-zinc-800 w-full max-w-4xl rounded-[3rem] flex flex-col shadow-2xl overflow-hidden h-[90vh]">
            <div className="p-8 border-b border-zinc-800 flex justify-between items-center bg-zinc-900 sticky top-0">
              <div>
                <p className="text-yellow-400 font-bold uppercase text-sm mb-2">Paso {wizardStep + 1} de {getProductSteps(activeProduct).length}</p>
                <h2 className="text-3xl font-black text-white">{getProductSteps(activeProduct)[wizardStep].t}</h2>
                <p className="text-zinc-500 font-bold">({activeProduct.name})</p>
              </div>
              <button onClick={() => setActiveProduct(null)} className="bg-zinc-800 text-zinc-400 h-16 w-16 rounded-full flex items-center justify-center text-3xl font-bold hover:text-white hover:bg-zinc-700">✕</button>
            </div>
            
            <div className="p-8 overflow-y-auto flex-1 space-y-10">
              {getProductSteps(activeProduct)[wizardStep].type === 'TOPPINGS' ? (
                <>
                  {/* SECCIÓN DE CHILES AGREGADA AQUÍ */}
                  {[ 
                    {t: '1. Elige tu Chile en Polvo', m: chiles}, 
                    {t: '2. Agrega Aderezos', m: aderezos}, 
                    {t: '3. Polvito de Papas', m: polvos}, 
                    {t: '4. Ponle Queso', m: quesos} 
                  ].map(sec => (
                    <div key={sec.t}>
                      <h3 className="text-lg font-black text-zinc-400 uppercase mb-4 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-yellow-400"></span>{sec.t}</h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {sec.m.map((mod:any) => (
                          <button key={mod.id} onClick={() => {
                            const c = wizardData[wizardStep] || [];
                            setWizardData({...wizardData, [wizardStep]: c.find((m:any)=>m.id===mod.id) ? c.filter((m:any)=>m.id!==mod.id) : [...c, mod]});
                          }} className={`p-5 rounded-2xl border-2 font-black transition-all text-lg ${(wizardData[wizardStep] || []).find((m:any) => m.id === mod.id) ? 'bg-yellow-400 text-zinc-950 border-yellow-400 scale-[0.98]' : 'bg-zinc-900 border-zinc-700 hover:border-zinc-500 text-zinc-300'}`}>{mod.name}</button>
                        ))}
                      </div>
                    </div>
                  ))}
                  <div>
                    <h3 className="text-lg font-black text-red-400 uppercase mb-4 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-red-400"></span>Restricciones (Sin...)</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {restricciones.map((mod:any) => (
                        <button key={mod.id} onClick={() => {
                          const c = wizardData[wizardStep] || [];
                          setWizardData({...wizardData, [wizardStep]: c.find((m:any)=>m.id===mod.id) ? c.filter((m:any)=>m.id!==mod.id) : [...c, mod]});
                        }} className={`p-5 rounded-2xl border-2 font-black transition-all text-lg ${(wizardData[wizardStep] || []).find((m:any) => m.id === mod.id) ? 'bg-red-500 text-white border-red-500 scale-[0.98]' : 'bg-zinc-900 border-zinc-700 hover:border-red-400/50 text-zinc-300'}`}>{mod.name}</button>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {(OPCIONES as any)[getProductSteps(activeProduct)[wizardStep].type].map((opt: string) => (
                    <button key={opt} onClick={() => setWizardData({...wizardData, [wizardStep]: [opt]})} className={`p-6 rounded-2xl border-2 font-black transition-all text-xl ${(wizardData[wizardStep] || []).includes(opt) ? 'bg-yellow-400 text-zinc-950 border-yellow-400 scale-[0.98]' : 'bg-zinc-900 border-zinc-700 hover:border-zinc-500 text-zinc-300'}`}>{opt}</button>
                  ))}
                </div>
              )}
            </div>

            <div className="p-8 border-t border-zinc-800 bg-zinc-900 sticky bottom-0">
              <button onClick={handleNextOrFinish} disabled={getProductSteps(activeProduct)[wizardStep].type !== 'TOPPINGS' && !(wizardData[wizardStep] && wizardData[wizardStep].length > 0)} className="w-full bg-yellow-400 text-zinc-950 py-6 rounded-2xl font-black text-2xl disabled:opacity-50 hover:bg-yellow-300 active:scale-[0.98] transition-all">
                {wizardStep === getProductSteps(activeProduct).length - 1 ? 'Terminar y Agregar' : 'Siguiente Paso ➔'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
