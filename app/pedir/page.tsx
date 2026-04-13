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

export default function PedirClient({ products, modifiers }: { products: any[], modifiers: any[] }) {
  const { cart, addToCart, removeFromCart, getTotal } = useCartStore();
  
  const visibleProducts = products?.filter(p => !p.name.toLowerCase().includes('ramaiztro') && p.isAvailable) || [];

  const polvos = modifiers?.filter(m => m.type === 'POLVO' && m.isAvailable) || [];
  const aderezos = modifiers?.filter(m => m.type === 'ADEREZO' && m.isAvailable) || [];
  const quesos = modifiers?.filter(m => m.type === 'QUESO' && m.isAvailable) || [];
  const restricciones = modifiers?.filter(m => m.type === 'RESTRICCION' && m.isAvailable) || [];
  const chiles = modifiers?.filter(m => m.type === 'CHILE' && m.isAvailable) || [];

  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  
  const [activeProduct, setActiveProduct] = useState<any>(null);
  const [wizardStep, setWizardStep] = useState(0);
  const [wizardData, setWizardData] = useState<any>({}); 
  
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  
  // Pick To Go Schedule
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [isClosed, setIsClosed] = useState(false);
  const [isLoadingPayment, setIsLoadingPayment] = useState(false);

  // Rewards & Coupons
  const [loyaltyPoints, setLoyaltyPoints] = useState(0);
  const [selectedReward, setSelectedReward] = useState<any>(null);
  const [isCheckingPoints, setIsCheckingPoints] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [activeCoupon, setActiveCoupon] = useState<any>(null);
  const [couponError, setCouponError] = useState('');

  useEffect(() => {
    fetch('/api/admin?action=kiosco_sync')
      .then(res => res.json())
      .then(data => { if(data.success) setInventoryItems(data.inventoryItems); })
      .catch(() => console.log("Error cargando inventario físico"));
  }, []);

  // ==========================================
  // LÓGICA DE HORARIOS (MÉXICO) - INICIA 6:15 PM
  // ==========================================
  useEffect(() => {
    const calculateTimes = () => {
        const times: string[] = [];
        const now = new Date(new Date().toLocaleString("en-US", {timeZone: "America/Mexico_City"}));
        
        const startHour = 18; // 6 PM
        const startMin = 15;  // 15 MIN
        const endHour = 22;   // 10 PM
        
        let currentSlot = new Date(now);
        currentSlot.setHours(startHour, startMin, 0, 0);

        // Si ya pasaron las 10 PM, no hay servicio
        if (now.getHours() >= endHour) {
            setIsClosed(true);
            return;
        }

        // Si la hora actual es mayor a las 6:15 PM, el primer slot es en 20 minutos
        if (now > currentSlot) {
            currentSlot = new Date(now.getTime() + 20 * 60000); 
            const remainder = 15 - (currentSlot.getMinutes() % 15);
            currentSlot = new Date(currentSlot.getTime() + remainder * 60000);
        }

        const endSlot = new Date(now);
        endSlot.setHours(endHour, 0, 0, 0);

        while (currentSlot <= endSlot) {
            times.push(currentSlot.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true }));
            currentSlot = new Date(currentSlot.getTime() + 15 * 60000); // Brincos de 15 min
        }

        setAvailableTimes(times);
        if (times.length > 0) setSelectedTime(times[0]);
    };

    calculateTimes();
    const interval = setInterval(calculateTimes, 60000);
    return () => clearInterval(interval);
  }, []);

  // ==========================================
  // LÓGICA DE LEALTAD Y CUPONES
  // ==========================================
  useEffect(() => {
    if (customerPhone.length === 10) {
      setIsCheckingPoints(true);
      fetch(`/api/customer?phone=${customerPhone}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setLoyaltyPoints(data.points);
            if(data.name && !customerName) setCustomerName(data.name); 
          } else {
            setLoyaltyPoints(0); setSelectedReward(null); setActiveCoupon(null);
          }
          setIsCheckingPoints(false);
        });
    } else {
      setLoyaltyPoints(0); setSelectedReward(null); setActiveCoupon(null);
    }
  }, [customerPhone]);

  const subtotal = getTotal();

  useEffect(() => {
    if (activeCoupon && activeCoupon.minAmount > 0 && subtotal < activeCoupon.minAmount) {
      setActiveCoupon(null); setCouponError(`El cupón requiere mínimo de compra de $${activeCoupon.minAmount}`);
    }
    if (selectedReward && subtotal < selectedReward.minSpend) {
        setSelectedReward(null);
    }
  }, [subtotal, activeCoupon, selectedReward]);

  const handleApplyCoupon = async () => {
    setCouponError('');
    if (!couponCode) return;
    if (customerPhone.length !== 10) return setCouponError('⚠️ Debes ingresar tu celular arriba para poder usar cupones.');

    const res = await fetch(`/api/customer?phone=${customerPhone}`);
    const data = await res.json();
    
    if (data.success && data.activeCoupons) { 
      const coupon = data.activeCoupons.find((c:any) => c.code === couponCode.toUpperCase());
      if (!coupon) return setCouponError('❌ Cupón inválido o expirado.');

      const alreadyUsed = data.history.some((o:any) => o.couponCode === coupon.code);
      if (alreadyUsed && coupon.code !== 'MAIZTROVIP') return setCouponError('⚠️ Ya utilizaste este cupón antes. Son de un solo uso.');
      if (coupon.minAmount > 0 && subtotal < coupon.minAmount) {
        setCouponError(`⚠️ Compra mínima de $${coupon.minAmount} requerida.`);
        setActiveCoupon(null);
      } else {
        setActiveCoupon(coupon); setSelectedReward(null); 
      }
    } else { setCouponError('❌ Error al validar tu cuenta.'); }
  };

  let totalAfterCoupon = subtotal;
  if (activeCoupon) {
    if (activeCoupon.discountType === 'FIXED') totalAfterCoupon = Math.max(0, subtotal - activeCoupon.discount);
    if (activeCoupon.discountType === 'PERCENTAGE') totalAfterCoupon = subtotal - (subtotal * (activeCoupon.discount / 100));
  }

  const actualDiscount = selectedReward && !activeCoupon ? Math.min(selectedReward.discount, totalAfterCoupon) : 0;
  const totalNeto = totalAfterCoupon - actualDiscount;

  // ==========================================
  // LÓGICA DE PRODUCTOS (WIZARD IGUAL AL KIOSCO)
  // ==========================================
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

  const handleProductClick = (product: any) => {
    const steps = getProductSteps(product);
    if (steps.length === 0) { 
        addToCart(product, 0, product.name); 
        return; 
    }
    setActiveProduct(product); setWizardStep(0); setWizardData({}); 
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
    setActiveProduct(null);
  };

  const isOptionAvailable = (optName: string) => {
    const invItem = inventoryItems.find(i => i.name.toLowerCase() === optName.toLowerCase());
    if (invItem) return invItem.isAvailable && invItem.stock > 0;
    const prodItem = products?.find(p => p.name.toLowerCase() === optName.toLowerCase());
    if (prodItem) return prodItem.isAvailable;
    return true; 
  };

  const handleCheckoutMP = async () => {
      if (!customerName || customerPhone.length !== 10) return alert("Por favor, ingresa tu Nombre y tu WhatsApp a 10 dígitos para avisarte de tu orden.");
      if (cart.length === 0) return alert("Tu carrito está vacío.");
      if (!selectedTime) return alert("Por favor selecciona una hora para pasar por tu pedido.");

      setIsLoadingPayment(true);
      try {
          // Guardamos la orden en BD con status AWAITING_PAYMENT
          const payload = { 
            cart, 
            totalAmount: totalNeto, 
            pointsDiscount: actualDiscount, 
            pointsDeducted: selectedReward?.pts || 0, 
            couponCode: activeCoupon?.code || null, 
            tipAmount: 0, 
            customerName, 
            customerPhone, 
            paymentMethod: 'TERMINAL', // Pagado digitalmente
            orderType: 'PICK_TO_GO',   // 🌟 Gatillo para que brille morado en caja
            pickupTime: selectedTime,
            orderNotes
          };

          const res = await fetch('/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
          const orderData = await res.json();

          if (orderData.success) {
              // Aquí en producción conectas la preferencia de MercadoPago y rediriges.
              // window.location.href = data.mercadopago_init_point;
              alert(`¡Redirigiendo a Mercado Pago para cobrar $${totalNeto.toFixed(2)}!\n\nUna vez pagado, tu pedido aparecerá en la caja con hora de entrega: ${selectedTime}`);
              useCartStore.setState({ cart: [] });
              window.location.reload();
          } else {
              alert("Hubo un error al procesar tu pedido. Intenta de nuevo.");
          }
      } catch (e) {
          alert("Error de conexión con el servidor.");
      }
      setIsLoadingPayment(false);
  };

  if (isClosed) {
    return (
        <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-6 text-center font-sans">
            <span className="text-[10rem] mb-6 drop-shadow-[0_0_30px_rgba(250,204,21,0.5)]">🌙</span>
            <h1 className="text-5xl font-black text-yellow-400 mb-4 tracking-tighter">Cerrado por hoy</h1>
            <p className="text-zinc-400 text-xl font-medium max-w-md">Nuestros elotes están descansando. Abrimos mañana a las 5:30 PM (Puedes programar Pick To Go a partir de las 6:15 PM). ¡Te esperamos!</p>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans flex flex-col lg:flex-row relative">
      
      {/* LADO IZQUIERDO: MENÚ ESCROLEABLE */}
      <div className="flex-1 lg:w-2/3 h-screen overflow-y-auto p-6 md:p-10 scroll-smooth pb-40 lg:pb-10">
        <header className="mb-10 flex flex-col md:flex-row justify-between md:items-end gap-4">
            <div>
                <h1 className="text-4xl md:text-5xl font-black text-yellow-400 tracking-tighter">MAIZTROS <span className="text-white">GO</span></h1>
                <p className="text-sm text-zinc-400 font-bold uppercase tracking-widest mt-1">Pide, Paga y Pasa por él ⚡</p>
            </div>
            {/* Accesos Rápidos Menú */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide w-full md:w-auto">
                <a href="#combos" className="bg-zinc-900 px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest whitespace-nowrap border border-zinc-800 hover:border-yellow-400 transition-colors">Combos</a>
                <a href="#esquites" className="bg-zinc-900 px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest whitespace-nowrap border border-zinc-800 hover:border-yellow-400 transition-colors">Esquites</a>
                <a href="#bebidas" className="bg-zinc-900 px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest whitespace-nowrap border border-zinc-800 hover:border-yellow-400 transition-colors">Bebidas</a>
            </div>
        </header>

        <section id="combos" className="mb-16 scroll-mt-20">
          <h2 className="text-2xl font-black mb-6 flex items-center gap-3"><span className="text-3xl">📦</span> Combos Maiztros</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {visibleProducts.filter(p => p.category === 'COMBO').map((product) => (
              <div key={product.id} onClick={() => handleProductClick(product)} className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 hover:border-yellow-400 rounded-3xl p-6 transition-all cursor-pointer flex flex-col justify-between">
                <div>
                  <h3 className="text-xl font-black text-white mb-2">{product.name}</h3>
                  <p className="text-zinc-400 text-sm font-medium">{getProductDesc(product.name)}</p>
                </div>
                <div className="mt-6 flex justify-between items-center">
                    <p className="text-yellow-400 font-black text-2xl">${product.basePrice.toFixed(2)}</p>
                    <span className="bg-yellow-400 text-zinc-950 px-4 py-2 rounded-xl font-black text-sm active:scale-95 transition-transform">+ Agregar</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="esquites" className="mb-16 scroll-mt-20">
          <h2 className="text-2xl font-black mb-6 text-zinc-300 uppercase tracking-widest border-b border-zinc-800 pb-3">🌽 Esquites y Especiales</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleProducts.filter(p => p.category === 'ESQUITE' || p.category === 'ESPECIALIDAD').map((product) => (
              <div key={product.id} onClick={() => handleProductClick(product)} className="bg-zinc-900 border border-zinc-800 hover:border-yellow-400/50 rounded-3xl p-5 transition-all cursor-pointer flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-black text-white mb-1">{product.name}</h3>
                  <p className="text-zinc-500 text-xs font-medium">{getProductDesc(product.name)}</p>
                </div>
                <div className="mt-4 flex justify-between items-center">
                    <p className="text-white font-black text-xl">${product.basePrice.toFixed(2)}</p>
                    <span className="text-yellow-400 font-black text-sm px-2">Agregar ➔</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="bebidas" className="mb-16 scroll-mt-20">
          <h2 className="text-2xl font-black mb-6 text-blue-400 uppercase tracking-widest border-b border-zinc-800 pb-3">🥤 Bebidas y Otros</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleProducts.filter(p => p.category === 'BEBIDA' || p.category === 'ANTOJO').map((product) => (
              <div key={product.id} onClick={() => handleProductClick(product)} className="bg-zinc-900 border border-zinc-800 hover:border-blue-400/50 rounded-3xl p-5 transition-all cursor-pointer flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-black text-white mb-1">{product.name}</h3>
                </div>
                <div className="mt-4 flex justify-between items-center">
                    <p className="text-white font-black text-xl">${product.basePrice.toFixed(2)}</p>
                    <span className="text-blue-400 font-black text-sm px-2">Agregar ➔</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* LADO DERECHO: CARRITO FIJO (CHECKOUT) */}
      <div className="w-full lg:w-1/3 bg-zinc-950 lg:bg-zinc-900/50 border-l border-zinc-800 flex flex-col h-auto lg:h-screen sticky top-0 shadow-[-20px_0_50px_rgba(0,0,0,0.5)]">
          <div className="p-6 bg-zinc-900 border-b border-zinc-800 flex justify-between items-center z-10">
              <h2 className="text-xl font-black text-white flex items-center gap-2">🛒 Tu Orden</h2>
              <span className="bg-yellow-400 text-zinc-950 font-black px-3 py-1 rounded-full text-sm">{cart.length}</span>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {cart.length === 0 ? (
                  <div className="text-center py-20 opacity-50 flex flex-col items-center">
                      <span className="text-6xl mb-4">🥡</span>
                      <p className="font-bold text-zinc-400">Aún no hay antojitos aquí.</p>
                  </div>
              ) : (
                  cart.map(item => (
                      <div key={item.cartId} className="bg-zinc-950 border border-zinc-800 p-4 rounded-2xl relative group">
                          <div className="flex justify-between items-start mb-2 pr-6">
                              <p className="font-black text-white text-sm">{item.name}</p>
                              <p className="font-black text-yellow-400">${item.totalPrice.toFixed(2)}</p>
                          </div>
                          {item.notes && <p className="text-xs text-zinc-500 font-medium leading-relaxed">{item.notes}</p>}
                          <button onClick={() => removeFromCart(item.cartId)} className="absolute top-4 right-4 text-zinc-600 hover:text-red-500 font-black">&times;</button>
                      </div>
                  ))
              )}

              {/* FORULARIO CLIENTE Y LEALTAD */}
              <div className="bg-zinc-950 border border-zinc-800 p-5 rounded-2xl mt-6">
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-3">Tus Datos (Para avisarte)</p>
                  <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Tu Nombre *" className="w-full bg-zinc-900 border border-zinc-700 p-3 rounded-xl text-white outline-none focus:border-yellow-400 text-sm mb-3 font-bold" />
                  <div className="relative">
                      <input type="tel" value={customerPhone} onChange={e => setCustomerPhone(e.target.value.replace(/\D/g, ''))} maxLength={10} placeholder="WhatsApp (10 dígitos) *" className="w-full bg-zinc-900 border border-zinc-700 p-3 rounded-xl text-white outline-none focus:border-yellow-400 text-sm font-bold" />
                      {isCheckingPoints && <span className="absolute right-3 top-3 text-yellow-500 animate-spin">⏳</span>}
                  </div>
                  
                  {customerPhone.length === 10 && loyaltyPoints > 0 && (
                      <div className="mt-4 border-t border-zinc-800 pt-4">
                          <p className="text-xs text-yellow-400 font-bold mb-2">Tienes {loyaltyPoints} puntos.</p>
                          <div className="space-y-2">
                              {REWARDS.map(reward => {
                                  const isAffordable = loyaltyPoints >= reward.pts && subtotal >= reward.minSpend && !activeCoupon;
                                  const isSelected = selectedReward?.id === reward.id;
                                  return (
                                      <button key={reward.id} disabled={!isAffordable} onClick={() => setSelectedReward(isSelected ? null : reward)} className={`w-full p-2 rounded-lg border text-left flex justify-between items-center text-xs transition-all ${!isAffordable ? 'opacity-50 border-zinc-800 bg-zinc-950' : isSelected ? 'bg-yellow-400 border-yellow-400 text-zinc-950 font-black' : 'bg-zinc-900 border-yellow-500/30 text-white font-bold'}`}>
                                          <span>{reward.label} ({reward.pts} pts)</span>
                                          <span>{isSelected ? '✅' : !isAffordable ? '🔒' : '💸'}</span>
                                      </button>
                                  );
                              })}
                          </div>
                      </div>
                  )}

                  <div className="mt-4 flex gap-2 border-t border-zinc-800 pt-4">
                      <input type="text" placeholder="Promo / Cupón" value={couponCode} onChange={e => setCouponCode(e.target.value.toUpperCase())} disabled={!!selectedReward} className="w-full bg-zinc-900 border border-zinc-700 p-2 rounded-lg focus:border-purple-400 outline-none uppercase font-bold text-center tracking-widest text-xs disabled:opacity-50"/>
                      <button onClick={handleApplyCoupon} disabled={!!selectedReward} className="bg-purple-600 hover:bg-purple-500 disabled:bg-zinc-700 text-white px-3 rounded-lg font-black text-xs">Aplicar</button>
                  </div>
                  {couponError && <p className="text-red-400 text-[10px] font-bold text-center mt-2">{couponError}</p>}
              </div>

              {/* HORARIOS */}
              <div className="bg-blue-900/10 border border-blue-500/30 p-5 rounded-2xl">
                  <p className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-2">🕒 Elige tu hora de recolección</p>
                  <select value={selectedTime} onChange={e => setSelectedTime(e.target.value)} className="w-full bg-blue-900/20 text-blue-300 border border-blue-500/50 p-3 rounded-xl font-black outline-none focus:border-blue-400 appearance-none text-center text-sm">
                      {availableTimes.map(t => (
                          <option key={t} value={t} className="bg-zinc-900 text-white">Pasaré a las {t}</option>
                      ))}
                  </select>
                  <p className="text-[10px] text-blue-400/70 font-medium text-center mt-2 leading-tight">Prepararemos tu pedido para que esté caliente y listo exactamente a esta hora.</p>
              </div>

              <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 block mb-1">Notas Generales (Opcional)</label>
                  <textarea value={orderNotes} onChange={e => setOrderNotes(e.target.value)} placeholder="Ej. Manden servilletas extra..." className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-white outline-none focus:border-zinc-600 resize-none h-16"/>
              </div>
          </div>

          <div className="p-6 bg-zinc-950 border-t border-zinc-800 z-10 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
              <div className="flex justify-between items-end mb-4">
                  <span className="text-zinc-500 font-black uppercase tracking-widest text-xs">Total a Pagar</span>
                  <span className="text-4xl font-black text-white">${totalNeto.toFixed(2)}</span>
              </div>
              <button 
                  onClick={handleCheckoutMP} 
                  disabled={cart.length === 0 || isLoadingPayment}
                  className="w-full flex items-center justify-center gap-3 bg-[#009ee3] hover:bg-[#008cc9] text-white font-black py-4 rounded-xl text-lg transition-all active:scale-95 shadow-[0_0_20px_rgba(0,158,227,0.3)] disabled:opacity-50 disabled:bg-zinc-800 disabled:shadow-none"
              >
                  {isLoadingPayment ? 'Redirigiendo...' : '💳 Pagar con Mercado Pago'}
              </button>
          </div>
      </div>

      {/* MODAL WIZARD DE PRODUCTO (IDÉNTICO AL KIOSCO) */}
      {activeProduct && getProductSteps(activeProduct)[wizardStep] && (
        <div className="fixed inset-0 bg-black/95 flex justify-center items-center p-4 z-50 backdrop-blur-md">
          <div className="bg-zinc-950 border border-zinc-800 w-full max-w-4xl rounded-[3rem] flex flex-col shadow-2xl overflow-hidden h-[90vh] md:h-auto md:max-h-[90vh]">
            <div className="p-8 border-b border-zinc-800 flex justify-between items-center bg-zinc-900 sticky top-0 z-10">
              <div>
                <p className="text-yellow-400 font-bold tracking-widest uppercase text-sm mb-2">Paso {wizardStep + 1} de {getProductSteps(activeProduct).length}</p>
                <h2 className="text-3xl font-black text-white">{getProductSteps(activeProduct)[wizardStep].t}</h2>
              </div>
              <button onClick={() => setActiveProduct(null)} className="bg-zinc-800 text-zinc-400 h-14 w-14 rounded-full flex items-center justify-center text-2xl font-bold hover:text-white hover:bg-zinc-700 transition-colors">✕</button>
            </div>
            
            <div className="p-8 overflow-y-auto flex-1 space-y-10">
              {getProductSteps(activeProduct)[wizardStep].type === 'TOPPINGS' ? (
                <div className="space-y-8 animate-in fade-in duration-300">
                  <div className="bg-yellow-400/10 border border-yellow-400/30 p-6 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
                      <div>
                          <h4 className="text-yellow-400 font-black text-lg mb-1 flex items-center gap-2">🧀 Toppings Especiales</h4>
                          <p className="text-sm text-zinc-300 font-bold">
                             {getProductSteps(activeProduct)[wizardStep].firstToppingFree ? '🎁 ¡Tu primer topping es GRATIS! Después:' : 'Agrega todo el sabor que quieras por un costo extra:'}
                          </p>
                      </div>
                      <div className="flex gap-4 text-xs font-black text-yellow-500 bg-zinc-950 p-3 rounded-xl border border-yellow-500/20 whitespace-nowrap">
                         <span>1 x $15</span><span>2 x $25</span><span>3+ x $35</span>
                      </div>
                  </div>

                  <div className="space-y-8 border-b border-zinc-800 pb-10">
                    {[ {t: '1. Aderezos Extras', m: aderezos}, {t: '2. Ponle Queso', m: quesos}, {t: '3. Polvito de Papas', m: polvos} ].map(sec => (
                      <div key={sec.t}>
                        <h3 className="text-lg font-black text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-yellow-400"></span>{sec.t}</h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          {sec.m.map((mod:any) => (
                            <button key={mod.id} onClick={() => handleToggleModifier(mod)} className={`p-4 rounded-2xl border-2 text-sm md:text-base font-black transition-all ${(wizardData[wizardStep] || []).find((m:any) => m.id === mod.id) ? 'bg-yellow-400 text-zinc-950 border-yellow-400 scale-[0.98]' : 'bg-zinc-900 border-zinc-700 hover:border-zinc-500 text-zinc-300'}`}>{mod.name}</button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-8 pt-4">
                    <div>
                      <h3 className="text-xl font-black text-green-400 uppercase tracking-widest mb-4 flex items-center gap-2">🌶️ Barra Libre (¡Gratis!)</h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {chiles.map((mod:any) => (
                          <button key={mod.id} onClick={() => handleToggleModifier(mod)} className={`p-4 rounded-2xl border-2 text-sm md:text-base font-black transition-all ${(wizardData[wizardStep] || []).find((m:any) => m.id === mod.id) ? 'bg-green-500 text-zinc-950 border-green-500 scale-[0.98]' : 'bg-zinc-900 border-zinc-700 hover:border-green-500/50 text-zinc-300'}`}>{mod.name}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-red-400 uppercase tracking-widest mb-4 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-red-400"></span>Restricciones (Sin...)</h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {restricciones.map((mod:any) => (
                          <button key={mod.id} onClick={() => handleToggleModifier(mod)} className={`p-4 rounded-2xl border-2 text-sm md:text-base font-black transition-all ${(wizardData[wizardStep] || []).find((m:any) => m.id === mod.id) ? 'bg-red-500 text-white border-red-500 scale-[0.98]' : 'bg-zinc-900 border-zinc-700 hover:border-red-400/50 text-zinc-300'}`}>{mod.name}</button>
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
                    <button key={opt} onClick={() => setWizardData({...wizardData, [wizardStep]: [opt]})} className={`p-5 rounded-2xl border-2 font-black transition-all text-lg ${(wizardData[wizardStep] || []).includes(opt) ? 'bg-yellow-400 text-zinc-950 border-yellow-400 scale-[0.98] shadow-lg' : 'bg-zinc-900 border-zinc-700 hover:border-zinc-500 text-zinc-300'}`}>{opt}</button>
                  ))}
                </div>
              )}
            </div>

            <div className="p-8 border-t border-zinc-800 bg-zinc-900 sticky bottom-0 flex gap-4 z-10">
              {wizardStep > 0 && (
                <button onClick={() => setWizardStep(prev => prev - 1)} className="w-1/3 bg-zinc-800 hover:bg-zinc-700 text-white py-5 rounded-2xl font-black text-lg transition-colors active:scale-[0.98]">
                  ← Atrás
                </button>
              )}
              <button onClick={handleNextOrFinish} disabled={getProductSteps(activeProduct)[wizardStep].type !== 'TOPPINGS' && !(wizardData[wizardStep] && wizardData[wizardStep].length > 0)} className="flex-1 bg-yellow-400 text-zinc-950 py-5 rounded-2xl font-black text-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-yellow-300 active:scale-[0.98] transition-transform">
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
                            if (baseCount === 1) extraLabel = " (+ $15)";
                            if (baseCount === 2) extraLabel = " (+ $25)";
                            if (baseCount >= 3) extraLabel = " (+ $35)";
                        }
                    }
                    return isLastStep ? `Agregar al Carrito${extraLabel} ➔` : `Siguiente${extraLabel} ➔`;
                })()}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
