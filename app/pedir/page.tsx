// @ts-nocheck
/* eslint-disable */
'use client';
import { useState, useEffect } from 'react';
import { useCartStore } from '@/store/cart';

// IMPORTAMOS EL SDK DE MERCADO PAGO PARA FRONTEND
import { initMercadoPago, Wallet } from '@mercadopago/sdk-react';

// 🌟 LLAVE PÚBLICA INYECTADA
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

export default function PedirPage() {
  const { cart, addToCart, removeFromCart, getTotal } = useCartStore();
  
  const [dbData, setDbData] = useState({ products: [], modifiers: [], inventoryItems: [] });
  const [dataLoading, setDataLoading] = useState(true);

  // 🌟 CORRECCIÓN DE LA LLAMADA AL CATÁLOGO
  useEffect(() => {
      const fetchInitialData = async () => {
          try {
              // Usamos el action que el Kiosco usa para traer productos y stock real
              const res = await fetch('/api/admin?action=kiosco_sync');
              const json = await res.json();
              if (json.success) {
                  // Ajustamos para que lea 'products' o 'items' según lo que mande tu API
                  setDbData({ 
                    products: json.products || json.items || [], 
                    modifiers: json.modifiers || [], 
                    inventoryItems: json.inventoryItems || [] 
                  });
              }
          } catch(e) { console.error("Error al cargar menú", e); }
          setDataLoading(false);
      };
      fetchInitialData();
  }, []);

  const visibleProducts = dbData.products.filter(p => !p.name.toLowerCase().includes('ramaiztro') && p.isAvailable);
  const polvos = dbData.modifiers.filter(m => m.type === 'POLVO' && m.isAvailable);
  const aderezos = dbData.modifiers.filter(m => m.type === 'ADEREZO' && m.isAvailable);
  const quesos = dbData.modifiers.filter(m => m.type === 'QUESO' && m.isAvailable);
  const restricciones = dbData.modifiers.filter(m => m.type === 'RESTRICCION' && m.isAvailable);
  const chiles = dbData.modifiers.filter(m => m.type === 'CHILE' && m.isAvailable);
  const inventoryItems = dbData.inventoryItems;

  const [appState, setAppState] = useState<'MENU' | 'CHECKOUT' | 'SUCCESS'>('MENU');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [activeProduct, setActiveProduct] = useState<any>(null);
  const [wizardStep, setWizardStep] = useState(0);
  const [wizardData, setWizardData] = useState<any>({}); 

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
  const [showPrivacy, setShowPrivacy] = useState(false);

  const [couponCode, setCouponCode] = useState('');
  const [activeCoupon, setActiveCoupon] = useState<any>(null);
  const [couponError, setCouponError] = useState('');

  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [isClosed, setIsClosed] = useState(false);
  const successTimeoutRef = useState<NodeJS.Timeout | null>(null);

  // Lógica de horarios
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

  // Puntos de lealtad
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

  const subtotal = getTotal();

  const getProductEmoji = (name: string, category: string) => {
      if (category === 'COMBO') return '📦';
      if (category === 'ESQUITE') return '🌽';
      if (category === 'BEBIDA') return '🥤';
      if (name.toLowerCase().includes('maruchan')) return '🍜';
      if (name.toLowerCase().includes('papa')) return '🔥';
      return '🍬';
  }

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
      } else { notesLines.push(`${step.t}: ${selections[0]}`); }
    });
    addToCart(activeProduct, totalExtra, notesLines.join(' | '));
    setActiveProduct(null);
  };

  const generatePaymentLink = async () => {
    if (!customerName || customerPhone.length !== 10 || !customerEmail || !customerEmail.includes('@')) {
        return alert("¡Casi listo! Por favor, ingresa tu Nombre, WhatsApp y Correo para enviarte tu recibo.");
    }
    setIsLoadingPayment(true);
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          cart, totalAmount: totalNeto, pointsDiscount: actualDiscount, 
          pointsDeducted: selectedReward?.pts || 0, customerName, 
          customerEmail, customerPhone, isPickToGo: true,
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
    const prodItem = dbData.products.find(p => p.name.toLowerCase() === optName.toLowerCase());
    if (prodItem) return prodItem.isAvailable;
    return true; 
  };

  if (dataLoading) {
      return <div className="min-h-screen bg-zinc-50 flex items-center justify-center text-zinc-900"><div className="w-8 h-8 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin"></div></div>;
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
        <button onClick={() => window.location.reload()} className="mt-8 bg-black/20 text-white px-8 py-4 rounded-full font-black text-sm">Volver al Menú</button>
      </div>
    );
  }

  // VISTA CHECKOUT
  if (appState === 'CHECKOUT') {
    return (
      <div className="min-h-screen bg-zinc-50 text-zinc-900 pb-40 p-4 max-w-lg mx-auto">
        <header className="bg-white p-4 sticky top-0 z-40 flex items-center gap-4 border-b">
            <button onClick={() => setAppState('MENU')} className="font-bold">←</button>
            <h1 className="text-xl font-black">Completar Pedido</h1>
        </header>
        <div className="mt-6 space-y-6">
            <div className="bg-white p-5 rounded-[1.5rem] shadow-sm border">
                <h2 className="font-black text-lg mb-4">Tu Carrito</h2>
                {cart.map((item) => (
                    <div key={item.id} className="flex justify-between items-start border-b py-3 last:border-0">
                        <div className="flex-1"><p className="font-bold text-sm">{item.product.name}</p></div>
                        <p className="font-black">${item.totalPrice.toFixed(2)}</p>
                    </div>
                ))}
            </div>
            <div className="bg-white p-5 rounded-[1.5rem] shadow-sm border space-y-3">
                <h2 className="font-black text-lg">Tus Datos</h2>
                <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Nombre *" className="w-full bg-zinc-50 border p-3 rounded-xl focus:border-yellow-500 outline-none font-bold"/>
                <input type="tel" value={customerPhone} onChange={e => setCustomerPhone(e.target.value.replace(/\D/g, ''))} maxLength={10} placeholder="WhatsApp *" className="w-full bg-zinc-50 border p-3 rounded-xl focus:border-yellow-500 outline-none font-bold"/>
                <input type="email" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} placeholder="Correo *" className="w-full bg-zinc-50 border p-3 rounded-xl focus:border-yellow-500 outline-none font-bold"/>
            </div>
            <div className="bg-blue-50 p-5 rounded-[1.5rem] border border-blue-100">
                <h2 className="font-black text-lg mb-2 text-blue-900">🕒 ¿A qué hora pasas?</h2>
                <select value={selectedTime} onChange={e => setSelectedTime(e.target.value)} className="w-full bg-white text-blue-900 border border-blue-200 p-4 rounded-xl font-black outline-none focus:border-blue-500 text-base">
                    {availableTimes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
            </div>
        </div>
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 pb-6 z-40">
            <div className="max-w-lg mx-auto">
                <div className="flex justify-between items-end mb-3">
                    <span className="text-zinc-500 font-bold text-sm">Total</span>
                    <span className="text-3xl font-black">${totalNeto.toFixed(2)}</span>
                </div>
                {preferenceId ? (
                    <div className="w-full"><Wallet initialization={{ preferenceId: preferenceId, redirectMode: 'modal' }} /></div>
                ) : (
                    <button onClick={generatePaymentLink} disabled={cart.length === 0 || isLoadingPayment} className="w-full bg-[#009ee3] text-white font-black py-4 rounded-xl shadow-md">
                        {isLoadingPayment ? 'Conectando...' : 'Proceder al Pago'}
                    </button>
                )}
            </div>
        </div>
      </div>
    );
  }

  // VISTA MENÚ PRINCIPAL
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 font-sans relative pb-32">
      <header className="bg-white/80 backdrop-blur-xl border-b sticky top-0 z-30 p-4 text-center">
        <h1 className="text-2xl font-black text-zinc-900 tracking-tighter">MAIZTROS <span className="text-yellow-500">GO</span></h1>
      </header>

      <div className="max-w-2xl mx-auto px-4 space-y-10 pt-6">
        {/* COMBOS */}
        <section>
          <h2 className="text-xl font-black mb-4 flex items-center gap-2">📦 Combos</h2>
          <div className="flex flex-col gap-4">
            {visibleProducts.filter(p => p.category === 'COMBO').map((product) => (
              <div key={product.id} onClick={() => handleProductClick(product)} className="bg-white border rounded-[1.5rem] p-4 flex gap-4 shadow-sm active:scale-[0.98] cursor-pointer">
                <div className="w-20 h-20 bg-yellow-50 rounded-2xl flex items-center justify-center text-3xl shrink-0">
                    {getProductEmoji(product.name, product.category)}
                </div>
                <div className="flex-1 flex flex-col justify-between py-1">
                    <h3 className="font-black text-sm">{product.name}</h3>
                    <div className="flex justify-between items-center">
                        <p className="font-black text-sm">${product.basePrice.toFixed(2)}</p>
                        <span className="bg-zinc-900 text-white text-[10px] font-black px-3 py-1.5 rounded-lg">Agregar</span>
                    </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ESQUITES */}
        <section>
          <h2 className="text-xl font-black mb-4 flex items-center gap-2">🌽 Esquites</h2>
          <div className="flex flex-col gap-4">
            {visibleProducts.filter(p => p.category === 'ESQUITE' || p.category === 'ESPECIALIDAD').map((product) => (
              <div key={product.id} onClick={() => handleProductClick(product)} className="bg-white border rounded-[1.5rem] p-4 flex gap-4 shadow-sm active:scale-[0.98] cursor-pointer">
                <div className="w-20 h-20 bg-zinc-50 rounded-2xl flex items-center justify-center text-3xl shrink-0">
                    {getProductEmoji(product.name, product.category)}
                </div>
                <div className="flex-1 flex flex-col justify-between py-1">
                    <h3 className="font-black text-sm">{product.name}</h3>
                    <div className="flex justify-between items-center">
                        <p className="font-black text-sm">${product.basePrice.toFixed(2)}</p>
                        <span className="bg-zinc-100 text-zinc-600 text-[10px] font-black px-3 py-1.5 rounded-lg">Agregar</span>
                    </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* BEBIDAS */}
        <section>
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
      </div>

      {/* MODAL PERSONALIZAR */}
      {activeProduct && (
        <div className="fixed inset-0 bg-zinc-900/60 flex flex-col justify-end z-50">
          <div className="bg-white w-full max-w-2xl mx-auto rounded-t-[2rem] flex flex-col max-h-[85vh] shadow-2xl">
            <div className="p-5 border-b flex justify-between items-center">
              <h2 className="text-xl font-black">{activeProduct.name}</h2>
              <button onClick={() => setActiveProduct(null)} className="font-bold">✕</button>
            </div>
            <div className="p-5 overflow-y-auto flex-1 bg-zinc-50">
               {/* Aquí renderizamos las opciones según wizardStep */}
               <p className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-4">Paso {wizardStep + 1}</p>
               <h3 className="text-lg font-black mb-6">{getProductSteps(activeProduct)[wizardStep].t}</h3>
               
               <div className="grid grid-cols-1 gap-3">
                  {(OPCIONES as any)[getProductSteps(activeProduct)[wizardStep].type]?.map(opt => (
                      <button key={opt} onClick={() => setWizardData({...wizardData, [wizardStep]: [opt]})} className={`p-4 rounded-xl border text-left font-bold ${wizardData[wizardStep]?.[0] === opt ? 'bg-zinc-900 text-white' : 'bg-white'}`}>{opt}</button>
                  ))}
                  {getProductSteps(activeProduct)[wizardStep].type === 'TOPPINGS' && (
                      <p className="text-center text-zinc-400 text-xs italic">Preparación clásica de Maiztros</p>
                  )}
               </div>
            </div>
            <div className="p-4 border-t flex gap-3">
                {wizardStep > 0 && <button onClick={() => setWizardStep(prev => prev - 1)} className="bg-zinc-100 px-6 py-4 rounded-xl font-bold">Atrás</button>}
                <button onClick={handleNextOrFinish} className="flex-1 bg-yellow-400 py-4 rounded-xl font-black uppercase text-sm">Siguiente</button>
            </div>
          </div>
        </div>
      )}

      {/* BARRA CARRITO FLOTANTE */}
      {cart.length > 0 && !activeProduct && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-xl border-t z-30">
            <button onClick={() => setAppState('CHECKOUT')} className="w-full bg-yellow-400 py-4 rounded-xl font-black text-base flex justify-between px-6 shadow-lg">
                <span>Ver Pedido ({cart.length})</span>
                <span>${getTotal().toFixed(2)}</span>
            </button>
        </div>
      )}
    </div>
  );
}
