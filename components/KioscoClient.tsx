'use client';
import { useState } from 'react';
import { useCartStore } from '../store/cart';

const OPCIONES = {
  PAPAS: ['Doritos Nacho', 'Doritos Incógnita', 'Tostitos Salsa Verde', 'Tostitos Flamin Hot', 'Cheetos Torciditos', 'Ruffles Queso'],
  MARUCHAN: ['Pollo', 'Res', 'Camarón con Limón', 'Camarón Piquín', 'Queso', 'Habanero'],
  BOING: ['Mango', 'Guayaba', 'Manzana', 'Fresa'],
  REFRESCO: ['Coca-Cola', 'Coca Light', 'Coca Sin Azúcar', 'Sprite', 'Fresca', 'Fanta', 'Sidral Mundet'],
  BEBIDA_ALL: ['Coca-Cola', 'Sprite', 'Fresca', 'Fanta', 'Boing Mango', 'Boing Guayaba', 'Boing Manzana', 'Boing Fresa', 'Agua Natural']
};

export default function KioscoClient({ products, modifiers }: { products: any[], modifiers: any[] }) {
  const { cart, addToCart, removeFromCart, getTotal } = useCartStore();
  const visibleProducts = products.filter(p => p.name.toLowerCase() !== 'ramaiztro');

  const polvos = modifiers.filter(m => m.type === 'POLVO');
  const aderezos = modifiers.filter(m => m.type === 'ADEREZO');
  const quesos = modifiers.filter(m => m.type === 'QUESO');
  const restricciones = modifiers.filter(m => m.type === 'RESTRICCION');

  const [activeProduct, setActiveProduct] = useState<any>(null);
  const [wizardStep, setWizardStep] = useState(0);
  const [wizardData, setWizardData] = useState<any>({}); 
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  
  // Nuevos datos del cliente
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');

  const getProductDesc = (name: string) => {
    if(name.includes('Individual')) return "Esquite Mediano + 1 Bebida a elegir.";
    if(name.includes('Pareja')) return "2 Esquites (Toppings ilimitados) + 2 Bebidas.";
    if(name.includes('Familiar')) return "2 Grandes + 2 Chicos (Toppings ilimitados) + 4 Bebidas.";
    if(name === 'Construpapas') return "Tus papas favoritas con esquite encima.";
    if(name === 'Obra Maestra') return "Maruchan con nuestro esquite.";
    if(name === 'Don Maiztro') return "Maruchan + Papas + Esquite (1er topping gratis).";
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

  const activeSteps = activeProduct ? getProductSteps(activeProduct) : [];
  const currentStep = activeSteps[wizardStep];
  const isLastStep = wizardStep === activeSteps.length - 1;

  const handleProductClick = (product: any) => {
    if (product.name.toLowerCase() === 'agua natural') {
      addToCart(product, 0, 'Agua Natural');
      return;
    }
    setActiveProduct(product);
    setWizardStep(0);
    setWizardData({});
  };

  const toggleTopping = (mod: any) => {
    const current = wizardData[wizardStep] || [];
    const exists = current.find((m:any) => m.id === mod.id);
    const next = exists ? current.filter((m:any) => m.id !== mod.id) : [...current, mod];
    setWizardData({ ...wizardData, [wizardStep]: next });
  };

  const setSingleChoice = (choiceStr: string) => {
    setWizardData({ ...wizardData, [wizardStep]: [choiceStr] });
  };

  const canProceed = () => {
    if (currentStep?.type === 'TOPPINGS') return true; 
    return (wizardData[wizardStep] && wizardData[wizardStep].length > 0); 
  };

  const handleNextOrFinish = () => {
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
      } else {
        notesLines.push(`${step.t}: ${selections[0]}`);
      }
    });

    addToCart(activeProduct, totalExtra, notesLines.join(' | '));
    setActiveProduct(null);
  };

  const handleCheckout = async (paymentMethod: string) => {
    if (!customerName || !customerPhone) return alert("Por favor, ingresa tu Nombre y WhatsApp para enviarte tu ticket.");
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cart, totalAmount: getTotal(), customerName, customerPhone, customerEmail, paymentMethod })
      });
      const data = await response.json();
      if (response.ok) {
        setOrderSuccess(data.orderId);
        useCartStore.setState({ cart: [] });
        setCustomerName(''); setCustomerPhone(''); setCustomerEmail(''); setShowForm(false);
        setTimeout(() => setOrderSuccess(null), 8000);
      }
    } catch (error) { alert("Error al procesar la orden."); }
    setIsSubmitting(false);
  };

  if (orderSuccess) {
    return (
      <div className="min-h-screen bg-green-600 text-white flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-7xl font-black mb-4">¡Orden Confirmada!</h1>
        <p className="text-3xl font-bold mb-2 uppercase">{customerName || 'Cliente'}</p>
        <p className="text-xl mb-10 opacity-90 text-zinc-100 italic">Te enviamos tu ticket digital a tu celular.</p>
        <div className="bg-white/10 p-8 rounded-3xl border border-white/20">
          <p className="text-sm uppercase tracking-widest opacity-70 mb-2">Tu turno es el:</p>
          <p className="text-8xl font-black italic tracking-tighter">#{orderSuccess.slice(-4).toUpperCase()}</p>
        </div>
        <p className="mt-8 text-2xl font-bold text-yellow-300 animate-pulse">
          Pasa a recoger tu pedido cuando llamemos tu nombre.
        </p>
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
          {visibleProducts.map((product) => (
            <div key={product.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col justify-between hover:border-yellow-400/50 transition-colors">
              <div>
                <span className="inline-block px-3 py-1 bg-zinc-800 text-zinc-300 text-xs font-bold uppercase tracking-wider rounded-full mb-3">{product.category}</span>
                <h2 className="text-2xl font-bold mb-1">{product.name}</h2>
                <p className="text-zinc-500 text-sm leading-snug">{getProductDesc(product.name)}</p>
              </div>
              <div className="mt-6 flex items-center justify-between">
                <p className="text-yellow-400 text-2xl font-black">${product.basePrice.toFixed(2)}</p>
                <button onClick={() => handleProductClick(product)} className="bg-yellow-400 text-zinc-950 px-4 py-2 rounded-xl font-bold active:scale-95 transition-all">
                  {product.name.toLowerCase() === 'agua natural' ? 'Agregar' : 'Configurar'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="w-full lg:w-[450px] bg-zinc-900 border-l border-zinc-800 p-6 flex flex-col h-screen">
        <h2 className="text-3xl font-black text-white mb-6 italic">Tu Orden</h2>
        <div className="flex-1 overflow-y-auto space-y-4">
          {cart.length === 0 ? <p className="text-zinc-500 text-center mt-20">El carrito está vacío</p> : 
            cart.map((item) => (
              <div key={item.id} className="bg-zinc-800 p-4 rounded-xl border border-zinc-700 flex justify-between">
                <div className="flex-1">
                  <p className="font-bold text-lg leading-none">{item.product.name}</p>
                  {item.notes && <p className="text-xs text-zinc-400 mt-2 leading-tight whitespace-pre-wrap">{item.notes.split(' | ').join('\n')}</p>}
                  <p className="text-yellow-400 font-bold mt-2">${item.totalPrice.toFixed(2)}</p>
                </div>
                <button onClick={() => removeFromCart(item.id)} className="text-zinc-500 hover:text-red-400 ml-4 font-bold text-xl">✕</button>
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
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="space-y-2">
                <input type="text" placeholder="Tu Nombre" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 p-3 rounded-xl focus:border-yellow-400 outline-none"/>
                <input type="tel" placeholder="WhatsApp (Para tu ticket)" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 p-3 rounded-xl focus:border-yellow-400 outline-none"/>
                <input type="email" placeholder="Correo (Opcional)" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 p-3 rounded-xl focus:border-yellow-400 outline-none"/>
              </div>
              
              <div className="grid grid-cols-1 gap-2 pt-2">
                <p className="text-zinc-500 text-xs text-center uppercase tracking-widest font-bold mb-1">Elige cómo pagar</p>
                
                {/* Botón Mercado Pago Terminal */}
                <button onClick={() => handleCheckout('TERMINAL')} disabled={isSubmitting} className="w-full bg-blue-500 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-600 transition-colors">
                  💳 Tarjeta en Terminal
                </button>
                
                {/* Botón Mercado Pago QR */}
                <button onClick={() => handleCheckout('QR_ONLINE')} disabled={isSubmitting} className="w-full bg-[#009EE3] text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#0089C5] transition-colors">
                  📱 Código QR / App
                </button>
                
                {/* Botón Efectivo en Caja */}
                <button onClick={() => handleCheckout('EFECTIVO_CAJA')} disabled={isSubmitting} className="w-full bg-zinc-800 border border-zinc-600 text-white py-3 rounded-xl font-bold flex items-center justify-center hover:bg-zinc-700 transition-colors">
                  💵 Efectivo en Caja
                </button>

                <button onClick={() => setShowForm(false)} className="mt-2 text-zinc-500 text-sm hover:text-white transition-colors">← Volver al carrito</button>
              </div>
            </div>
          ) : (
            <button disabled={cart.length === 0} onClick={() => setShowForm(true)} className="w-full bg-yellow-400 text-zinc-950 py-4 rounded-xl font-black text-xl disabled:opacity-50">Siguiente ➔</button>
          )}
        </div>
      </div>

      {/* --- WIZARD MULTI-PASO (Se mantiene intacto) --- */}
      {activeProduct && currentStep && (
        <div className="fixed inset-0 bg-black/80 flex justify-center items-center p-4 z-50">
          <div className="bg-zinc-900 border border-zinc-700 w-full max-w-2xl rounded-2xl flex flex-col shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
              <div>
                <h2 className="text-2xl font-black text-yellow-400 uppercase italic">
                  Paso {wizardStep + 1} de {activeSteps.length}: <span className="text-white">{currentStep.t}</span>
                </h2>
                {currentStep.type === 'TOPPINGS' && !currentStep.isFree && activeProduct.name !== 'Don Maiztro' && (
                  <p className="text-zinc-400 text-sm mt-1 uppercase tracking-widest">+1: $15 | +2: $25 | Ilimitados: $35</p>
                )}
                {currentStep.isFree && <p className="text-green-400 text-sm mt-1 uppercase tracking-widest">Toppings Ilimitados Gratis</p>}
                {activeProduct.name === 'Don Maiztro' && currentStep.type === 'TOPPINGS' && <p className="text-green-400 text-sm mt-1 uppercase tracking-widest">1er Topping Gratis</p>}
              </div>
              <button onClick={() => setActiveProduct(null)} className="text-zinc-500 text-3xl font-bold hover:text-white">✕</button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh] space-y-6">
              {currentStep.type === 'TOPPINGS' && (
                <>
                  {[ {t: 'Polvito de Papas', m: polvos}, {t: 'Aderezos', m: aderezos}, {t: 'Quesos', m: quesos} ].map(sec => (
                    <div key={sec.t}>
                      <h3 className="text-sm font-black text-zinc-500 uppercase tracking-widest mb-3">{sec.t}</h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {sec.m.map((mod:any) => (
                          <button key={mod.id} onClick={() => toggleTopping(mod)} className={`p-3 rounded-xl border text-sm font-bold transition-all ${(wizardData[wizardStep] || []).find((m:any) => m.id === mod.id) ? 'bg-yellow-400 text-zinc-950 border-yellow-400' : 'bg-zinc-800 border-zinc-700 hover:border-zinc-500'}`}>{mod.name}</button>
                        ))}
                      </div>
                    </div>
                  ))}
                  <div>
                    <h3 className="text-sm font-black text-red-400/70 uppercase tracking-widest mb-3">Restricciones (Gratis)</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {restricciones.map((mod:any) => (
                        <button key={mod.id} onClick={() => toggleTopping(mod)} className={`p-3 rounded-xl border text-sm font-bold transition-all ${(wizardData[wizardStep] || []).find((m:any) => m.id === mod.id) ? 'bg-red-500 text-white border-red-500' : 'bg-zinc-800 border-zinc-700 hover:border-red-400/30'}`}>{mod.name}</button>
                      ))}
                    </div>
                  </div>
                </>
              )}
              {['PAPAS', 'MARUCHAN', 'BOING', 'REFRESCO', 'BEBIDA_ALL'].includes(currentStep.type) && (
                <div className="grid grid-cols-2 gap-3">
                  {(OPCIONES as any)[currentStep.type].map((opt: string) => (
                    <button key={opt} onClick={() => setSingleChoice(opt)} className={`p-4 rounded-xl border font-bold transition-all text-lg ${(wizardData[wizardStep] || []).includes(opt) ? 'bg-yellow-400 text-zinc-950 border-yellow-400' : 'bg-zinc-800 border-zinc-700 hover:border-zinc-500'}`}>{opt}</button>
                  ))}
                </div>
              )}
            </div>
            <div className="p-6 border-t border-zinc-800 bg-zinc-950">
              <button onClick={handleNextOrFinish} disabled={!canProceed()} className="w-full bg-yellow-400 text-zinc-950 py-4 rounded-xl font-black text-xl disabled:opacity-50 disabled:cursor-not-allowed">
                {isLastStep ? 'Añadir al Carrito' : 'Siguiente Paso ➔'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
