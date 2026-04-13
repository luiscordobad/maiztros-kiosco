// @ts-nocheck
/* eslint-disable */
'use client';
import { useState, useEffect } from 'react';
import { useCartStore } from '@/store/cart';
import { initMercadoPago, Wallet } from '@mercadopago/sdk-react';

initMercadoPago('APP_USR-7d3162e4-fbb5-4810-b3dd-3de18d93fb8f', { locale: 'es-MX' });

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

export default function PedirClient({ products, modifiers }: { products: any[], modifiers: any[] }) {
  const { cart, addToCart, removeFromCart, getTotal } = useCartStore();
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);

  useEffect(() => {
      fetch('/api/admin?action=kiosco_sync')
        .then(res => res.json())
        .then(data => { if(data.success) setInventoryItems(data.inventoryItems || []); })
        .catch(e => console.error("Error cargando inventario", e));
  }, []);

  const visibleProducts = products
    .filter(p => !p.name.toLowerCase().includes('ramaiztro') && p.isAvailable)
    .sort((a, b) => a.basePrice - b.basePrice);

  const polvos = modifiers.filter(m => m.type === 'POLVO' && m.isAvailable);
  const aderezos = modifiers.filter(m => m.type === 'ADEREZO' && m.isAvailable);
  const quesos = modifiers.filter(m => m.type === 'QUESO' && m.isAvailable);
  const restricciones = modifiers.filter(m => m.type === 'RESTRICCION' && m.isAvailable);
  const chiles = modifiers.filter(m => m.type === 'CHILE' && m.isAvailable);

  const [appState, setAppState] = useState<'MENU' | 'CHECKOUT' | 'SUCCESS'>('MENU');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [activeProduct, setActiveProduct] = useState<any>(null);
  const [wizardStep, setWizardStep] = useState(0);
  const [wizardData, setWizardData] = useState<any>({}); 
  
  // 🌟 AÑADIDO: Estado para saber qué producto estamos editando
  const [editingCartId, setEditingCartId] = useState<string | null>(null);

  const [isLoadingPayment, setIsLoadingPayment] = useState(false);
  const [preferenceId, setPreferenceId] = useState<string | null>(null); 
  const [orderSuccessId, setOrderSuccessId] = useState<any>(null);
  
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [orderNotes, setOrderNotes] = useState('');

  const [loyaltyPoints, setLoyaltyPoints] = useState(0);
  const [selectedReward, setSelectedReward] = useState<any>(null);
  const [isCheckingPoints, setIsCheckingPoints] = useState(false);
  
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [regData, setRegData] = useState({ acceptedTerms: false });
  
  // 🌟 AÑADIDO: Estado para mostrar el modal de Privacidad
  const [showPrivacy, setShowPrivacy] = useState(false);

  const [couponCode, setCouponCode] = useState('');
  const [activeCoupon, setActiveCoupon] = useState<any>(null);
  const [couponError, setCouponError] = useState('');

  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [isClosed, setIsClosed] = useState(false);

  useEffect(() => {
    const calculateTimes = () => {
        const times: string[] = [];
        const now = new Date(new Date().toLocaleString("en-US", {timeZone: "America/Mexico_City"}));
        const startHour = 18; const startMin = 15; const endHour = 22;   
        let currentSlot = new Date(now);
        currentSlot.setHours(startHour, startMin, 0, 0);

        if (now.getHours() >= endHour) { setIsClosed(true); return; }
        if (now > currentSlot) {
            currentSlot = new Date(now.getTime() + 20 * 60000); 
            const remainder = 15 - (currentSlot.getMinutes() % 15);
            currentSlot = new Date(currentSlot.getTime() + remainder * 60000);
        }
        const endSlot = new Date(now); endSlot.setHours(endHour, 0, 0, 0);
        while (currentSlot <= endSlot) {
            times.push(currentSlot.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true }));
            currentSlot = new Date(currentSlot.getTime() + 15 * 60000); 
        }
        setAvailableTimes(times);
        if (times.length > 0 && !selectedTime) setSelectedTime(times[0]);
    };
    calculateTimes();
    const interval = setInterval(calculateTimes, 60000);
    return () => clearInterval(interval);
  }, [selectedTime]);

  useEffect(() => {
    if (customerPhone.length === 10) {
      setIsCheckingPoints(true);
      fetch(`/api/customer?phone=${customerPhone}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setLoyaltyPoints(data.points);
            if(data.name && !customerName) setCustomerName(data.name); 
            if(data.email && !customerEmail) setCustomerEmail(data.email);
            setIsNewCustomer(false);
          } else { setLoyaltyPoints(0); setIsNewCustomer(true); }
          setIsCheckingPoints(false);
        });
    }
  }, [customerPhone]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const status = urlParams.get('status');
    const orderId = urlParams.get('order_id');

    if ((status === 'approved' || status === 'success') && orderId) {
      setOrderSuccessId(orderId);
      setAppState('SUCCESS');
      window.history.replaceState(null, '', window.location.pathname);
      
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://maiztros.vercel.app';
      fetch('/api/send-ticket', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: customerEmail || 'maiztrosqro@gmail.com', orderUrl: `${baseUrl}/ticket/${orderId}`, turnNumber: orderId })
      }).catch(() => {});
    }
  }, [customerEmail]);

  const subtotal = getTotal();

  const getProductEmoji = (name: string, category: string) => {
      if (category === 'COMBO') return '📦';
      if (category === 'ESQUITE') return '🌽';
      if (category === 'BEBIDA') return '🥤';
      if (name.toLowerCase().includes('maruchan') || name.toLowerCase().includes('obra maestra')) return '🍜';
      if (name.toLowerCase().includes('papa') || name.toLowerCase().includes('dorito') || name.toLowerCase().includes('tostito')) return '🔥';
      return '🍬';
  }

  const getProductDesc = (name: string) => {
    const n = name.toLowerCase();
    if(n.includes('solitario') || n.includes('individual')) return "1 Esq. Mediano + 1 Bebida Fría";
    if(n.includes('dúo') || n.includes('pareja')) return "2 Esq. Medianos + 2 Bebidas (1er Topping Gratis)";
    if(n.includes('tribu') || n.includes('familiar')) return "2 Gdes + 2 Chicos + 4 Bebidas (1er Topping Gratis)";
    if(n.includes('especialista') || n.includes('especialidad')) return "Construpapas u Obra Maestra a elegir + 1 Bebida";
    if(n === 'construpapas') return "Tus papas con esquite encima";
    if(n === 'obra maestra') return "Maruchan con nuestro esquite";
    if(n === 'don maiztro') return "Maruchan + Papas + Esquite";
    return "Delicioso y preparado al momento.";
  };

  const getProductSteps = (p: any) => {
    const n = p.name.toLowerCase();
    if(n.includes('solitario') || n.includes('individual')) return [{t: 'Esquite Mediano', type: 'TOPPINGS'}, {t: 'Bebida', type: 'BEBIDA_ALL'}];
    if(n.includes('dúo') || n.includes('pareja')) return [{t: 'Esquite 1', type: 'TOPPINGS', firstToppingFree: true}, {t: 'Esquite 2', type: 'TOPPINGS', firstToppingFree: true}, {t: 'Bebidas (Elige 2)', type: 'BEBIDA_ALL_MULTIPLE', max: 2}];
    if(n.includes('tribu') || n.includes('familiar')) return [{t: 'Esquites Grandes (2)', type: 'TOPPINGS', firstToppingFree: true}, {t: 'Esquites Chicos (2)', type: 'TOPPINGS', firstToppingFree: true}, {t: 'Bebidas (Elige 4)', type: 'BEBIDA_ALL_MULTIPLE', max: 4}];
    if(n.includes('especialista') || n.includes('especialidad')) return [{t: 'Especialidad', type: 'ESPECIALIDAD_CHOICE'}, {t: 'Base (Papas/Maruchan)', type: 'PAPAS_MARUCHAN'}, {t: 'Preparación', type: 'TOPPINGS'}, {t: 'Bebida', type: 'BEBIDA_ALL'}];
    if(n.includes('boing')) return [{t: 'Sabor', type: 'BOING'}];
    if(n.includes('refresco')) return [{t: 'Sabor', type: 'REFRESCO'}];
    if(n.includes('construpapas')) return [{t: 'Elige tus Papas', type: 'PAPAS'}, {t: 'Preparación', type: 'TOPPINGS'}];
    if(n.includes('don maiztro')) return [{t: 'Sabor Maruchan', type: 'MARUCHAN'}, {t: 'Elige Papas', type: 'PAPAS'}, {t: 'Preparación', type: 'TOPPINGS', firstToppingFree: true}]; 
    if(n.includes('bolsa de papas')) return [{t: 'Elige tus Papas', type: 'PAPAS'}];
    if(n.includes('maruchan preparada sola')) return [{t: 'Sabor Maruchan', type: 'MARUCHAN'}];
    if(n.includes('obra maestra')) return [{t: 'Sabor Maruchan', type: 'MARUCHAN'}, {t: 'Preparación', type: 'TOPPINGS'}];
    if(p.category === 'ANTOJO' || n === 'agua natural') return [];
    return [{t: 'Personaliza', type: 'TOPPINGS'}];
  };

  const handleProductClick = (product: any) => {
    const steps = getProductSteps(product);
    if (steps.length === 0) { addToCart(product, 0, product.name); return; }
    setActiveProduct(product); setWizardStep(0); setWizardData({}); 
    setEditingCartId(null);
  };

  // 🌟 AÑADIDO: Lógica para abrir el editor con la info del producto guardado
  const handleEditCartItem = (item: any) => {
    setEditingCartId(item.cartId);
    setActiveProduct(item.product);
    setWizardStep(0);
    setWizardData({});
    if(isCartOpen) setIsCartOpen(false);
  };

  const handleToggleModifier = (mod: any, isMultiple: boolean = true, maxLimit: number = 99) => {
    const currentSelections = wizardData[wizardStep] || [];
    if (!isMultiple) { setWizardData({...wizardData, [wizardStep]: [mod]}); return; }
    const isSelected = currentSelections.find((m: any) => m.id === mod.id);
    let newSelections = [];
    if (isSelected) { newSelections = currentSelections.filter((m: any) => m.id !== mod.id); } 
    else {
        if (currentSelections.length >= maxLimit) return; 
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
        if (step.firstToppingFree && baseCount > 0) baseCount -= 1;
        if (!step.isFree) {
          if (baseCount === 1) totalExtra += 15;
          if (baseCount === 2) totalExtra += 25;
          if (baseCount >= 3) totalExtra += 35;
        }
        notesLines.push(`${step.t}: ${selections.map((s:any) => s.name).join(', ')}`);
      } else if (step.type === 'BEBIDA_ALL_MULTIPLE') {
        notesLines.push(`${step.t}: ${selections.map((s:any) => s).join(', ')}`);
      } else { notesLines.push(`${step.t}: ${selections[0]}`); }
    });

    // 🌟 AÑADIDO: Si estamos editando, eliminamos el viejo antes de guardar el nuevo
    if (editingCartId) {
        removeFromCart(editingCartId);
        setEditingCartId(null);
    }

    addToCart(activeProduct, totalExtra, notesLines.join(' | '));
    setActiveProduct(null);
  };

  // 🌟 AÑADIDO: Regresar al menú si el carrito se queda vacío
  useEffect(() => {
    if (activeCoupon && activeCoupon.minAmount > 0 && subtotal < activeCoupon.minAmount) {
      setActiveCoupon(null); setCouponError(`Mínimo de compra de $${activeCoupon.minAmount}`);
    }
    if (selectedReward && subtotal < selectedReward.minSpend) { setSelectedReward(null); }
    
    if (cart.length === 0) {
        setIsCartOpen(false);
        if (appState === 'CHECKOUT') setAppState('MENU');
    }
    
    setPreferenceId(null);
  }, [subtotal, activeCoupon, selectedReward, cart.length, isCartOpen, appState]);

  const handleRegisterInWeb = async () => {
    if (!customerName || !customerEmail) return alert('Por favor, llena tu nombre y correo.');
    if (!regData.acceptedTerms) return alert('Debes aceptar las políticas de privacidad.');
    setIsRegistering(true);
    try {
        const res = await fetch('/api/customer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: customerPhone, firstName: customerName, lastName: '', email: customerEmail })
        });
        const data = await res.json();
        if (data.success) {
            setCustomerName(data.customer.name); setLoyaltyPoints(data.customer.points); setIsNewCustomer(false); 
        } else { alert('Error al registrar. Intenta pedir sin cuenta.'); }
    } catch(e) { alert('Error de red.'); }
    setIsRegistering(false);
  };

  const handleApplyCoupon = async () => {
    setCouponError('');
    if (!couponCode) return;
    if (customerPhone.length !== 10) return setCouponError('⚠️ Ingresa tu celular para validar.');

    const res = await fetch(`/api/customer?phone=${customerPhone}`);
    const data = await res.json();
    if (data.success && data.activeCoupons) { 
      const coupon = data.activeCoupons.find((c:any) => c.code === couponCode.toUpperCase());
      if (!coupon) return setCouponError('❌ Cupón inválido.');
      const alreadyUsed = data.history.some((o:any) => o.couponCode === coupon.code);
      if (alreadyUsed && coupon.code !== 'MAIZTROVIP') return setCouponError('⚠️ Ya utilizaste este cupón.');
      if (coupon.minAmount > 0 && subtotal < coupon.minAmount) {
        setCouponError(`⚠️ Compra mínima $${coupon.minAmount}.`); setActiveCoupon(null);
      } else {
        setActiveCoupon(coupon); setSelectedReward(null); setPreferenceId(null); 
      }
    } else { setCouponError('❌ Necesitas estar registrado para usar cupones.'); }
  };

  let totalAfterCoupon = subtotal;
  if (activeCoupon) {
    if (activeCoupon.discountType === 'FIXED') totalAfterCoupon = Math.max(0, subtotal - activeCoupon.discount);
    if (activeCoupon.discountType === 'PERCENTAGE') totalAfterCoupon = subtotal - (subtotal * (activeCoupon.discount / 100));
  }
  const actualDiscount = selectedReward && !activeCoupon ? Math.min(selectedReward.discount, totalAfterCoupon) : 0;
  const totalNeto = totalAfterCoupon - actualDiscount;

  const generatePaymentLink = async () => {
    if (!customerName || customerPhone.length !== 10 || !customerEmail || !customerEmail.includes('@')) {
        return window.alert("¡Casi listo! Por favor, llena todos los campos de 'Tus Datos' correctamente.");
    }
    setIsLoadingPayment(true);
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          cart, totalAmount: totalNeto, pointsDiscount: actualDiscount, 
          pointsDeducted: selectedReward?.pts || 0, customerName, 
          customerEmail, customerPhone, isPickToGo: true, couponCode: activeCoupon?.code || null,
          paymentMethod: 'TERMINAL', pickupTime: selectedTime, orderNotes 
        })
      });
      const data = await response.json();
      if (response.ok && data.preferenceId) { setPreferenceId(data.preferenceId); }
      else { alert("Problema con el pago: " + (data.error || "Desconocido")); }
    } catch (error) { alert("Error de red"); }
    setIsLoadingPayment(false);
  };

  const isOptionAvailable = (optName: string) => {
    const invItem = inventoryItems.find(i => i.name.toLowerCase() === optName.toLowerCase());
    if (invItem) return invItem.isAvailable && invItem.stock > 0;
    const prodItem = products.find(p => p.name.toLowerCase() === optName.toLowerCase());
    if (prodItem) return prodItem.isAvailable;
    return true; 
  };

  const finishOrderScreenManually = () => {
      useCartStore.setState({ cart: [] });
      setCustomerName(''); setCustomerPhone(''); setCustomerEmail(''); setOrderNotes('');
      setLoyaltyPoints(0); setSelectedReward(null); setActiveCoupon(null); setCouponCode('');
      setIsNewCustomer(false); setRegData({ acceptedTerms: false });
      setOrderSuccessId(null); setPreferenceId(null);
      setAppState('MENU'); 
  };

  if (isClosed) {
    return (
        <div className="min-h-screen bg-zinc-50 text-zinc-900 flex flex-col items-center justify-center p-6 text-center font-sans">
            <span className="text-8xl mb-4 opacity-80">🌙</span>
            <h1 className="text-3xl font-black text-zinc-900 mb-2 tracking-tighter">Cerrado por hoy</h1>
            <p className="text-zinc-500 text-sm font-medium max-w-xs">Nuestros elotes están descansando. Abrimos mañana a las 5:30 PM (Pick To Go a partir de las 6:15 PM).</p>
        </div>
    );
  }

  // VISTA ÉXITO
  if (appState === 'SUCCESS') {
    return (
      <div className="min-h-screen bg-green-500 text-white flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in-95 duration-500 relative">
        <h1 className="text-4xl font-black mb-2 tracking-tighter">¡ORDEN RECIBIDA! ⚡</h1>
        <p className="text-lg font-bold mb-8">Pasa por ella a las <span className="bg-white text-green-600 px-2 py-1 rounded-lg">{selectedTime}</span></p>
        <div className="bg-white text-zinc-900 p-8 rounded-[2rem] shadow-2xl w-full max-w-sm">
            <p className="text-xs uppercase tracking-[0.2em] font-bold text-zinc-400 mb-1">Tu Turno</p>
            <p className="text-[5rem] leading-none font-black italic tracking-tighter text-zinc-900 mb-6">#{String(orderSuccessId).slice(-4).toUpperCase()}</p>
            <p className="text-[10px] text-zinc-500 font-medium">Recibo enviado a: {customerEmail}</p>
        </div>
        <button onClick={finishOrderScreenManually} className="mt-8 bg-black/20 text-white px-8 py-4 rounded-full font-black text-sm">Volver al Menú</button>
      </div>
    );
  }

  // VISTA CHECKOUT
  if (appState === 'CHECKOUT') {
    return (
      <div className="min-h-screen bg-zinc-50 text-zinc-900 pb-40 p-4 max-w-lg mx-auto">
        <header className="bg-white p-4 sticky top-0 z-40 flex items-center gap-4 border-b rounded-xl shadow-sm mb-4">
            <button onClick={() => setAppState('MENU')} className="font-bold bg-zinc-100 w-10 h-10 rounded-full flex items-center justify-center">←</button>
            <h1 className="text-xl font-black">Completar Pedido</h1>
        </header>

        <div className="space-y-6">
            <div className="bg-white p-5 rounded-[1.5rem] shadow-sm border">
                <h2 className="font-black text-lg mb-4">Tu Carrito</h2>
                {cart.map((item) => (
                    // 🌟 CORRECCIÓN: cartId para el botón de eliminar y los botones completos
                    <div key={item.cartId} className="flex justify-between items-start border-b py-3 last:border-0 border-zinc-100">
                        <div className="flex-1 pr-4">
                            <p className="font-bold text-sm">{item.product.name}</p>
                            {item.notes && <p className="text-zinc-500 text-xs mt-1 leading-relaxed">{item.notes.split(' | ').join(', ')}</p>}
                            <div className="flex gap-3 mt-2">
                                <button onClick={() => handleEditCartItem(item)} className="text-blue-500 text-xs font-bold bg-blue-50 px-3 py-1 rounded-md">Editar</button>
                                <button onClick={() => removeFromCart(item.cartId)} className="text-red-500 text-xs font-bold bg-red-50 px-3 py-1 rounded-md">Eliminar</button>
                            </div>
                        </div>
                        <p className="font-black">${item.totalPrice.toFixed(2)}</p>
                    </div>
                ))}
            </div>

            <div className="bg-white p-5 rounded-[1.5rem] shadow-sm border space-y-3">
                <h2 className="font-black text-lg mb-2">Tus Datos</h2>
                <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Nombre *" disabled={customerPhone.length === 10 && !isNewCustomer} className="w-full bg-zinc-50 border p-3 rounded-xl focus:border-yellow-500 outline-none font-bold disabled:opacity-60"/>
                <div className="relative">
                    <input type="tel" value={customerPhone} onChange={e => setCustomerPhone(e.target.value.replace(/\D/g, ''))} maxLength={10} placeholder="WhatsApp *" className="w-full bg-zinc-50 border p-3 rounded-xl focus:border-yellow-500 outline-none font-bold"/>
                    {isCheckingPoints && <span className="absolute right-3 top-3 text-yellow-500 animate-spin">⏳</span>}
                </div>
                <input type="email" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} placeholder="Correo *" className="w-full bg-zinc-50 border p-3 rounded-xl focus:border-yellow-500 outline-none font-bold"/>
                
                {customerPhone.length === 10 && isNewCustomer && (
                    <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-200 mt-2">
                        <p className="text-yellow-800 text-xs font-bold mb-3">🎁 ¡Gana puntos en esta compra! Únete al club VIP:</p>
                        <div className="flex items-start gap-2 mb-3">
                            <input type="checkbox" id="terms" checked={regData.acceptedTerms} onChange={e=>setRegData({...regData, acceptedTerms: e.target.checked})} className="mt-0.5 accent-yellow-500"/>
                            {/* 🌟 AÑADIDO: Enlace de Privacidad clickeable que activa el Modal */}
                            <label htmlFor="terms" className="text-[10px] text-zinc-600 leading-tight">Acepto la <span className="underline font-bold text-zinc-800 cursor-pointer" onClick={(e) => { e.preventDefault(); setShowPrivacy(true); }}>Privacidad</span></label>
                        </div>
                        <button onClick={handleRegisterInWeb} disabled={isRegistering} className="w-full bg-yellow-400 text-zinc-900 py-2 rounded-lg font-black text-xs hover:bg-yellow-300">
                            {isRegistering ? 'Creando...' : 'Crear Cuenta VIP'}
                        </button>
                    </div>
                )}

                {customerPhone.length === 10 && !isNewCustomer && loyaltyPoints > 0 && (
                    <div className="mt-4 pt-4 border-t border-zinc-100">
                        <p className="text-xs font-bold text-zinc-500 mb-2">Tienes {loyaltyPoints} pts. Úsalos como dinero:</p>
                        <div className="space-y-2">
                            {REWARDS.map(reward => {
                                const isAffordable = loyaltyPoints >= reward.pts && subtotal >= reward.minSpend && !activeCoupon;
                                const isSelected = selectedReward?.id === reward.id;
                                return (
                                    <button key={reward.id} disabled={!isAffordable} onClick={() => {setSelectedReward(isSelected ? null : reward); setPreferenceId(null);}} className={`w-full p-3 rounded-xl border text-left flex justify-between items-center text-xs transition-all ${!isAffordable ? 'opacity-40 bg-zinc-50' : isSelected ? 'bg-zinc-900 text-white font-black' : 'bg-white font-bold'}`}>
                                        <span>{reward.label} ({reward.pts} pts)</span>
                                        <span>{isSelected ? '✅' : !isAffordable ? '🔒' : 'Aplicar'}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            <div className="bg-blue-50 p-5 rounded-[1.5rem] border border-blue-100">
                <h2 className="font-black text-lg mb-2 text-blue-900">🕒 ¿A qué hora pasas?</h2>
                <select value={selectedTime} onChange={e => {setSelectedTime(e.target.value); setPreferenceId(null);}} className="w-full bg-white text-blue-900 border border-blue-200 p-4 rounded-xl font-black outline-none focus:border-blue-500 text-base">
                    {availableTimes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
            </div>
            
            <div className="bg-white p-5 rounded-[1.5rem] shadow-sm border border-zinc-100 mb-8">
              <label className="text-zinc-800 font-black text-sm mb-2 block">Notas para la cocina</label>
              <textarea placeholder="Opcional. Ej. Sin servilletas..." value={orderNotes} onChange={(e) => {setOrderNotes(e.target.value); setPreferenceId(null);}} className="w-full bg-zinc-50 border border-zinc-200 p-4 rounded-xl outline-none text-sm font-medium resize-none h-20 focus:border-yellow-400"/>
            </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 pb-6 z-40 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
            <div className="max-w-lg mx-auto">
                <div className="flex justify-between items-end mb-3">
                    <span className="text-zinc-500 font-bold text-sm">Total</span>
                    <span className="text-3xl font-black">${totalNeto.toFixed(2)}</span>
                </div>
                {preferenceId ? (
                    <div className="w-full bg-[#f5f5f5] p-3 rounded-2xl border border-zinc-200">
                        <Wallet initialization={{ preferenceId: preferenceId, redirectMode: 'self' }} customization={{ texts: { action: 'pay', valueProp: 'security_details' } }} />
                    </div>
                ) : (
                    <button onClick={generatePaymentLink} disabled={cart.length === 0 || isLoadingPayment} className="w-full bg-[#009ee3] text-white font-black py-4 rounded-xl shadow-md">
                        {isLoadingPayment ? 'Conectando...' : 'Proceder al Pago'}
                    </button>
                )}
            </div>
        </div>

        {/* 🌟 AÑADIDO: Modal de Privacidad que se había perdido */}
        {showPrivacy && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex justify-center items-center p-4 animate-in fade-in duration-200">
                <div className="bg-white p-6 rounded-[2rem] max-w-sm w-full shadow-2xl">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-black text-zinc-900">Privacidad</h3>
                        <button onClick={() => setShowPrivacy(false)} className="text-zinc-400 hover:text-zinc-600 font-bold text-xl">✕</button>
                    </div>
                    <p className="text-sm text-zinc-600 mb-6 font-medium leading-relaxed">
                        Tus datos personales se utilizan exclusivamente para enviarte el recibo de tu pedido y otorgarte puntos VIP. En Maiztros NO vendemos ni compartimos tu información.
                    </p>
                    <button onClick={() => setShowPrivacy(false)} className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-black py-4 rounded-xl transition-colors">
                        Entendido
                    </button>
                </div>
            </div>
        )}

      </div>
    );
  }

  // VISTA MENÚ PRINCIPAL
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 font-sans relative pb-32">
      <header className="bg-white/80 backdrop-blur-xl border-b sticky top-0 z-30 pt-safe">
        <div className="p-4 flex justify-between items-center max-w-2xl mx-auto">
            <div>
                <h1 className="text-2xl font-black text-zinc-900 tracking-tighter">MAIZTROS <span className="text-yellow-500">GO</span></h1>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">⚡ Pick To Go</p>
            </div>
        </div>
        <div className="flex gap-2 overflow-x-auto px-4 pb-4 scrollbar-hide max-w-2xl mx-auto">
            <a href="#combos" className="bg-zinc-100 text-zinc-800 px-4 py-2 rounded-full text-xs font-black whitespace-nowrap active:bg-zinc-200 transition-colors">📦 Combos</a>
            <a href="#esquites" className="bg-zinc-100 text-zinc-800 px-4 py-2 rounded-full text-xs font-black whitespace-nowrap active:bg-zinc-200 transition-colors">🌽 Esquites</a>
            <a href="#bebidas" className="bg-zinc-100 text-zinc-800 px-4 py-2 rounded-full text-xs font-black whitespace-nowrap active:bg-zinc-200 transition-colors">🥤 Bebidas</a>
            <a href="#otros" className="bg-zinc-100 text-zinc-800 px-4 py-2 rounded-full text-xs font-black whitespace-nowrap active:bg-zinc-200 transition-colors">🍬 Otros</a>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 space-y-10 pt-6">
        <section id="combos" className="scroll-mt-32">
          <h2 className="text-xl font-black mb-4 flex items-center gap-2">📦 Combos</h2>
          <div className="flex flex-col gap-4">
            {visibleProducts.filter(p => p.category === 'COMBO').map((product) => (
              <div key={product.id} onClick={() => handleProductClick(product)} className="bg-white border rounded-[1.5rem] p-4 flex gap-4 shadow-sm active:scale-[0.98] cursor-pointer">
                <div className="w-20 h-20 bg-yellow-50 rounded-2xl flex items-center justify-center text-3xl shrink-0">
                    {getProductEmoji(product.name, product.category)}
                </div>
                <div className="flex-1 flex flex-col justify-between py-1">
                    <div>
                      <h3 className="font-black text-sm">{product.name}</h3>
                      <p className="text-zinc-500 text-xs font-medium mt-1 line-clamp-2">{getProductDesc(product.name)}</p>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                        <p className="font-black text-sm">${product.basePrice.toFixed(2)}</p>
                        <span className="bg-zinc-900 text-white text-[10px] font-black px-3 py-1.5 rounded-lg">Agregar</span>
                    </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="esquites" className="scroll-mt-32">
          <h2 className="text-xl font-black mb-4 flex items-center gap-2">🌽 Esquites y Especiales</h2>
          <div className="flex flex-col gap-4">
            {visibleProducts.filter(p => p.category === 'ESQUITE' || p.category === 'ESPECIALIDAD').map((product) => (
              <div key={product.id} onClick={() => handleProductClick(product)} className="bg-white border rounded-[1.5rem] p-4 flex gap-4 shadow-sm active:scale-[0.98] cursor-pointer">
                <div className="w-20 h-20 bg-zinc-50 rounded-2xl flex items-center justify-center text-3xl shrink-0">
                    {getProductEmoji(product.name, product.category)}
                </div>
                <div className="flex-1 flex flex-col justify-between py-1">
                    <div>
                      <h3 className="font-black text-sm">{product.name}</h3>
                      <p className="text-zinc-500 text-xs font-medium mt-1 line-clamp-2">{getProductDesc(product.name)}</p>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                        <p className="font-black text-sm">${product.basePrice.toFixed(2)}</p>
                        <span className="bg-zinc-100 text-zinc-600 text-[10px] font-black px-3 py-1.5 rounded-lg">Agregar</span>
                    </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="bebidas" className="scroll-mt-32">
          <h2 className="text-xl font-black mb-4 flex items-center gap-2">🥤 Bebidas</h2>
          <div className="grid grid-cols-2 gap-4">
            {visibleProducts.filter(p => p.category === 'BEBIDA').map((product) => (
              <div key={product.id} onClick={() => handleProductClick(product)} className="bg-white border rounded-[1.2rem] p-4 flex flex-col items-center text-center shadow-sm cursor-pointer">
                <span className="text-4xl mb-2">🥤</span>
                <h3 className="font-black text-xs line-clamp-1">{product.name}</h3>
                <p className="text-zinc-500 font-black text-xs">${product.basePrice.toFixed(2)}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="otros" className="scroll-mt-32">
          <h2 className="text-xl font-black mb-4 flex items-center gap-2">🍬 Otros Antojos</h2>
          <div className="grid grid-cols-2 gap-4">
            {visibleProducts.filter(p => p.category === 'ANTOJO' || p.category === 'PAPA_SOLA' || p.category === 'MARUCHAN_SOLA').map((product) => (
              <div key={product.id} onClick={() => handleProductClick(product)} className="bg-white border rounded-[1.2rem] p-4 flex flex-col items-center text-center shadow-sm cursor-pointer">
                <span className="text-4xl mb-2">{getProductEmoji(product.name, product.category)}</span>
                <h3 className="font-black text-xs line-clamp-1">{product.name}</h3>
                <p className="text-zinc-500 font-black text-xs">${product.basePrice.toFixed(2)}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      {activeProduct && getProductSteps(activeProduct)[wizardStep] && (
        <div className="fixed inset-0 bg-zinc-900/60 flex flex-col justify-end z-50 animate-in fade-in duration-200">
          <div className="flex-1 w-full" onClick={() => { setActiveProduct(null); setEditingCartId(null); }}></div>
          
          <div className="bg-white w-full max-w-2xl mx-auto rounded-t-[2rem] flex flex-col max-h-[85vh] shadow-[0_-20px_50px_rgba(0,0,0,0.1)] animate-in slide-in-from-bottom-8">
            <div className="p-5 border-b border-zinc-100 flex justify-between items-center sticky top-0 bg-white rounded-t-[2rem] z-10">
              <div>
                <p className="text-zinc-400 font-bold tracking-widest uppercase text-[10px] mb-1">
                  {editingCartId ? 'Modificando • ' : ''}Paso {wizardStep + 1} de {getProductSteps(activeProduct).length}
                </p>
                <h2 className="text-xl font-black text-zinc-900 leading-tight">{getProductSteps(activeProduct)[wizardStep].t}</h2>
              </div>
              <button onClick={() => { setActiveProduct(null); setEditingCartId(null); }} className="w-10 h-10 bg-zinc-100 text-zinc-500 rounded-full flex items-center justify-center font-bold">✕</button>
            </div>
            
            <div className="p-5 overflow-y-auto flex-1 bg-zinc-50 pb-24">
              {getProductSteps(activeProduct)[wizardStep].type === 'TOPPINGS' ? (
                <div className="space-y-8">
                  {getProductSteps(activeProduct)[wizardStep].firstToppingFree && (
                      <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-xl flex items-center gap-3">
                          <span className="text-2xl">🎁</span>
                          <p className="text-xs text-yellow-800 font-bold leading-tight">Tu primer topping especial es gratis. Los siguientes tienen costo extra.</p>
                      </div>
                  )}

                  {[ 
                    {t: 'Aderezos Extras', m: aderezos, icon: '🧈'}, 
                    {t: 'Ponle Queso', m: quesos, icon: '🧀'}, 
                    {t: 'Polvito de Papas', m: polvos, icon: '🌶️'}
                  ].map(sec => (
                    <div key={sec.t}>
                      <h3 className="text-sm font-black text-zinc-800 uppercase tracking-widest mb-3 flex items-center gap-2">{sec.icon} {sec.t}</h3>
                      <div className="grid grid-cols-2 gap-3">
                        {sec.m.map((mod:any) => {
                            const isSelected = (wizardData[wizardStep] || []).find((m:any) => m.id === mod.id);
                            return (
                                <button key={mod.id} onClick={() => handleToggleModifier(mod, true)} className={`p-4 rounded-xl border text-xs font-black transition-all text-left flex justify-between items-center ${isSelected ? 'bg-yellow-400 border-yellow-400 text-zinc-900 shadow-sm' : 'bg-white border-zinc-200 text-zinc-600 hover:border-yellow-200'}`}>
                                    <span className="line-clamp-2 pr-2">{mod.name}</span>
                                    {isSelected && <span>✓</span>}
                                </button>
                            );
                        })}
                      </div>
                    </div>
                  ))}

                  <div className="border-t border-zinc-200 pt-6">
                    <h3 className="text-sm font-black text-green-600 uppercase tracking-widest mb-3">🔥 Barra Libre (Gratis)</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {chiles.map((mod:any) => {
                          const isSelected = (wizardData[wizardStep] || []).find((m:any) => m.id === mod.id);
                          return (
                              <button key={mod.id} onClick={() => handleToggleModifier(mod, true)} className={`p-4 rounded-xl border text-xs font-black transition-all text-left flex justify-between items-center ${isSelected ? 'bg-green-500 border-green-500 text-white shadow-sm' : 'bg-white border-zinc-200 text-zinc-600 hover:border-green-200'}`}>
                                  <span className="line-clamp-2 pr-2">{mod.name}</span>
                                  {isSelected && <span>✓</span>}
                              </button>
                          );
                      })}
                    </div>
                  </div>

                  <div className="border-t border-zinc-200 pt-6">
                    <h3 className="text-sm font-black text-red-500 uppercase tracking-widest mb-3">🚫 Sin...</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {restricciones.map((mod:any) => {
                          const isSelected = (wizardData[wizardStep] || []).find((m:any) => m.id === mod.id);
                          return (
                              <button key={mod.id} onClick={() => handleToggleModifier(mod, true)} className={`p-4 rounded-xl border text-xs font-black transition-all text-left flex justify-between items-center ${isSelected ? 'bg-red-500 border-red-500 text-white shadow-sm' : 'bg-white border-zinc-200 text-zinc-600 hover:border-red-200'}`}>
                                  <span className="line-clamp-2 pr-2">{mod.name}</span>
                                  {isSelected && <span>✓</span>}
                              </button>
                          );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {(OPCIONES as any)[getProductSteps(activeProduct)[wizardStep].type]
                    .filter((opt: string) => {
                       if (getProductSteps(activeProduct)[wizardStep].type === 'PAPAS_MARUCHAN') {
                          const baseChoice = wizardData[0]?.[0];
                          if (baseChoice === 'Construpapas') return OPCIONES.PAPAS.includes(opt) && isOptionAvailable(opt);
                          if (baseChoice === 'Obra Maestra') return OPCIONES.MARUCHAN.includes(opt) && isOptionAvailable(opt);
                       }
                       return isOptionAvailable(opt);
                    })
                    .map((opt: string) => {
                        const stepDef = getProductSteps(activeProduct)[wizardStep];
                        const isMultiple = stepDef.max && stepDef.max > 1;
                        const isSelected = (wizardData[wizardStep] || []).includes(opt);
                        
                        return (
                            <button 
                                key={opt} 
                                onClick={() => {
                                    if(isMultiple) { handleToggleModifier(opt, true, stepDef.max); } 
                                    else { setWizardData({...wizardData, [wizardStep]: [opt]}); }
                                }} 
                                className={`p-4 rounded-xl border text-sm font-black transition-all text-left flex justify-between items-center ${isSelected ? 'bg-zinc-900 border-zinc-900 text-white shadow-sm' : 'bg-white border-zinc-200 text-zinc-700 hover:border-zinc-300'}`}
                            >
                                {opt}
                                {isSelected && <span>✓</span>}
                            </button>
                        );
                    })}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-zinc-100 bg-white sticky bottom-0 flex gap-3 z-10 shadow-[0_-5px_20px_rgba(0,0,0,0.05)]">
              {wizardStep > 0 && (
                <button onClick={() => setWizardStep(prev => prev - 1)} className="bg-zinc-100 text-zinc-600 w-14 rounded-xl font-black text-xl flex items-center justify-center hover:bg-zinc-200">
                  ←
                </button>
              )}
              <button onClick={handleNextOrFinish} disabled={getProductSteps(activeProduct)[wizardStep].type !== 'TOPPINGS' && !(wizardData[wizardStep] && wizardData[wizardStep].length > 0)} className="flex-1 bg-yellow-400 text-zinc-900 py-4 rounded-xl font-black text-sm uppercase disabled:opacity-50 transition-transform active:scale-[0.98] shadow-sm">
                {(() => {
                    const isLastStep = wizardStep === getProductSteps(activeProduct).length - 1;
                    const stepDef = getProductSteps(activeProduct)[wizardStep];
                    let extraLabel = "";
                    
                    if (stepDef && stepDef.type === 'TOPPINGS') {
                        const currentSelections = wizardData[wizardStep] || [];
                        const paidCount = currentSelections.filter((s:any) => s.type === 'QUESO' || s.type === 'ADEREZO' || s.type === 'POLVO').length;
                        let baseCount = paidCount;
                        if (stepDef.firstToppingFree && baseCount > 0) baseCount -= 1;
                        if (!step.isFree) {
                          if (baseCount === 1) extraLabel = " (+$15)";
                          if (baseCount === 2) extraLabel = " (+$25)";
                          if (baseCount >= 3) extraLabel = " (+$35)";
                        }
                    }
                    return isLastStep ? `${editingCartId ? 'Guardar' : 'Agregar'}${extraLabel}` : `Siguiente${extraLabel}`;
                })()}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CARRITO FLOTANTE (BOTTOM SHEET) */}
      {cart.length > 0 && !activeProduct && (
        <>
            {isCartOpen ? (
                <div className="fixed inset-0 bg-zinc-900/60 z-40 flex flex-col justify-end animate-in fade-in duration-200">
                    <div className="flex-1 w-full" onClick={() => setIsCartOpen(false)}></div>
                    <div className="bg-white w-full max-w-2xl mx-auto rounded-t-[2rem] flex flex-col max-h-[80vh] animate-in slide-in-from-bottom-8 shadow-[0_-20px_50px_rgba(0,0,0,0.1)]">
                        <div className="p-5 border-b border-zinc-100 flex justify-between items-center">
                            <h2 className="text-lg font-black text-zinc-900">Tu Carrito</h2>
                            <button onClick={() => setIsCartOpen(false)} className="text-zinc-400 font-bold bg-zinc-100 px-3 py-1 rounded-full text-xs">Ocultar ↓</button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-zinc-50">
                            {cart.map(item => (
                                // 🌟 CORRECCIÓN FINAL: Eliminar ya funciona usando cartId en todo el Bottom Sheet
                                <div key={item.cartId} className="bg-white border border-zinc-200 p-4 rounded-xl relative shadow-sm">
                                    <div className="flex justify-between items-start pr-6 mb-1">
                                        <p className="font-black text-zinc-900 text-sm leading-tight">{item.product.name}</p>
                                        <p className="font-black text-zinc-900 text-sm">${item.totalPrice.toFixed(2)}</p>
                                    </div>
                                    {item.notes && <p className="text-xs text-zinc-500 font-medium leading-snug">{item.notes.split(' | ').join(', ')}</p>}
                                    <div className="flex gap-3 mt-3">
                                        <button onClick={() => handleEditCartItem(item)} className="text-blue-500 text-xs font-bold bg-blue-50 px-3 py-1 rounded-md">Editar</button>
                                        <button onClick={() => removeFromCart(item.cartId)} className="text-red-500 text-xs font-bold bg-red-50 px-3 py-1 rounded-md">Eliminar</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="p-5 bg-white border-t border-zinc-100 flex flex-col gap-3">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-zinc-500 font-bold text-sm">Subtotal:</span>
                                <span className="text-xl font-black text-zinc-900">${getTotal().toFixed(2)}</span>
                            </div>
                            <button onClick={() => { setIsCartOpen(false); setAppState('CHECKOUT'); window.scrollTo(0,0); }} className="w-full bg-zinc-900 text-white py-4 rounded-xl font-black text-base transition-transform active:scale-[0.98] shadow-md">
                                Finalizar Pedido
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-xl border-t border-zinc-200 z-30 shadow-[0_-10px_20px_rgba(0,0,0,0.05)]">
                    <div className="max-w-2xl mx-auto flex gap-3">
                        <button onClick={() => setIsCartOpen(true)} className="bg-zinc-100 border border-zinc-200 text-zinc-900 px-6 py-4 rounded-xl font-black flex items-center justify-center gap-2 active:bg-zinc-200 transition-colors">
                            <span>🛒</span>
                            <span className="bg-zinc-900 text-white text-[10px] px-2 py-0.5 rounded-full">{cart.length}</span>
                        </button>
                        <button onClick={() => { setAppState('CHECKOUT'); window.scrollTo(0,0); }} className="flex-1 bg-yellow-400 text-zinc-900 py-4 rounded-xl font-black text-base transition-transform active:scale-[0.98] flex justify-between items-center px-6 shadow-sm">
                            <span>Pagar</span>
                            <span>${getTotal().toFixed(2)}</span>
                        </button>
                    </div>
                </div>
            )}
        </>
      )}

    </div>
  );
}
