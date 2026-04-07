// @ts-nocheck
/* eslint-disable */
'use client';
import { useState, useEffect } from 'react';
import { useCartStore } from '../store/cart';

const OPCIONES = {
  PAPAS: ['Chips Fuego', 'Chips Jalapeño', 'Chips Sal', 'Doritos Nacho', 'Tostitos Morados', 'Cheetos Flamin Hot', 'Takis Fuego', 'Takis Original', 'Runners', 'Tostitos Verdes'],
  MARUCHAN: ['Pollo Picante', 'Carne de Res', 'Camarón, Limón y Habanero', 'Camarón y Piquín'],
  BOING: ['Boing Mango', 'Boing Guayaba', 'Boing Manzana', 'Boing Fresa'],
  REFRESCO: ['Coca Original', 'Coca Zero', 'Sprite', 'Manzanita', 'Agua Mineral'],
  BEBIDA_ALL: ['Coca Original', 'Coca Zero', 'Sprite', 'Manzanita', 'Agua Mineral', 'Boing Mango', 'Boing Guayaba', 'Boing Manzana', 'Boing Fresa', 'Agua Natural'],
  ESPECIALIDAD_CHOICE: ['Construpapas', 'Obra Maestra'],
  PAPAS_MARUCHAN: ['Chips Fuego', 'Chips Jalapeño', 'Chips Sal', 'Doritos Nacho', 'Tostitos Morados', 'Cheetos Flamin Hot', 'Takis Fuego', 'Takis Original', 'Runners', 'Tostitos Verdes', 'Pollo Picante', 'Carne de Res', 'Camarón, Limón y Habanero', 'Camarón y Piquín']
};

const REWARDS = [
  { id: 'tier1', pts: 250, minSpend: 150, discount: 15, label: 'Bono de $15 MXN' },
  { id: 'tier2', pts: 500, minSpend: 250, discount: 35, label: 'Bono de $35 MXN' },
  { id: 'tier3', pts: 1000, minSpend: 400, discount: 80, label: 'Bono de $80 MXN' }
];

export default function KioscoClient({ products, modifiers }: { products: any[], modifiers: any[] }) {
  const { cart, addToCart, removeFromCart, getTotal } = useCartStore();
  
  const visibleProducts = products.filter(p => !p.name.toLowerCase().includes('ramaiztro') && p.isAvailable);

  const polvos = modifiers.filter(m => m.type === 'POLVO' && m.isAvailable);
  const aderezos = modifiers.filter(m => m.type === 'ADEREZO' && m.isAvailable);
  const quesos = modifiers.filter(m => m.type === 'QUESO' && m.isAvailable);
  const restricciones = modifiers.filter(m => m.type === 'RESTRICCION' && m.isAvailable);
  const chiles = modifiers.filter(m => m.type === 'CHILE' && m.isAvailable);

  const [appState, setAppState] = useState<'WELCOME' | 'MENU' | 'UPSELL' | 'CHECKOUT' | 'SUCCESS'>('WELCOME');
  const [orderType, setOrderType] = useState<'DINE_IN' | 'TAKEOUT'>('DINE_IN');
  
  const [activeProduct, setActiveProduct] = useState<any>(null);
  const [wizardStep, setWizardStep] = useState(0);
  const [wizardData, setWizardData] = useState<any>({}); 

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccessId, setOrderSuccessId] = useState<any>(null);
  
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [orderNotes, setOrderNotes] = useState('');

  const [loyaltyPoints, setLoyaltyPoints] = useState(0);
  const [selectedReward, setSelectedReward] = useState<{id: string, pts: number, minSpend: number, discount: number, label: string} | null>(null);
  const [isCheckingPoints, setIsCheckingPoints] = useState(false);
  
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [regData, setRegData] = useState({ firstName: '', lastName: '', email: '', acceptedTerms: false });
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showCookies, setShowCookies] = useState(false);

  const [couponCode, setCouponCode] = useState('');
  const [activeCoupon, setActiveCoupon] = useState<any>(null);
  const [couponError, setCouponError] = useState('');

  const [lastPaymentMethod, setLastPaymentMethod] = useState<'TERMINAL' | 'EFECTIVO_CAJA' | null>(null);
  const [showTipModal, setShowTipModal] = useState(false);
  const [selectedTipMethod, setSelectedTipMethod] = useState<'TERMINAL' | 'EFECTIVO_CAJA' | null>(null);

  const [waitingTerminal, setWaitingTerminal] = useState(false);
  const [terminalStatusMsg, setTerminalStatusMsg] = useState('Conectando con la terminal...');

  const [inventoryItems, setInventoryItems] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/admin?action=kiosco_sync')
      .then(res => res.json())
      .then(data => { if(data.success) setInventoryItems(data.inventoryItems); });
  }, [appState]);

  useEffect(() => {
    if (customerPhone.length === 10) {
      setIsCheckingPoints(true);
      fetch(`/api/customer?phone=${customerPhone}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setLoyaltyPoints(data.points);
            if(data.name && !customerName) setCustomerName(data.name); 
            setIsNewCustomer(false);
          } else {
            setLoyaltyPoints(0);
            setSelectedReward(null);
            setActiveCoupon(null);
            setIsNewCustomer(true);
          }
          setIsCheckingPoints(false);
        });
    } else {
      setLoyaltyPoints(0); 
      setSelectedReward(null); 
      setActiveCoupon(null);
      setIsNewCustomer(false);
    }
  }, [customerPhone]);

  const handleRegisterInKiosk = async () => {
    if (!regData.firstName || !regData.lastName || !regData.email) return alert('Por favor, llena tu nombre, apellido y correo.');
    if (!regData.acceptedTerms) return alert('Debes aceptar las políticas de privacidad para crear tu cuenta.');

    setIsRegistering(true);
    try {
        const res = await fetch('/api/customer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: customerPhone, ...regData })
        });
        const data = await res.json();
        if (data.success) {
            setCustomerName(data.customer.name);
            setLoyaltyPoints(data.customer.points);
            setIsNewCustomer(false); 
        } else { alert('Error al registrar cuenta. Intenta pedir como invitado borrando tu celular.'); }
    } catch(e) { alert('Error de red. Revisa tu conexión.'); }
    setIsRegistering(false);
  };

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    const resetApp = () => {
      if (appState !== 'WELCOME' && appState !== 'SUCCESS' && !waitingTerminal && !isSubmitting && !showTipModal && !showPrivacy && !showCookies) {
        useCartStore.setState({ cart: [] });
        setCustomerName(''); setCustomerPhone(''); setOrderNotes('');
        setLoyaltyPoints(0); setSelectedReward(null); setActiveCoupon(null); setCouponCode(''); setCouponError('');
        setActiveProduct(null); setLastPaymentMethod(null); setSelectedTipMethod(null);
        setIsNewCustomer(false); setRegData({ firstName: '', lastName: '', email: '', acceptedTerms: false });
        setAppState('WELCOME');
      }
    };
    const resetTimer = () => { clearTimeout(timeoutId); timeoutId = setTimeout(resetApp, 120000); };
    window.addEventListener('click', resetTimer); window.addEventListener('touchstart', resetTimer);
    window.addEventListener('mousemove', resetTimer); window.addEventListener('scroll', resetTimer);
    resetTimer(); 
    return () => { clearTimeout(timeoutId); window.removeEventListener('click', resetTimer); window.removeEventListener('touchstart', resetTimer); window.removeEventListener('mousemove', resetTimer); window.removeEventListener('scroll', resetTimer); };
  }, [appState, waitingTerminal, isSubmitting, showTipModal, showPrivacy, showCookies]);

  const subtotal = getTotal();

  useEffect(() => {
    if (activeCoupon && activeCoupon.minAmount > 0 && subtotal < activeCoupon.minAmount) {
      setActiveCoupon(null);
      setCouponError(`El cupón requiere mínimo de compra de $${activeCoupon.minAmount}`);
    }
    if (selectedReward && subtotal < selectedReward.minSpend) {
        setSelectedReward(null);
    }
  }, [subtotal, activeCoupon, selectedReward]);

  const handleApplyCoupon = async () => {
    setCouponError('');
    if (!couponCode) return;

    if (customerPhone.length !== 10 || isNewCustomer) {
      setCouponError('⚠️ Debes ingresar y registrar tu celular arriba para poder usar cupones.');
      return;
    }

    const res = await fetch(`/api/customer?phone=${customerPhone}`);
    const data = await res.json();
    
    if (data.success && data.activeCoupons) { 
      const coupon = data.activeCoupons.find((c:any) => c.code === couponCode.toUpperCase());
      if (!coupon) {
        setCouponError('❌ Cupón inválido o expirado.');
        return;
      }

      const alreadyUsed = data.history.some((o:any) => o.couponCode === coupon.code);
      if (alreadyUsed && coupon.code !== 'MAIZTROVIP') { 
        setCouponError('⚠️ Ya utilizaste este cupón antes. Son de un solo uso.');
        return;
      }

      if (coupon.minAmount > 0 && subtotal < coupon.minAmount) {
        setCouponError(`⚠️ Compra mínima de $${coupon.minAmount} requerida.`);
        setActiveCoupon(null);
      } else {
        setActiveCoupon(coupon); 
        setSelectedReward(null); 
      }
    } else {
      setCouponError('❌ Error al validar tu cuenta.');
    }
  };

  let totalAfterCoupon = subtotal;
  if (activeCoupon) {
    if (activeCoupon.discountType === 'FIXED') totalAfterCoupon = Math.max(0, subtotal - activeCoupon.discount);
    if (activeCoupon.discountType === 'PERCENTAGE') totalAfterCoupon = subtotal - (subtotal * (activeCoupon.discount / 100));
  }

  const actualDiscount = selectedReward && !activeCoupon ? Math.min(selectedReward.discount, totalAfterCoupon) : 0;
  const totalNeto = totalAfterCoupon - actualDiscount;
  const pointsToEarn = Math.floor(totalNeto);

  const getProductDesc = (name: string) => {
    const n = name.toLowerCase();
    if(n.includes('solitario') || n.includes('individual')) return "1 Esq. Mediano + 1 Bebida Fría";
    if(n.includes('dúo') || n.includes('pareja')) return "2 Esq. Medianos + 2 Bebidas (1er Topping Gratis)";
    if(n.includes('tribu') || n.includes('familiar')) return "2 Gdes + 2 Chicos + 4 Bebidas (1er Topping Gratis)";
    if(n.includes('especialista') || n.includes('especialidad')) return "Construpapas u Obra Maestra a elegir + 1 Bebida";
    if(n === 'construpapas') return "Tus papas con esquite encima";
    if(n === 'obra maestra') return "Maruchan con nuestro esquite";
    if(n === 'don maiztro') return "Maruchan + Papas + Esquite (1er topping gratis)";
    return "";
  };

  const getProductSteps = (p: any) => {
    const n = p.name.toLowerCase();
    if(n.includes('solitario') || n.includes('individual')) return [{t: 'Esquite Mediano', type: 'TOPPINGS'}, {t: 'Tu Bebida', type: 'BEBIDA_ALL'}];
    if(n.includes('dúo') || n.includes('pareja')) return [{t: 'Esquite Mediano 1', type: 'TOPPINGS', firstToppingFree: true}, {t: 'Esquite Mediano 2', type: 'TOPPINGS', firstToppingFree: true}, {t: 'Bebida 1', type: 'BEBIDA_ALL'}, {t: 'Bebida 2', type: 'BEBIDA_ALL'}];
    if(n.includes('tribu') || n.includes('familiar')) return [{t: 'Esq. Grande 1', type: 'TOPPINGS', firstToppingFree: true}, {t: 'Esq. Grande 2', type: 'TOPPINGS', firstToppingFree: true}, {t: 'Esq. Chico 1', type: 'TOPPINGS', firstToppingFree: true}, {t: 'Esq. Chico 2', type: 'TOPPINGS', firstToppingFree: true}, {t: 'Bebida 1', type: 'BEBIDA_ALL'}, {t: 'Bebida 2', type: 'BEBIDA_ALL'}, {t: 'Bebida 3', type: 'BEBIDA_ALL'}, {t: 'Bebida 4', type: 'BEBIDA_ALL'}];
    if(n.includes('especialista') || n.includes('especialidad')) return [{t: 'Elige tu Especialidad', type: 'ESPECIALIDAD_CHOICE'}, {t: 'Tu Sabor', type: 'PAPAS_MARUCHAN'}, {t: 'Toppings', type: 'TOPPINGS'}, {t: 'Tu Bebida', type: 'BEBIDA_ALL'}];
    if(n.includes('boing')) return [{t: 'Sabor de Boing', type: 'BOING'}];
    if(n.includes('refresco')) return [{t: 'Sabor de Refresco', type: 'REFRESCO'}];
    if(n.includes('construpapas')) return [{t: 'Bolsa de Papas', type: 'PAPAS'}, {t: 'Estilo de Esquite', type: 'TOPPINGS'}];
    if(n.includes('don maiztro')) return [{t: 'Sabor de Maruchan', type: 'MARUCHAN'}, {t: 'Bolsa de Papas', type: 'PAPAS'}, {t: 'Estilo de Esquite', type: 'TOPPINGS', firstToppingFree: true}]; 
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
    activeSteps.forEach((step: any, index: number) => {
      const selections = wizardData[index] || [];
      if (selections.length === 0) return;
      
      if (step.type === 'TOPPINGS') {
        const paidCount = selections.filter((s:any) => s.type === 'QUESO' || s.type === 'ADEREZO' || s.type === 'POLVO').length;
        let baseCount = paidCount;
        
        if (step.firstToppingFree && baseCount > 0) { baseCount -= 1; }
        
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
    const wasDrinkOrAntojoOrCombo = activeProduct.category === 'BEBIDA' || activeProduct.category === 'ANTOJO' || activeProduct.category === 'COMBO';
    setActiveProduct(null);
    if (appState === 'MENU' && !wasDrinkOrAntojoOrCombo) { setAppState('UPSELL'); }
  };

  const checkTerminalStatus = async (intentId: string, tipAmount: number) => {
    try {
      const res = await fetch(`/api/terminal?intentId=${intentId}`);
      const data = await res.json();
      const currentState = (data.state || '').toUpperCase();
      if (currentState === 'OPEN') setTerminalStatusMsg('💳 Esperando que pases la tarjeta...');
      if (currentState === 'PROCESSING') setTerminalStatusMsg('⏳ Procesando el pago...');
      if (currentState === 'FINISHED') { setTerminalStatusMsg('✅ ¡Pago aprobado! Imprimiendo recibo...'); executeOrderSave('TERMINAL', tipAmount); return true; }
      if (currentState === 'CANCELED' || currentState === 'ABANDONED') { alert('El cobro fue cancelado en la terminal física.'); setWaitingTerminal(false); setIsSubmitting(false); return true; }
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
          cart, totalAmount: totalNeto, pointsDiscount: actualDiscount, pointsDeducted: selectedReward?.pts || 0, 
          couponCode: activeCoupon?.code || null, tipAmount, customerName, customerEmail: regData.email, customerPhone, paymentMethod, orderType, orderNotes 
        })
      });
      const data = await response.json();
      if (response.ok) {
        setOrderSuccessId(data.orderId);
        useCartStore.setState({ cart: [] });
        setCustomerName(''); setCustomerPhone(''); setOrderNotes('');
        setLoyaltyPoints(0); setSelectedReward(null); setActiveCoupon(null); setCouponCode('');
        setIsNewCustomer(false); setRegData({ firstName: '', lastName: '', email: '', acceptedTerms: false });
        setWaitingTerminal(false); setShowTipModal(false);
        setAppState('SUCCESS');
        setTimeout(() => { setAppState('WELCOME'); setOrderSuccessId(null); setLastPaymentMethod(null); setSelectedTipMethod(null); }, paymentMethod === 'EFECTIVO_CAJA' ? 15000 : 10000);
      }
    } catch (error) { alert("Error guardando orden."); }
    setIsSubmitting(false);
  };

  const triggerTipModal = (paymentMethod: 'TERMINAL' | 'EFECTIVO_CAJA') => {
    if (!customerName) return alert("Por favor ingresa un nombre para tu ticket.");
    if (totalNeto <= 0 && paymentMethod === 'TERMINAL') return alert("Tu orden es GRATIS con tus descuentos. Pica 'Pago en Caja' para registrarla.");
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
          setWaitingTerminal(true);
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

  const isOptionAvailable = (optName: string) => {
    const invItem = inventoryItems.find(i => i.name.toLowerCase() === optName.toLowerCase());
    if (invItem) return invItem.isAvailable && invItem.stock > 0;
    const prodItem = products.find(p => p.name.toLowerCase() === optName.toLowerCase());
    if (prodItem) return prodItem.isAvailable;
    return true; 
  };

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
        <div className="flex-1 bg-zinc-900 rounded-[3rem] p-8 md:p-12 flex flex-col border border-zinc-800 shadow-2xl">
          <h2 className="text-4xl font-black mb-8 border-b border-zinc-800 pb-6 text-yellow-400">Resumen de Orden</h2>
          <div className="flex-1 overflow-y-auto space-y-4 pr-4">
            {cart.map((item) => (
              <div key={item.id} className="bg-zinc-950 border border-zinc-800 p-6 rounded-3xl flex justify-between items-start">
                <div className="flex-1">
                  <p className="font-black text-2xl">{item.product.name}</p>
                  {item.notes && <p className="text-zinc-500 text-sm mt-3 font-medium leading-relaxed whitespace-pre-wrap">{item.notes.split(' | ').join('\n')}</p>}
                  
                  <div className="flex flex-wrap gap-2 mt-5">
                    <button onClick={() => addToCart(item.product, item.totalPrice - item.product.basePrice, item.notes)} className="text-green-400 bg-green-400/10 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-green-400 hover:text-zinc-950 transition-colors flex items-center gap-2">
                        <span>➕</span> Duplicar
                    </button>
                    <button onClick={() => removeFromCart(item.id)} className="text-red-400 bg-red-400/10 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-400 hover:text-zinc-950 transition-colors flex items-center gap-2">
                        <span>🗑️</span> Eliminar
                    </button>
                  </div>
                </div>
                <div className="text-right ml-6 flex flex-col items-end">
                  <p className="text-white font-black text-3xl">${item.totalPrice.toFixed(2)}</p>
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
            {activeCoupon && <div className="flex justify-between w-full mb-4 text-purple-400 font-bold text-xl"><p>Cupón / Promo ({activeCoupon.code}):</p><p>-${(subtotal - totalAfterCoupon).toFixed(2)}</p></div>}
            {selectedReward && !activeCoupon && <div className="flex justify-between w-full mb-4 text-green-400 font-bold text-xl"><p>Bono VIP Aplicado:</p><p>-${actualDiscount.toFixed(2)}</p></div>}
            <div className="text-right mt-4 border-t border-zinc-800 pt-4 w-full">
              <p className="text-zinc-500 text-xl font-bold uppercase tracking-widest mb-1">Total a Pagar</p>
              <p className="text-7xl text-yellow-400 font-black tracking-tighter">${totalNeto.toFixed(2)}</p>
            </div>
            <button onClick={() => setAppState('MENU')} className="text-zinc-500 mt-6 font-bold hover:text-white self-start">← Agregar más</button>
          </div>
        </div>

        <div className="w-full lg:w-[450px] flex flex-col gap-6">
          <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 rounded-[3rem] p-8 border-2 border-yellow-400 shadow-[0_0_30px_rgba(250,204,21,0.15)] relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-yellow-400 text-zinc-950 font-black px-4 py-1 rounded-bl-2xl text-sm">⭐ MaiztroPuntos</div>
            
            <div className="relative z-10">
                {customerPhone.length < 10 ? (
                  <div className="mb-6 animate-in fade-in zoom-in duration-500">
                    <h3 className="text-2xl font-black text-white mb-1">¡No pierdas tus puntos!</h3>
                    <p className="text-yellow-400 font-bold text-sm mb-4">Ingresa tu celular para ganar o usar recompensas.</p>
                  </div>
                ) : (
                  <div className="mb-6 animate-in fade-in duration-500">
                    {isNewCustomer ? (
                        <h3 className="text-2xl font-black text-yellow-400 mb-1">¡Número Nuevo! ✨</h3>
                    ) : (
                        <h3 className="text-xl font-black text-white mb-1">Hola, {customerName || 'Maiztro'} 👋</h3>
                    )}
                    {!isNewCustomer && <p className="text-zinc-300 font-medium text-sm mb-4">Tienes <span className="text-yellow-400 font-black text-xl">{Math.floor(loyaltyPoints)} pts</span>. (+{pointsToEarn} hoy)</p>}
                  </div>
                )}

                <div className="space-y-4">
                  <div className="relative">
                    <input type="tel" placeholder="Celular (10 dígitos)" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, ''))} maxLength={10} className="w-full bg-zinc-950/80 border border-yellow-500/50 p-5 rounded-2xl focus:border-yellow-400 outline-none text-2xl text-center font-black text-white placeholder:text-zinc-600 tracking-widest shadow-inner"/>
                    {isCheckingPoints && <span className="absolute right-4 top-6 text-yellow-500 animate-spin">⏳</span>}
                  </div>

                  {customerPhone.length === 10 && isNewCustomer ? (
                      <div className="bg-zinc-950 p-6 rounded-2xl border border-yellow-500/50 mt-4 animate-in fade-in slide-in-from-top-4">
                          <h3 className="text-xl font-black text-white mb-2">Gana {pointsToEarn + 50} pts hoy 🎁</h3>
                          <p className="text-zinc-400 text-xs font-bold mb-4">Crea tu cuenta rápido para guardar tus puntos.</p>
                          <div className="space-y-3">
                              <div className="grid grid-cols-2 gap-2">
                                  <input type="text" placeholder="Nombre" value={regData.firstName} onChange={e=>setRegData({...regData, firstName: e.target.value})} className="w-full bg-zinc-900 border border-zinc-700 p-3 rounded-xl text-white outline-none focus:border-yellow-400 text-sm font-bold" />
                                  <input type="text" placeholder="Apellido" value={regData.lastName} onChange={e=>setRegData({...regData, lastName: e.target.value})} className="w-full bg-zinc-900 border border-zinc-700 p-3 rounded-xl text-white outline-none focus:border-yellow-400 text-sm font-bold" />
                              </div>
                              <input type="email" placeholder="Correo (Para tus tickets)" value={regData.email} onChange={e=>setRegData({...regData, email: e.target.value})} className="w-full bg-zinc-900 border border-zinc-700 p-3 rounded-xl text-white outline-none focus:border-yellow-400 text-sm font-bold" />
                              
                              <div className="flex items-start gap-2 mt-2 bg-zinc-900 p-3 rounded-xl border border-zinc-800">
                                  <input type="checkbox" id="terms_kiosk" checked={regData.acceptedTerms} onChange={e=>setRegData({...regData, acceptedTerms: e.target.checked})} className="mt-1 w-5 h-5 accent-yellow-400"/>
                                  <label htmlFor="terms_kiosk" className="text-[10px] text-zinc-400 font-bold leading-relaxed">
                                      Acepto la Privacidad y Cookies.
                                  </label>
                              </div>

                              <button onClick={handleRegisterInKiosk} disabled={isRegistering} className="w-full bg-yellow-400 text-zinc-950 py-4 rounded-xl font-black mt-2 active:scale-95 transition-transform shadow-lg">
                                  {isRegistering ? 'Registrando...' : '¡Crear Cuenta y Ganar Puntos!'}
                              </button>
                              <button onClick={() => setCustomerPhone('')} className="w-full text-zinc-500 font-bold text-xs mt-2 underline hover:text-white">Borrar celular y pedir como invitado</button>
                          </div>
                      </div>
                  ) : (
                      customerPhone.length === 10 && !isNewCustomer && (
                          <div className="mt-6 border-t border-yellow-500/30 pt-6 animate-in fade-in">
                            <p className="text-center text-xs font-bold text-yellow-500/80 mb-3 uppercase tracking-widest">Tus Bonos en Efectivo</p>
                            <div className="space-y-2">
                              {REWARDS.map(reward => {
                                const hasPoints = loyaltyPoints >= reward.pts;
                                const minSpendMet = subtotal >= reward.minSpend;
                                const isAffordable = hasPoints && minSpendMet && !activeCoupon; 
                                const isSelected = selectedReward?.id === reward.id;
                                
                                return (
                                  <button 
                                    key={reward.id} 
                                    disabled={!isAffordable} 
                                    onClick={() => setSelectedReward(isSelected ? null : reward)} 
                                    className={`w-full p-3 rounded-xl border-2 text-left flex justify-between items-center transition-all 
                                      ${!isAffordable ? 'opacity-50 cursor-not-allowed border-zinc-800 bg-zinc-950/80' : 
                                        isSelected ? 'bg-yellow-400 border-yellow-400 text-zinc-950 shadow-[0_0_15px_rgba(250,204,21,0.4)]' : 
                                        'bg-zinc-900 border-yellow-500/30 hover:border-yellow-400 text-white'}`}
                                  >
                                    <div>
                                      <p className="font-black">{reward.label}</p>
                                      <p className={`text-[10px] font-bold uppercase tracking-widest ${isSelected ? 'text-zinc-800' : 'text-zinc-500'}`}>
                                        {!hasPoints ? `Faltan ${reward.pts - Math.floor(loyaltyPoints)} pts` : !minSpendMet ? `Min. Compra $${reward.minSpend}` : `Cuesta ${reward.pts} pts`}
                                      </p>
                                    </div>
                                    <span className="text-xl">{isSelected ? '✅' : !isAffordable ? '🔒' : '💸'}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                      )
                  )}
                </div>
            </div>
          </div>

          <div className="bg-zinc-900 rounded-[3rem] p-8 border border-zinc-800 shadow-2xl flex-1 flex flex-col relative overflow-hidden">
            {isNewCustomer && customerPhone.length === 10 && (
                <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center p-8 text-center">
                    <span className="text-5xl mb-4">🛑</span>
                    <p className="font-black text-xl text-white mb-2">Termina tu registro</p>
                    <p className="text-sm font-bold text-zinc-400">Completa tus datos arriba para continuar con el pago, o borra tu celular para pedir como invitado.</p>
                </div>
            )}

            <div className="space-y-4 mb-6 border-b border-zinc-800 pb-6 relative z-10">
              <input type="text" placeholder="Nombre para el ticket *" value={customerName} onChange={(e) => setCustomerName(e.target.value)} disabled={customerPhone.length === 10 && !isNewCustomer} className="w-full bg-zinc-950 border border-zinc-700 p-4 rounded-xl focus:border-yellow-400 outline-none font-bold disabled:opacity-50 disabled:border-zinc-800 disabled:text-zinc-500"/>
              
              <div className="flex gap-2">
                <input type="text" placeholder="Promo de la App" value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())} disabled={!!selectedReward} className="w-full bg-zinc-950 border border-zinc-700 p-3 rounded-xl focus:border-purple-400 outline-none uppercase font-bold text-center tracking-widest text-sm disabled:opacity-50"/>
                <button onClick={handleApplyCoupon} disabled={!!selectedReward} className="bg-purple-600 hover:bg-purple-500 disabled:bg-zinc-700 transition-colors text-white px-4 rounded-xl font-black text-sm">Aplicar</button>
              </div>
              {couponError && <p className="text-red-400 text-xs font-bold text-center mt-2 animate-bounce">{couponError}</p>}
              {activeCoupon && <p className="text-purple-400 text-xs font-bold text-center mt-2">✅ Promo aplicada con éxito</p>}
              {selectedReward && <p className="text-zinc-500 text-xs font-bold text-center mt-2">Desactiva tu bono para usar un cupón.</p>}
            </div>

            <h3 className="text-xl font-black mb-4 uppercase tracking-widest text-zinc-500 text-center relative z-10">Forma de Pago</h3>
            <div className="flex-1 flex flex-col gap-3 justify-center relative z-10">
              <button onClick={() => triggerTipModal('TERMINAL')} disabled={isSubmitting || cart.length===0} className="bg-blue-500 hover:bg-blue-400 text-white py-5 rounded-2xl font-black text-xl shadow-xl active:scale-95 transition-all disabled:opacity-50">💳 Tarjeta</button>
              <button onClick={() => triggerTipModal('EFECTIVO_CAJA')} disabled={isSubmitting || cart.length===0} className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-white py-5 rounded-2xl font-black text-xl shadow-xl active:scale-95 transition-all disabled:opacity-50">💵 Efectivo en Caja</button>
            </div>
          </div>
        </div>

        {/* MODALES DEL KIOSCO */}
        {showPrivacy && (
            <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex justify-center items-center z-[70] p-6 animate-in fade-in">
                <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[2rem] max-w-lg w-full relative max-h-[80vh] flex flex-col">
                    <h3 className="text-xl font-black text-white mb-4 border-b border-zinc-800 pb-4">Aviso de Privacidad Simplificado</h3>
                    <div className="overflow-y-auto pr-4 space-y-4 text-sm text-zinc-300 font-medium flex-1">
                        <p>Conforme a lo establecido en la Ley, Maiztros informa:</p>
                        <p><strong>1. Uso de Datos:</strong> Sus datos personales serán utilizados exclusivamente para el programa de lealtad y recibos digitales.</p>
                        <p><strong>2. Protección:</strong> En Maiztros <strong>NUNCA</strong> venderemos ni compartiremos su información con terceros.</p>
                    </div>
                    <button onClick={() => setShowPrivacy(false)} className="mt-6 w-full bg-yellow-400 hover:bg-yellow-300 text-zinc-950 font-black py-4 rounded-xl">Cerrar</button>
                </div>
            </div>
        )}

        {showCookies && (
            <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex justify-center items-center z-[70] p-6 animate-in fade-in">
                <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[2rem] max-w-lg w-full relative max-h-[80vh] flex flex-col">
                    <h3 className="text-xl font-black text-white mb-4 border-b border-zinc-800 pb-4">Política de Cookies</h3>
                    <div className="overflow-y-auto pr-4 space-y-4 text-sm text-zinc-300 font-medium flex-1">
                        <p>Este Kiosco utiliza almacenamiento local estrictamente necesario para procesar su orden.</p>
                        <p><strong>¿Qué NO hacemos?</strong> No utilizamos cookies de rastreo publicitario. Toda la información se borra automáticamente después de su compra.</p>
                    </div>
                    <button onClick={() => setShowCookies(false)} className="mt-6 w-full bg-yellow-400 hover:bg-yellow-300 text-zinc-950 font-black py-4 rounded-xl">Cerrar</button>
                </div>
            </div>
        )}

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
            <div className="p-8 border-b border-zinc-800 flex justify-between items-center bg-zinc-900 sticky top-0 z-10">
              <div>
                <p className="text-yellow-400 font-bold tracking-widest uppercase text-sm mb-2">
                  Paso {wizardStep + 1} de {getProductSteps(activeProduct).length}
                </p>
                <h2 className="text-3xl font-black text-white">{getProductSteps(activeProduct)[wizardStep].t}</h2>
              </div>
              <button onClick={() => setActiveProduct(null)} className="bg-zinc-800 text-zinc-400 h-16 w-16 rounded-full flex items-center justify-center text-3xl font-bold hover:text-white hover:bg-zinc-700 transition-colors">✕</button>
            </div>
            
            <div className="p-8 overflow-y-auto flex-1 space-y-10">
              {getProductSteps(activeProduct)[wizardStep].type === 'TOPPINGS' ? (
                <div className="space-y-8 animate-in fade-in duration-300">
                  {/* NUEVA CAJA DE TRANSPARENCIA DE PRECIOS */}
                  <div className="bg-yellow-400/10 border border-yellow-400/30 p-6 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
                      <div>
                          <h4 className="text-yellow-400 font-black text-lg mb-1 flex items-center gap-2">🧀 Toppings Especiales</h4>
                          <p className="text-sm text-zinc-300 font-bold">
                             {getProductSteps(activeProduct)[wizardStep].firstToppingFree ? '🎁 ¡Tu primer topping es GRATIS! Después:' : 'Agrega todo el sabor que quieras por un costo extra:'}
                          </p>
                      </div>
                      <div className="flex gap-4 text-xs font-black text-yellow-500 bg-zinc-950 p-3 rounded-xl border border-yellow-500/20 whitespace-nowrap">
                         <span>1 x $15</span>
                         <span>2 x $25</span>
                         <span>3+ x $35 (Tope)</span>
                      </div>
                  </div>

                  {/* SECCIÓN 1: CON COSTO (Especialidades) */}
                  <div className="space-y-8 border-b border-zinc-800 pb-10">
                    {[ 
                      {t: '1. Aderezos Extras', m: aderezos}, 
                      {t: '2. Ponle Queso', m: quesos}, 
                      {t: '3. Polvito de Papas', m: polvos}
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
                  </div>

                  {/* SECCIÓN 2: GRATIS (Chiles y Restricciones) */}
                  <div className="space-y-8 pt-4">
                    <div>
                      <h3 className="text-xl font-black text-green-400 uppercase tracking-widest mb-4 flex items-center gap-2">🌶️ Barra Libre (¡Gratis!)</h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {chiles.map((mod:any) => (
                          <button key={mod.id} onClick={() => handleToggleModifier(mod)} className={`p-5 rounded-2xl border-2 text-sm md:text-base font-black transition-all ${(wizardData[wizardStep] || []).find((m:any) => m.id === mod.id) ? 'bg-green-500 text-zinc-950 border-green-500 scale-[0.98]' : 'bg-zinc-900 border-zinc-700 hover:border-green-500/50 text-zinc-300'}`}>{mod.name}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-red-400 uppercase tracking-widest mb-4 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-red-400"></span>Restricciones (Sin...)</h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {restricciones.map((mod:any) => (
                          <button key={mod.id} onClick={() => handleToggleModifier(mod)} className={`p-5 rounded-2xl border-2 text-sm md:text-base font-black transition-all ${(wizardData[wizardStep] || []).find((m:any) => m.id === mod.id) ? 'bg-red-500 text-white border-red-500 scale-[0.98]' : 'bg-zinc-900 border-zinc-700 hover:border-red-400/50 text-zinc-300'}`}>{mod.name}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {(OPCIONES as any)[getProductSteps(activeProduct)[wizardStep].type]
                    .filter((opt: string) => {
                       if (getProductSteps(activeProduct)[wizardStep].type === 'PAPAS_MARUCHAN') {
                          const baseChoice = wizardData[0]?.[0];
                          if (baseChoice === 'Construpapas') return OPCIONES.PAPAS.includes(opt) && isOptionAvailable(opt);
                          if (baseChoice === 'Obra Maestra') return OPCIONES.MARUCHAN.includes(opt) && isOptionAvailable(opt);
                       }
                       return isOptionAvailable(opt);
                    })
                    .map((opt: string) => (
                    <button key={opt} onClick={() => setWizardData({...wizardData, [wizardStep]: [opt]})} className={`p-6 rounded-2xl border-2 font-black transition-all text-xl ${(wizardData[wizardStep] || []).includes(opt) ? 'bg-yellow-400 text-zinc-950 border-yellow-400 scale-[0.98] shadow-lg' : 'bg-zinc-900 border-zinc-700 hover:border-zinc-500 text-zinc-300'}`}>{opt}</button>
                  ))}
                </div>
              )}
            </div>

            <div className="p-8 border-t border-zinc-800 bg-zinc-900 sticky bottom-0 flex gap-4 z-10">
              {wizardStep > 0 && (
                <button onClick={() => setWizardStep(prev => prev - 1)} className="w-1/3 bg-zinc-800 hover:bg-zinc-700 text-white py-6 rounded-2xl font-black text-xl transition-colors active:scale-[0.98]">
                  ← Atrás
                </button>
              )}
              <button onClick={handleNextOrFinish} disabled={getProductSteps(activeProduct)[wizardStep].type !== 'TOPPINGS' && !(wizardData[wizardStep] && wizardData[wizardStep].length > 0)} className="flex-1 bg-yellow-400 text-zinc-950 py-6 rounded-2xl font-black text-2xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-yellow-300 active:scale-[0.98] transition-transform">
                {(() => {
                    const isLastStep = wizardStep === getProductSteps(activeProduct).length - 1;
                    const stepDef = getProductSteps(activeProduct)[wizardStep];
                    let extraLabel = "";
                    
                    if (stepDef && stepDef.type === 'TOPPINGS') {
                        const currentSelections = wizardData[wizardStep] || [];
                        const paidCount = currentSelections.filter((s:any) => s.type === 'QUESO' || s.type === 'ADEREZO' || s.type === 'POLVO').length;
                        let baseCount = paidCount;
                        if (stepDef.firstToppingFree && baseCount > 0) baseCount -= 1;
                        
                        if (!stepDef.isFree) {
                            if (baseCount === 1) extraLabel = " (+ $15.00)";
                            if (baseCount === 2) extraLabel = " (+ $25.00)";
                            if (baseCount >= 3) extraLabel = " (+ $35.00)";
                        }
                    }
                    
                    return isLastStep ? `Terminar y Agregar${extraLabel} ➔` : `Siguiente Paso${extraLabel} ➔`;
                })()}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
