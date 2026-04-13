// @ts-nocheck
/* eslint-disable */
'use client';
import { useState, useEffect } from 'react';

export default function PedirPage() {
    const [cart, setCart] = useState<any[]>([]);
    const [availableTimes, setAvailableTimes] = useState<string[]>([]);
    const [selectedTime, setSelectedTime] = useState<string>('');
    const [isClosed, setIsClosed] = useState(false);
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [loadingPayment, setLoadingPayment] = useState(false);

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

            // Si ya pasaron las 10 PM, cerramos la tienda por hoy
            if (now.getHours() >= endHour) {
                setIsClosed(true);
                return;
            }

            // Si la hora actual es mayor a las 6:15 PM, el primer slot es en 20 minutos
            if (now > currentSlot) {
                currentSlot = new Date(now.getTime() + 20 * 60000); // +20 min de preparación
                // Redondear al siguiente múltiplo de 15 min para que se vea limpio
                const remainder = 15 - (currentSlot.getMinutes() % 15);
                currentSlot = new Date(currentSlot.getTime() + remainder * 60000);
            }

            const endSlot = new Date(now);
            endSlot.setHours(endHour, 0, 0, 0);

            while (currentSlot <= endSlot) {
                times.push(currentSlot.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true }));
                currentSlot = new Date(currentSlot.getTime() + 15 * 60000); // Intervalos de 15 min
            }

            setAvailableTimes(times);
            if (times.length > 0) setSelectedTime(times[0]);
        };

        calculateTimes();
        // Recalcular cada minuto por si el cliente deja la página abierta
        const interval = setInterval(calculateTimes, 60000);
        return () => clearInterval(interval);
    }, []);

    // Mock de Menú (Conectarlo a tu /api/menu real después)
    const menuItems = [
        { id: '1', name: 'Construpapa Clásica', price: 120, desc: 'Papas fritas con esquite, mayonesa, queso y chile.', emoji: '🔥' },
        { id: '2', name: 'Esquite Tradicional', price: 65, desc: 'Vaso de medio litro con los toppings clásicos.', emoji: '🌽' },
        { id: '3', name: 'Maruchan Maiztro', price: 110, desc: 'Sopa instantánea bañada en esquite y tuétano.', emoji: '🍜' },
        { id: '4', name: 'Obra Maestra', price: 150, desc: 'El rey de la casa. Tostitos, esquite, carne y queso fundido.', emoji: '👑' },
        { id: '5', name: 'Agua de Jamaica', price: 35, desc: 'Agua fresca natural de medio litro.', emoji: '🌺' }
    ];

    const addToCart = (item: any) => {
        setCart([...cart, { ...item, cartId: Math.random().toString() }]);
    };

    const removeFromCart = (cartId: string) => {
        setCart(cart.filter(item => item.cartId !== cartId));
    };

    const totalAmount = cart.reduce((acc, item) => acc + item.price, 0);

    const handleCheckout = async () => {
        if (!customerName || !customerPhone) return alert("Por favor, ingresa tu nombre y WhatsApp para avisarte cuando esté listo.");
        if (cart.length === 0) return alert("Tu carrito está vacío.");
        if (!selectedTime) return alert("Selecciona una hora de recolección.");

        setLoadingPayment(true);
        
        try {
            // 1. Aquí se crearía la orden en tu base de datos con status 'AWAITING_PAYMENT' y orderType 'PICK_TO_GO'
            // 2. Llamada a la API de Mercado Pago para generar el Link de Pago
            const payload = {
                customerName,
                customerPhone,
                pickupTime: selectedTime,
                totalAmount,
                items: cart,
                orderType: 'PICK_TO_GO'
            };

            // Simulamos el retraso de la API de MercadoPago
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // Redirección simulada al checkout de MP
            alert(`Redirigiendo a Mercado Pago para cobrar $${totalAmount.toFixed(2)}...\n(En producción el cliente pagará y al confirmar, la caja de la sucursal destellará en morado).`);
            
        } catch (e) {
            alert("Error al procesar el pago.");
        }
        setLoadingPayment(false);
    };

    if (isClosed) {
        return (
            <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-6 text-center font-sans">
                <span className="text-8xl mb-6">🌙</span>
                <h1 className="text-4xl font-black text-yellow-400 mb-4">Cerrado por hoy</h1>
                <p className="text-zinc-400 text-lg">Nuestros elotes están descansando. Abrimos mañana a las 5:30 PM (Pick to go desde las 6:15 PM). ¡Te esperamos!</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-950 text-white font-sans pb-40">
            {/* HEADER */}
            <header className="bg-zinc-900 border-b border-zinc-800 p-6 sticky top-0 z-40 shadow-xl">
                <div className="max-w-4xl mx-auto flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-black tracking-tighter text-yellow-400">MAIZTROS <span className="text-white">GO</span></h1>
                        <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest mt-1">Click & Collect</p>
                    </div>
                    <div className="bg-zinc-800 px-4 py-2 rounded-full flex items-center gap-2">
                        <span className="text-sm">🛒</span>
                        <span className="font-black">{cart.length}</span>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto p-6 mt-4 grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* LADO IZQUIERDO: MENÚ */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-blue-900/20 border border-blue-500/30 p-6 rounded-3xl flex items-start gap-4">
                        <span className="text-3xl animate-bounce">🏃‍♂️</span>
                        <div>
                            <h2 className="font-black text-blue-400 text-lg">Pide, Paga y Pasa por él</h2>
                            <p className="text-sm text-blue-200/70 font-medium mt-1">Arma tu pedido, elige a qué hora pasas y evita las filas. Todo directo desde tu celular.</p>
                        </div>
                    </div>

                    <h2 className="text-2xl font-black text-white border-b border-zinc-800 pb-3">Nuestro Menú</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {menuItems.map(item => (
                            <div key={item.id} className="bg-zinc-900 p-5 rounded-3xl border border-zinc-800 hover:border-yellow-400/50 transition-colors flex flex-col justify-between h-full">
                                <div>
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-4xl">{item.emoji}</span>
                                        <span className="font-black text-xl text-yellow-400">${item.price}</span>
                                    </div>
                                    <h3 className="font-black text-lg text-white mb-1">{item.name}</h3>
                                    <p className="text-sm text-zinc-500 font-medium leading-snug">{item.desc}</p>
                                </div>
                                <button onClick={() => addToCart(item)} className="mt-6 w-full bg-zinc-800 hover:bg-yellow-400 hover:text-zinc-950 text-white font-black py-3 rounded-xl transition-all active:scale-95">
                                    + Agregar
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* LADO DERECHO: CARRITO Y CHECKOUT */}
                <div className="bg-zinc-900 p-6 rounded-[2.5rem] border border-zinc-800 h-fit sticky top-28 shadow-2xl">
                    <h2 className="text-2xl font-black text-white mb-6">Tu Orden</h2>
                    
                    {cart.length === 0 ? (
                        <div className="text-center py-10 opacity-50">
                            <span className="text-6xl mb-4 block">🥡</span>
                            <p className="font-bold text-zinc-400">Aún no hay antojitos aquí.</p>
                        </div>
                    ) : (
                        <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 mb-6">
                            {cart.map(item => (
                                <div key={item.cartId} className="flex justify-between items-center bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                                    <div className="flex items-center gap-3">
                                        <span className="text-xl">{item.emoji}</span>
                                        <div>
                                            <p className="font-bold text-sm text-white">{item.name}</p>
                                            <p className="text-xs text-yellow-400 font-black">${item.price}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => removeFromCart(item.cartId)} className="text-zinc-600 hover:text-red-500 font-black text-xl px-2">&times;</button>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="border-t border-zinc-800 pt-6 space-y-4">
                        <div>
                            <label className="text-xs font-black uppercase tracking-widest text-zinc-500 block mb-2">Tus Datos (Para avisarte)</label>
                            <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Tu Nombre" className="w-full bg-zinc-950 border border-zinc-700 p-3 rounded-xl text-white outline-none focus:border-yellow-400 text-sm mb-2 font-bold" />
                            <input type="tel" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="WhatsApp (10 dígitos)" className="w-full bg-zinc-950 border border-zinc-700 p-3 rounded-xl text-white outline-none focus:border-yellow-400 text-sm font-bold" />
                        </div>

                        <div>
                            <label className="text-xs font-black uppercase tracking-widest text-zinc-500 block mb-2">🕒 Hora de Recolección</label>
                            <select value={selectedTime} onChange={e => setSelectedTime(e.target.value)} className="w-full bg-blue-900/20 text-blue-400 border border-blue-500/30 p-4 rounded-xl font-black outline-none focus:border-blue-400 appearance-none text-center">
                                {availableTimes.map(t => (
                                    <option key={t} value={t} className="bg-zinc-900 text-white">Pasaré a las {t}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex justify-between items-end pt-4 border-t border-zinc-800">
                            <span className="text-zinc-500 font-black uppercase tracking-widest text-xs">Total a Pagar</span>
                            <span className="text-4xl font-black text-white">${totalAmount.toFixed(2)}</span>
                        </div>

                        <button 
                            onClick={handleCheckout} 
                            disabled={cart.length === 0 || loadingPayment}
                            className="w-full flex items-center justify-center gap-3 bg-[#009ee3] hover:bg-[#008cc9] text-white font-black py-5 rounded-2xl text-lg transition-all active:scale-95 shadow-[0_0_20px_rgba(0,158,227,0.3)] disabled:opacity-50 disabled:bg-zinc-800 disabled:shadow-none"
                        >
                            {loadingPayment ? 'Conectando...' : (
                                <>
                                    💳 Pagar con Mercado Pago
                                </>
                            )}
                        </button>
                        <p className="text-[10px] text-center text-zinc-500 font-bold uppercase tracking-widest">Transacción 100% Segura</p>
                    </div>
                </div>
            </main>
        </div>
    );
}
