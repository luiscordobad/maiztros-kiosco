'use client';
import { useState, useEffect } from 'react';
import { useCartStore } from '../store/cart';

// OPCIONES ACTUALIZADAS AL INVENTARIO FÍSICO REAL
const OPCIONES = {
  PAPAS: ['Chips Fuego', 'Chips Jalapeño', 'Chips Sal', 'Doritos Nacho', 'Tostitos Morados', 'Cheetos Flamin Hot', 'Takis Fuego', 'Takis Original', 'Runners', 'Tostitos Verdes'],
  MARUCHAN: ['Pollo Picante', 'Carne de Res', 'Camarón, Limón y Habanero', 'Camarón y Piquín'],
  BOING: ['Boing Mango', 'Boing Guayaba', 'Boing Manzana', 'Boing Fresa'],
  REFRESCO: ['Coca Original', 'Coca Zero', 'Sprite', 'Manzanita', 'Agua Mineral'],
  BEBIDA_ALL: ['Coca Original', 'Coca Zero', 'Sprite', 'Manzanita', 'Agua Mineral', 'Boing Mango', 'Boing Guayaba', 'Boing Manzana', 'Boing Fresa', 'Agua Natural']
};

// LOS NIVELES DE RECOMPENSA OFICIALES DE MAIZTROS
const REWARDS = [
  { id: 'tier1', pts: 250, discount: 25, label: 'Premio Básico (-$25)' },
  { id: 'tier2', pts: 500, discount: 60, label: 'Premio Doble (-$60)' },
  { id: 'tier3', pts: 1000, discount: 150, label: 'Premio Leyenda (-$150)' }
];

export default function KioscoClient({ products, modifiers }: { products: any[], modifiers: any[] }) {
  const { cart, addToCart, removeFromCart, getTotal } = useCartStore();
  const visibleProducts = products.filter(p => !p.name.toLowerCase().includes('ramaiztro'));

  const polvos = modifiers.filter(m => m.type === 'POLVO');
  const aderezos = modifiers.filter(m => m.type === 'ADEREZO');
  const quesos = modifiers.filter(m => m.type === 'QUESO');
  const restricciones = modifiers.filter(m => m.type === 'RESTRICCION');
  const chiles = modifiers.filter(m => m.type === 'CHILE');

  const [appState, setAppState] = useState<'WELCOME' | 'MENU' | 'UPSELL' | 'CHECKOUT' | 'SUCCESS'>('WELCOME');
  const [upsellView, setUpsellView] = useState<'OPTIONS' | 'BEBIDAS' | 'GOMITAS'>('OPTIONS');
  const [orderType, setOrderType] = useState<'DINE_IN' | 'TAKEOUT'>('DINE_IN');
  const [activeProduct, setActiveProduct] = useState<any>(null);
  const [wizardStep, setWizardStep] = useState(0);
  const [wizardData, setWizardData] = useState<any>({}); 

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccessId, setOrderSuccessId] = useState<any>(null);
  
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [orderNotes, setOrderNotes] = useState('');

  // LEALTAD GAMIFICADA
  const [loyaltyPoints, setLoyaltyPoints] = useState(0);
  const [selectedReward, setSelectedReward] = useState<{id: string, pts: number, discount: number, label: string} | null>(null);
  const [isCheckingPoints, setIsCheckingPoints] = useState(false);
  
  // CUPONES
  const [couponCode, setCouponCode] = useState('');
  const [activeCoupon, setActiveCoupon] = useState<any>(null);
  const [couponError, setCouponError] = useState('');

  const [lastPaymentMethod, setLastPaymentMethod] = useState<'TERMINAL' | 'EFECTIVO_CAJA' | null>(null);
  const [showTipModal, setShowTipModal] = useState(false);
  const [selectedTipMethod, setSelectedTipMethod] = useState<'TERMINAL' | 'EFECTIVO_CAJA' | null>(null);

  const [waitingTerminal, setWaitingTerminal] = useState(false);
  const [terminalIntentId, setTerminalIntentId] = useState<string | null>(null);
  const [terminalStatusMsg, setTerminalStatusMsg] = useState('Conectando con la terminal...');

  // 1. Efecto: Buscar puntos por teléfono
  useEffect(() => {
    if (customerPhone.length === 10) {
      setIsCheckingPoints(true);
      fetch(`/api/customer?phone=${customerPhone}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setLoyaltyPoints(data.points);
            if(data.name && !customerName) setCustomerName(data.name); 
          }
          setIsCheckingPoints(false);
        });
    } else {
      setLoyaltyPoints(0); setSelectedReward(null);
    }
  }, [customerPhone]);

  // 2. Efecto: Reset de inactividad
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    const resetApp = () => {
      if (appState !== 'WELCOME' && appState !== 'SUCCESS' && !waitingTerminal && !isSubmitting && !showTipModal) {
        useCartStore.setState({ cart: [] });
        setCustomerName(''); setCustomerEmail(''); setCustomerPhone(''); setOrderNotes('');
        setLoyaltyPoints(0); setSelectedReward(null); setActiveCoupon(null); setCouponCode(''); setCouponError('');
        setActiveProduct(null); setLastPaymentMethod(null); setSelectedTipMethod(null);
        setAppState('WELCOME');
      }
    };
    const resetTimer = () => { clearTimeout(timeoutId); timeoutId = setTimeout(resetApp, 120000); };
    window.addEventListener('click', resetTimer); window.addEventListener('touchstart', resetTimer);
    window.addEventListener('mousemove', resetTimer); window.addEventListener('scroll', resetTimer);
    resetTimer(); 
    return () => { clearTimeout(timeoutId); window.removeEventListener('click', resetTimer); window.removeEventListener('touchstart', resetTimer); window.removeEventListener('mousemove', resetTimer); window.removeEventListener('scroll', resetTimer); };
  }, [appState, waitingTerminal, isSubmitting, showTipModal]);

  // MATEMÁTICAS BÁSICAS
  const subtotal = getTotal();

  // 3. Efecto: Quitar el cupón automáticamente si el usuario elimina cosas del carrito y ya no llega al mínimo
  useEffect(() => {
    if (activeCoupon && activeCoupon.minAmount > 0 && subtotal < activeCoupon.minAmount) {
      setActiveCoupon(null);
      setCouponError(`El cupón requiere mínimo de compra de $${activeCoupon.minAmount}`);
    }
  }, [subtotal, activeCoupon]);

  const handleApplyCoupon = async () => {
    setCouponError('');
    if (!couponCode) return;
    const res = await fetch(`/api/customer?code=${couponCode}`);
    const data = await res.json();
    
    if (data.success) { 
      // VERIFICACIÓN DEL MONTO MÍNIMO
      if (data.coupon.minAmount > 0 && subtotal < data.coupon.minAmount) {
        setCouponError(`Compra mínima de $${data.coupon.minAmount} requerida.`);
        setActiveCoupon(null);
      } else {
        setActiveCoupon(data.coupon); 
        setSelectedReward(null); // Apagamos recompensas si se usa un cupón
      }
    } 
    else { 
      setActiveCoupon(null); 
      setCouponError(data.error); 
    }
  };

  // MATEMÁTICAS APLICADAS
  let totalAfterCoupon = subtotal;
  if (activeCoupon) {
    if (activeCoupon.discountType === 'FIXED') totalAfterCoupon = Math.max(0, subtotal - activeCoupon.discount);
    if (activeCoupon.discountType === 'PERCENTAGE') totalAfterCoupon = subtotal - (subtotal * (activeCoupon.discount / 100));
  }

  const actualDiscount = selectedReward && !activeCoupon ? Math.min(selectedReward.discount, totalAfterCoupon) : 0;
  const totalNeto = totalAfterCoupon - actualDiscount;
  const pointsToEarn = Math.floor(totalNeto);

  const getProductDesc = (name: string) => {
    if(name.includes('Individual')) return "Esquite Mediano + 1 Bebida";
    if(name.includes('Pareja')) return "2 Esquites (Toppings full) + 2 Bebidas";
    if(name.includes('Familiar')) return "2 Gdes + 2 Chicos (Toppings full) + 4 Bebidas";
    if(name === 'Construpapas') return "Tus papas con esquite encima";
    if(name === 'Obra Maestra') return "Maruchan con nuestro esquite";
    if(name === 'Don Maiztro') return "Maruchan + Papas + Esquite (1er topping gratis)";
    return "";
  };

  const getProductSteps = (p: any) => {
    const n = p.name.toLowerCase();
    if(n.includes('boing')) return [{t: 'Sabor de Boing', type: 'BOING'}];
    if(n.includes('refresco')) return [{t: 'Sabor de Refresco', type: 'REFRESCO'}];
    if(n.includes('individual')) return [{t: 'Esquite Mediano', type: 'TOPPINGS'}, {t: 'Tu Bebida', type: 'BEBIDA_ALL'}];
    if(n.includes('pareja')) return [{t: 'Esquite 1', type: 'TOPPINGS', isFree: true}, {t: 'Esquite 2', type: 'TOPPINGS', isFree: true}, {t: 'Bebida 1', type: 'BEBIDA_ALL'}, {t: 'Bebida 2', type: 'BEBIDA_ALL'}];
    if(n.includes('familiar')) return [{t: 'Esq. Grande 1', type: 'TOPPINGS', isFree: true}, {t: 'Esq. Grande 2', type: 'TOPPINGS', isFree: true}, {t: 'Esq. Chico 1', type: 'TOPPINGS', isFree: true}, {t: 'Esq. Chico 2', type: 'TOPPINGS', isFree: true}, {t: 'Bebida 1', type: 'BEBIDA_ALL'}, {t: 'Bebida 2', type: 'BEBIDA_ALL'}, {t: 'Bebida 3', type: 'BEBIDA_ALL'}, {t: 'Bebida 4', type: 'BEBIDA_ALL'}];
    if(n.includes('construpapas')) return [{t: 'Bolsa de Papas', type: 'PAPAS'}, {t: 'Estilo de Esquite', type: 'TOPPINGS'}];
    if(n.includes('don maiztro')) return [{t: 'Sabor de Maruchan', type: 'MARUCHAN'}, {t: 'Bolsa de Papas', type: 'PAPAS'}, {t: 'Estilo de Esquite', type: 'TOPPINGS'}];
    if(n.includes('bolsa de papas')) return [{t: 'Elige tus Papas', type: 'PAPAS'}];
    if(n.includes('maruchan preparada sola')) return [{t: 'Sabor de Maruchan', type: 'MARUCHAN'}];
    if(n.includes('obra maestra')) return [{t: 'Sabor de Maruchan', type: 'MARUCHAN'}, {t: 'Estilo de Esquite', type: 'TOPPINGS'}];
    if(p.category === 'ANTOJO' || n === 'agua natural') return [];
    return [{t: 'Personaliza tu antojo', type: 'TOPPINGS'}];
  };

  const handleStartOrder = (type: 'DINE_IN' | 'TAKEOUT') => { setOrderType(type); setAppState('MENU'); window.scrollTo(0,0); };
  
  const handleProductClick = (product: any) => {
    const steps = getProductSteps(product);
    if (steps.length === 0) { addToCart(product, 0, product.name); if (appState === 'UPSELL') setAppState('MENU'); return; }
    setActiveProduct(product); setWizardStep(0); setWizardData({}); if (appState === 'UPSELL') setAppState('MENU');
  };

  const handleToggleModifier = (mod: any) => {
    const currentSelections = wizardData[wizardStep] || [];
    const isSelected = currentSelections.find((m: any) => m.id === mod.id);
    let newSelections = [];
    if (isSelected) newSelections = currentSelections.filter((m: any) => m.id !== mod.id);
    else {
      newSelections = [...currentSelections, mod];
      if (mod.type === 'CHILE') newSelections = newSelections.filter((m: any) => !m.name.toLowerCase().includes('sin chilito') && !m.name.toLowerCase().includes('sin chile'));
      if (mod.name.toLowerCase().includes('sin chilito') || mod.name.toLowerCase().includes('sin chile')) newSelections = newSelections.filter((m: any) => m.type !== 'CHILE');
    }
    setWizardData({...wizardData, [wizardStep]: newSelections});
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
        const paidCount = selections.filter((s:any) => s.type === 'QUESO' || s.type === 'ADEREZO' || s.type === 'POLVO').length;
        let baseCount = paidCount;
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
    const wasDrinkOrAntojoOrCombo = activeProduct.category === 'BEBIDA' || activeProduct.category === 'ANTOJO' || activeProduct.category === 'COMBO';
    setActiveProduct(null);
    if (appState === 'MENU' && !wasDrinkOrAntojoOrCombo) { setUpsellView('OPTIONS'); setAppState('UPSELL'); }
  };

  const checkTerminalStatus = async (intentId: string, tipAmount: number) => {
    try {
      const res = await fetch(`/api/terminal?intentId=${intentId}`);
      const data = await res.json();
      const currentState = (data.state || '').toUpperCase();
      if (currentState === 'OPEN') setTerminalStatusMsg('💳 Esperando que pases la tarjeta...');
      if (currentState === 'PROCESSING') setTerminalStatusMsg('⏳ Procesando el pago...');
      if (currentState === 'FINISHED') { setTerminalStatusMsg('✅ ¡Pago aprobado! Imprimiendo recibo...'); executeOrderSave('TERMINAL', tipAmount); return true; }
      if (currentState === 'CANCELED' || currentState === 'ABANDONED') { alert('El cobro fue cancelado en la terminal física.'); setWaitingTerminal(false); setTerminalIntentId(null); setIsSubmitting(false); return true; }
      return false; 
    } catch (e) { return false; }
  };

  const executeOrderSave = async (paymentMethod: string, tipAmount: number) => {
    try {
      setLastPaymentMethod(paymentMethod as 'TERMINAL' | 'EFECTIVO_CAJA');
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          cart, 
          totalAmount: totalNeto, 
          pointsDiscount: actualDiscount, 
          pointsDeducted: selectedReward?.pts || 0, 
          couponCode: activeCoupon?.code || null, 
          tipAmount, 
          customerName, 
          customerEmail, 
          customerPhone, 
          paymentMethod, 
          orderType, 
          orderNotes 
        })
      });
      const data = await response.json();
      if (response.ok) {
        setOrderSuccessId(data.orderId);
        useCartStore.setState({ cart: [] });
        setCustomerName(''); setCustomerEmail(''); setCustomerPhone(''); setOrderNotes('');
        setLoyaltyPoints(0); setSelectedReward(null); setActiveCoupon(null); setCouponCode('');
        setWaitingTerminal(false); setTerminalIntentId(null); setShowTipModal(false);
        setAppState('SUCCESS');
        setTimeout(() => { setAppState('WELCOME'); setOrderSuccessId(null); setLastPaymentMethod(null); setSelectedTipMethod(null); }, paymentMethod === 'EFECTIVO_CAJA' ? 15000 : 10000);
      }
    } catch (error) { alert("Error guardando orden."); }
    setIsSubmitting(false);
  };

  const triggerTipModal = (paymentMethod: 'TERMINAL' | 'EFECTIVO_CAJA') => {
    if (!customerName) return alert("Por favor ingresa tu nombre para el ticket.");
    if (selectedReward && totalAfterCoupon < selectedReward.discount) return alert(`Tu compra es menor a $${selectedReward.discount}. Guarda tus puntos para una orden más grande.`);
    if (totalNeto <= 0 && paymentMethod === 'TERMINAL') return alert("Tu orden es GRATIS con tus puntos. Pica 'Pagar en Caja' para registrarla.");
    setSelectedTipMethod(paymentMethod); setShowTipModal(true);
  };

  const processFinalCheckout = async (tipAmount: number) => {
    setShowTipModal(false); setIsSubmitting(true);
    const finalTotal = totalNeto + tipAmount;
    if (selectedTipMethod === 'TERMINAL' && finalTotal > 0) {
      try {
        setTerminalStatusMsg('Conectando Terminal...');
        const res = await fetch('/api/terminal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: finalTotal, description: 'Orden Maiztros' }) });
        const data = await res.json();
        if (data.success) {
          setWaitingTerminal(true); setTerminalIntentId(data.intentId);
          const interval = setInterval(async () => { const finished = await checkTerminalStatus(data.intentId, tipAmount); if (finished) clearInterval(interval); }, 3000);
        } else { alert('Error terminal'); setIsSubmitting(false); }
      } catch (e) { alert("Error de conexión"); setIsSubmitting(false); }
    } else { executeOrderSave(selectedTipMethod!, tipAmount); }
  };

  const renderProductGrid = (items: any[]) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map((product) => (
        <div key={product.id} onClick={() => handleProductClick(product)} className="bg-zinc-900 border border-zinc-800 rounded-[2rem] p-6 flex flex-col justify-between cursor-pointer hover:border-yellow-400/50 hover:bg-zinc-800 transition-all shadow-lg active:scale-95">
          <div>
            <h2 className="text-xl font-black mb-1">{product.name}</h2>
            {getProductDesc(product.name) && <p className="text-zinc-500 text-xs mb-4">{getProductDesc(product.name)}</p>}
          </div>
          <div className="mt-4 flex items-center justify-between pt-4 border-t border-zinc-800/50">
            <p className="text-white text-2xl font-black">${product.basePrice.toFixed(2)}</p>
            <span className="text-yellow-400 font-bold text-sm bg-yellow-400/10 px-4 py-2 rounded-xl">Agregar ➔</span>
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
            <span className="text-8xl">🍽️</span><span className="text-4xl font-black uppercase">Comer Aquí</span>
          </button>
          <button onClick={() => handleStartOrder('TAKEOUT')} className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-white h-80 rounded-[3rem] flex flex-col items-center justify-center gap-6 transition-transform hover:scale-105 active:scale-95 border-2 border-zinc-700 shadow-2xl">
            <span className="text-8xl">🎒</span><span className="text-4xl font-black uppercase">Para Llevar</span>
          </button>
        </div>
      </div>
    );
  }

  if (appState === 'SUCCESS') {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://maiztros.vercel.app';
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(`${baseUrl}/ticket/${orderSuccessId}`)}&bgcolor=FFFFFF`;

    return (
      <div className={`h-screen ${lastPaymentMethod === 'EFECTIVO_CAJA' ? 'bg-orange-600' : 'bg-green-500'} text-white flex flex-col items-center justify-center p-6 text-center`}>
        <h1 className="text-7xl md:text-8xl font-black mb-4">{lastPaymentMethod === 'EFECTIVO_CAJA' ? '¡FALTA UN PASO!' : '¡ORDEN CONFIRMADA!'}</h1>
        <p className="text-3xl font-bold mb-8 opacity-90">{lastPaymentMethod === 'EFECTIVO_CAJA' ? 'Pasa a la caja para pagar en efectivo 💵' : (orderType === 'TAKEOUT' ? 'Empacando para llevar 🎒' : 'Preparando para comer aquí 🍽️')}</p>
        <div className="flex flex-col md:flex-row gap-8 items-center bg-white/20 p-12 rounded-[4rem] border-2 border-white/30 shadow-2xl backdrop-blur-md">
          <div className="text-center">
            <p className="text-xl uppercase tracking-[0.3em] font-bold opacity-80 mb-2">Número de Turno</p>
            <p className="text-[8rem] leading-none font-black italic tracking-tighter drop-shadow-2xl">#{orderSuccessId?.slice(-4).toUpperCase()}</p>
          </div>
          <div className="hidden md:block w-1 bg-white/30 h-40 mx-4"></div>
          <div className="flex flex-col items-center mt-6 md:mt-0">
            <p className="text-sm font-bold uppercase tracking-widest mb-4 bg-black/20 px-4 py-2 rounded-full">📱 Escanea para tu Localizador Digital</p>
            <img src={qrUrl} alt="QR Ticket" className="w-40 h-40 rounded-2xl shadow-lg border-4 border-white" />
          </div>
        </div>
      </div>
    );
  }

  if (appState === 'CHECKOUT') {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col lg:flex-row p-6 md:p-12 gap-8 text-white relative">
        
        {/* RESUMEN DE ORDEN Y CÁLCULO NETO */}
        <div className="flex-1 bg-zinc-900 rounded-[3rem] p-8 md:p-12 flex flex-col border border-zinc-800 shadow-2xl">
          <h2 className="text-4xl font-black mb-8 border-b border-zinc-800 pb-6 text-yellow-400">Resumen de Orden</h2>
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
            <div className="mt-8">
              <label className="text-zinc-500 font-bold uppercase tracking-widest text-sm mb-2 block">Comentarios para la cocina</label>
              <textarea placeholder="Ej. El esquite mediano bien doradito..." value={orderNotes} onChange={(e) => setOrderNotes(e.target.value)} className="w-full bg-zinc-950 border border-zinc-700 p-5 rounded-2xl focus:border-yellow-400 outline-none text-lg font-medium resize-none h-32"/>
            </div>
          </div>
          
          <div className="mt-8 pt-8 border-t border-zinc-800 flex flex-col items-end">
            <div className="flex justify-between w-full mb-4 text-zinc-400 font-bold text-xl"><p>Subtotal:</p><p>${subtotal.toFixed(2)}</p></div>
            {activeCoupon && <div className="flex justify-between w-full mb-4 text-purple-400 font-bold text-xl"><p>Cupón ({activeCoupon.code}):</p><p>-${(subtotal - totalAfterCoupon).toFixed(2)}</p></div>}
            {selectedReward && !activeCoupon && <div className="flex justify-between w-full mb-4 text-green-400 font-bold text-xl"><p>Premio de Lealtad:</p><p>-${actualDiscount.toFixed(2)}</p></div>}
            <div className="text-right mt-4 border-t border-zinc-800 pt-4 w-full">
              <p className="text-zinc-500 text-xl font-bold uppercase tracking-widest mb-1">Total a Pagar</p>
              <p className="text-7xl text-yellow-400 font-black tracking-tighter">${totalNeto.toFixed(2)}</p>
            </div>
            <button onClick={() => setAppState('MENU')} className="text-zinc-500 mt-6 font-bold hover:text-white self-start">← Agregar más</button>
          </div>
        </div>

        {/* COLUMNA DERECHA: LEALTAD SÚPER LLAMATIVA Y PAGOS */}
        <div className="w-full lg:w-[450px] flex flex-col gap-6">
          
          <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 rounded-[3rem] p-8 border-2 border-yellow-400 shadow-[0_0_30px_rgba(250,204,21,0.15)] relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-yellow-400 text-zinc-950 font-black px-4 py-1 rounded-bl-2xl text-sm">⭐ MaiztroPuntos</div>
            
            {customerPhone.length < 10 ? (
              <div className="mb-6 animate-in fade-in zoom-in duration-500">
                <h3 className="text-2xl font-black text-white mb-1">¡No pierdas tus puntos!</h3>
                <p className="text-yellow-400 font-bold text-sm mb-4">Ingresa tu celular y gana <span className="bg-yellow-400/20 px-2 py-1 rounded-md text-yellow-300 text-lg border border-yellow-400/50">{pointsToEarn} pts</span> con esta orden.</p>
              </div>
            ) : (
              <div className="mb-6 animate-in fade-in duration-500">
                <h3 className="text-xl font-black text-white mb-1">Hola, {customerName || 'Maiztro'} 👋</h3>
                <p className="text-zinc-300 font-medium text-sm mb-4">Tienes <span className="text-yellow-400 font-black text-xl">{Math.floor(loyaltyPoints)} pts</span>. (+{pointsToEarn} hoy)</p>
              </div>
            )}

            <div className="space-y-4 relative z-10">
              <div className="relative">
                <input type="tel" placeholder="Celular (10 dígitos)" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} maxLength={10} className="w-full bg-zinc-950/80 border border-yellow-500/50 p-5 rounded-2xl focus:border-yellow-400 outline-none text-2xl text-center font-black text-white placeholder:text-zinc-600 tracking-widest shadow-inner"/>
                {isCheckingPoints && <span className="absolute right-4 top-6 text-yellow-500 animate-spin">⏳</span>}
              </div>

              {/* LISTA DE PREMIOS GAMIFICADA */}
              <div className="mt-6 border-t border-yellow-500/30 pt-6">
                <p className="text-center text-xs font-bold text-yellow-500/80 mb-3 uppercase tracking-widest">Tus Recompensas</p>
                <div className="space-y-2">
                  {REWARDS.map(reward => {
                    const isAffordable = loyaltyPoints >= reward.pts;
                    const isSelected = selectedReward?.id === reward.id;
                    return (
                      <button 
                        key={reward.id} 
                        disabled={!isAffordable || customerPhone.length < 10} 
                        onClick={() => setSelectedReward(isSelected ? null : reward)} 
                        className={`w-full p-3 rounded-xl border-2 text-left flex justify-between items-center transition-all 
                          ${customerPhone.length < 10 ? 'opacity-40 bg-zinc-950/50 border-zinc-800' : 
                            !isAffordable ? 'opacity-50 cursor-not-allowed border-zinc-800 bg-zinc-950/80' : 
                            isSelected ? 'bg-yellow-400 border-yellow-400 text-zinc-950 shadow-[0_0_15px_rgba(250,204,21,0.4)]' : 
                            'bg-zinc-900 border-yellow-500/30 hover:border-yellow-400 text-white'}`}
                      >
                        <div>
                          <p className="font-black">{reward.label}</p>
                          <p className={`text-[10px] font-bold uppercase tracking-widest ${isSelected ? 'text-zinc-800' : 'text-zinc-500'}`}>
                            {isAffordable ? `Cuesta ${reward.pts} pts` : `Faltan ${reward.pts - Math.floor(loyaltyPoints)} pts`}
                          </p>
                        </div>
                        <span className="text-xl">
                          {isSelected ? '✅' : (!isAffordable || customerPhone.length < 10) ? '🔒' : '🎁'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-zinc-900 rounded-[3rem] p-8 border border-zinc-800 shadow-2xl flex-1 flex flex-col">
            <div className="space-y-4 mb-6 border-b border-zinc-800 pb-6">
              <input type="text" placeholder="Tu Nombre para el ticket *" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="w-full bg-zinc-950 border border-zinc-700 p-4 rounded-xl focus:border-yellow-400 outline-none font-bold"/>
              
              <div className="flex gap-2">
                <input type="text" placeholder="Cupón (Opcional)" value={couponCode} onChange={(e) => setCouponCode(e.target.value)} className="w-full bg-zinc-950 border border-zinc-700 p-3 rounded-xl focus:border-purple-400 outline-none uppercase font-bold text-center tracking-widest text-sm"/>
                <button onClick={handleApplyCoupon} className="bg-purple-600 hover:bg-purple-500 transition-colors text-white px-4 rounded-xl font-black text-sm">Aplicar</button>
              </div>
              {couponError && <p className="text-red-400 text-xs font-bold text-center">{couponError}</p>}
              {activeCoupon && <p className="text-purple-400 text-xs font-bold text-center">✅ Cupón aplicado</p>}
            </div>

            <h3 className="text-xl font-black mb-4 uppercase tracking-widest text-zinc-500 text-center">Forma de Pago</h3>
            <div className="flex-1 flex flex-col gap-3 justify-center">
              <button onClick={() => triggerTipModal('TERMINAL')} disabled={isSubmitting || cart.length===0} className="bg-blue-500 hover:bg-blue-400 text-white py-5 rounded-2xl font-black text-xl shadow-xl active:scale-95 transition-all">💳 Tarjeta</button>
              <button onClick={() => triggerTipModal('EFECTIVO_CAJA')} disabled={isSubmitting || cart.length===0} className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-white py-5 rounded-2xl font-black text-xl shadow-xl active:scale-95 transition-all">💵 Efectivo / Caja</button>
            </div>
          </div>
        </div>

        {/* ... MODALES ... */}
        {waitingTerminal && (
          <div className="fixed inset-0 bg-zinc-950/95 backdrop-blur-md flex flex-col justify-center items-center z-[60] text-center p-8">
            <span className="text-[10rem] animate-pulse mb-8">💳</span>
            <h2 className="text-6xl font-black text-yellow-400 mb-6">Terminal Lista</h2>
            <p className="text-3xl text-zinc-300 font-medium bg-zinc-900 px-8 py-4 rounded-full border border-zinc-700 shadow-xl">{terminalStatusMsg}</p>
            <div className="mt-16 w-32 h-32 border-8 border-zinc-800 border-t-yellow-400 rounded-full animate-spin"></div>
          </div>
        )}

        {showTipModal && (
          <div className="fixed inset-0 bg-zinc-950/95 backdrop-blur-md flex flex-col justify-center items-center z-[60] p-8">
            <div className="bg-zinc-900 border border-zinc-800 rounded-[3rem] p-12 max-w-3xl w-full shadow-2xl text-center">
              <span className="text-[6rem] mb-6 block">🌽</span>
              <h2 className="text-5xl font-black text-white mb-4">¿Deseas apoyar al equipo?</h2>
              <p className="text-xl text-zinc-400 mb-10">Tu propina va directo a los Maiztros que preparan tu antojo.</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {[0.10, 0.15, 0.20].map((pct) => {
                  const tipAmt = Math.round(totalNeto * pct);
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
      </div>
    );
  }

  // RENDERIZADO DEL MENÚ PRINCIPAL
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
        <section id="seccion-combos">
          <h2 className="text-4xl font-black mb-8 flex items-center gap-3"><span className="text-5xl">📦</span> Combos Maiztros</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {visibleProducts.filter(p => p.category === 'COMBO').map((product) => (
              <div key={product.id} onClick={() => handleProductClick(product)} className="bg-gradient-to-br from-yellow-500 to-orange-500 border-4 border-yellow-300 rounded-[3rem] p-8 text-zinc-950 shadow-[0_0_40px_rgba(250,204,21,0.3)] transform hover:scale-[1.03] transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between min-h-[300px]">
                <div className="absolute -right-4 -top-4 opacity-20 text-[10rem]">🌽</div>
                <div className="relative z-10">
                  <h2 className="text-4xl font-black mb-3 leading-none">{product.name}</h2>
                  <p className="text-zinc-900 font-bold text-lg leading-relaxed">{getProductDesc(product.name)}</p>
                </div>
                <div className="mt-8 flex items-center justify-between relative z-10 bg-zinc-950/10 p-4 rounded-2xl backdrop-blur-sm border border-zinc-950/10">
                  <p className="text-zinc-950 text-4xl font-black">${product.basePrice.toFixed(2)}</p>
                  <span className="bg-zinc-950 text-yellow-400 h-14 w-14 rounded-full flex items-center justify-center text-3xl font-black shadow-lg">＋</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="seccion-esquites">
          <h2 className="text-3xl font-black mb-6 text-zinc-400 uppercase tracking-widest border-b border-zinc-800 pb-4 flex items-center gap-3"><span className="text-4xl">🌽</span> Esquites</h2>
          {renderProductGrid(visibleProducts.filter(p => p.category === 'ESQUITE'))}
        </section>

        <section id="seccion-especialidades">
          <h2 className="text-3xl font-black mb-6 text-zinc-400 uppercase tracking-widest border-b border-zinc-800 pb-4 flex items-center gap-3"><span className="text-4xl">🔥</span> Especialidades</h2>
          {renderProductGrid(visibleProducts.filter(p => p.category === 'ESPECIALIDAD'))}
        </section>

        <section id="seccion-bebidas">
          <h2 className="text-3xl font-black mb-6 text-blue-400 uppercase tracking-widest border-b border-zinc-800 pb-4 flex items-center gap-3"><span className="text-4xl">🥤</span> Bebidas</h2>
          {renderProductGrid(visibleProducts.filter(p => p.category === 'BEBIDA'))}
        </section>

        <section id="seccion-otros">
          <h2 className="text-3xl font-black mb-6 text-purple-400 uppercase tracking-widest border-b border-zinc-800 pb-4 flex items-center gap-3"><span className="text-4xl">🍬</span> Otros Antojos</h2>
          {renderProductGrid(visibleProducts.filter(p => p.category === 'ANTOJO' || p.category === 'PAPA_SOLA' || p.category === 'MARUCHAN_SOLA'))}
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

      {appState === 'UPSELL' && (
        <div className="fixed inset-0 bg-zinc-950 flex flex-col z-40 overflow-y-auto animate-in slide-in-from-bottom duration-300">
          <div className="p-8 md:p-12 max-w-7xl mx-auto w-full pb-40">
            <h2 className="text-6xl md:text-7xl font-black text-white mb-4 text-center">¡Hazlo un festín!</h2>
            <p className="text-2xl text-zinc-400 mb-16 text-center font-medium">Agrega bebidas y antojitos a tu orden. Pica lo que quieras.</p>
            
            <h3 className="text-3xl font-black mb-8 text-blue-400 uppercase tracking-widest border-b border-zinc-800 pb-4">🥤 Bebidas Frías</h3>
            {renderProductGrid(visibleProducts.filter(p => p.category === 'BEBIDA'))}

            <h3 className="text-3xl font-black mt-16 mb-8 text-purple-400 uppercase tracking-widest border-b border-zinc-800 pb-4">🍬 Antojitos y Gomitas</h3>
            {renderProductGrid(visibleProducts.filter(p => p.category === 'ANTOJO' && (p.name.toLowerCase().includes('gomita') || p.name.toLowerCase().includes('panda') || p.name.toLowerCase().includes('mango') || p.name.toLowerCase().includes('dulce'))))}
          </div>

          <div className="fixed bottom-0 left-0 right-0 p-6 md:p-8 bg-zinc-900/95 backdrop-blur-xl border-t border-zinc-800 z-50 flex justify-center shadow-[0_-20px_50px_rgba(0,0,0,0.6)]">
             <button onClick={() => setAppState('CHECKOUT')} className="bg-yellow-400 text-zinc-950 px-20 py-6 rounded-[2rem] font-black text-2xl hover:bg-yellow-300 shadow-xl active:scale-95 transition-all flex items-center gap-4 w-full max-w-2xl justify-center">
              Continuar al Pago <span className="text-3xl">➔</span>
            </button>
          </div>
        </div>
      )}

      {activeProduct && getProductSteps(activeProduct)[wizardStep] && (
        <div className="fixed inset-0 bg-black/95 flex justify-center items-center p-4 z-50 backdrop-blur-md">
          <div className="bg-zinc-950 border border-zinc-800 w-full max-w-4xl rounded-[3rem] flex flex-col shadow-2xl overflow-hidden h-[90vh] md:h-auto md:max-h-[90vh]">
            <div className="p-8 border-b border-zinc-800 flex justify-between items-center bg-zinc-900 sticky top-0">
              <div>
                <p className="text-yellow-400 font-bold tracking-widest uppercase text-sm mb-2">Paso {wizardStep + 1} de {getProductSteps(activeProduct).length}</p>
                <h2 className="text-3xl font-black text-white">{getProductSteps(activeProduct)[wizardStep].t}</h2>
              </div>
              <button onClick={() => setActiveProduct(null)} className="bg-zinc-800 text-zinc-400 h-16 w-16 rounded-full flex items-center justify-center text-3xl font-bold hover:text-white hover:bg-zinc-700 transition-colors">✕</button>
            </div>
            
            <div className="p-8 overflow-y-auto flex-1 space-y-10">
              {getProductSteps(activeProduct)[wizardStep].type === 'TOPPINGS' ? (
                <>
                  {[ 
                    {t: '1. Aderezos Extras', m: aderezos}, 
                    {t: '2. Ponle Queso', m: quesos}, 
                    {t: '3. Polvito de Papas', m: polvos}, 
                    {t: '4. Chile (Pica o no pica)', m: chiles} 
                  ].map(sec => (
                    <div key={sec.t}>
                      <h3 className="text-lg font-black text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-yellow-400"></span>{sec.t}</h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {sec.m.map((mod:any) => (
                          <button key={mod.id} onClick={() => handleToggleModifier(mod)} className={`p-5 rounded-2xl border-2 text-sm md:text-base font-black transition-all ${(wizardData[wizardStep] || []).find((m:any) => m.id === mod.id) ? 'bg-yellow-400 text-zinc-950 border-yellow-400 scale-[0.98]' : 'bg-zinc-900 border-zinc-700 hover:border-zinc-500 text-zinc-300'}`}>{mod.name}</button>
                        ))}
                      </div>
                    </div>
                  ))}
                  <div>
                    <h3 className="text-lg font-black text-red-400 uppercase tracking-widest mb-4 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-red-400"></span>Restricciones (Sin...)</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {restricciones.map((mod:any) => (
                        <button key={mod.id} onClick={() => handleToggleModifier(mod)} className={`p-5 rounded-2xl border-2 text-sm md:text-base font-black transition-all ${(wizardData[wizardStep] || []).find((m:any) => m.id === mod.id) ? 'bg-red-500 text-white border-red-500 scale-[0.98]' : 'bg-zinc-900 border-zinc-700 hover:border-red-400/50 text-zinc-300'}`}>{mod.name}</button>
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

            <div className="p-8 border-t border-zinc-800 bg-zinc-900 sticky bottom-0">
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
