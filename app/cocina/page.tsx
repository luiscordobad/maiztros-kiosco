import { prisma } from '../../lib/prisma';
import { revalidatePath } from 'next/cache';
import AutoRefresh from './AutoRefresh';

export const dynamic = 'force-dynamic';

export default async function Cocina() {
  const orders = await prisma.order.findMany({
    where: { kitchenStatus: 'RECEIVED' },
    orderBy: { createdAt: 'asc' },
    include: { items: { include: { product: true } } }
  });

  async function despacharOrden(formData: FormData) {
    'use server';
    const orderId = formData.get('orderId') as string;
    await prisma.order.update({ where: { id: orderId }, data: { kitchenStatus: 'DELIVERED' } });
    revalidatePath('/cocina'); 
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white font-sans p-6 md:p-12 relative">
      <AutoRefresh />
      <header className="mb-10 flex justify-between items-end border-b-4 border-yellow-400 pb-6">
        <div>
          <h1 className="text-6xl font-black text-white italic tracking-tighter">MAIZTROS <span className="text-yellow-400">KDS</span></h1>
          <p className="text-zinc-500 font-bold uppercase tracking-[0.3em] text-sm mt-2">Estación de Preparación</p>
        </div>
        <div className="bg-yellow-400 px-10 py-4 rounded-2xl text-zinc-950 text-center shadow-[0_0_30px_rgba(250,204,21,0.3)]">
          <span className="text-5xl font-black leading-none">{orders.length}</span>
          <p className="font-black uppercase text-xs">Pendientes</p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {orders.map((order) => (
          <div key={order.id} className="bg-zinc-900 border-2 border-zinc-800 rounded-[2rem] overflow-hidden flex flex-col shadow-2xl">
            <div className="bg-zinc-800 p-6 flex justify-between items-center border-b border-zinc-700">
              <span className="text-zinc-400 font-black text-sm uppercase tracking-widest">#{order.id.slice(-4).toUpperCase()}</span>
              <span className="text-zinc-500 text-xs">{new Date(order.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
            </div>
            
            <div className="p-8 flex-1">
              <h2 className="text-4xl font-black text-yellow-400 uppercase italic leading-tight mb-8 break-words">
                {order.customerName || 'Cliente'}
              </h2>
              
              <div className="space-y-8">
                {order.items.map((item) => (
                  <div key={item.id} className="relative pl-6 border-l-4 border-zinc-700">
                    <p className="text-2xl font-black text-white leading-tight">
                      <span className="text-yellow-400 mr-2">{item.quantity}x</span>
                      {item.product.name}
                    </p>
                    {item.notes && (
                      <div className="mt-3 space-y-2">
                        {item.notes.split(' | ').map((line, i) => (
                          <p key={i} className="text-lg font-bold text-zinc-400 whitespace-pre-wrap leading-snug">
                            {line.includes('Restricciones') || line.includes('Gratis') ? <span className="text-red-400">{line}</span> : line}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 bg-zinc-950 mt-auto">
              <form action={despacharOrden}>
                <input type="hidden" name="orderId" value={order.id} />
                <button type="submit" className="w-full bg-zinc-800 hover:bg-green-600 text-zinc-500 hover:text-white py-5 rounded-2xl font-black text-xl transition-all border border-zinc-700 hover:border-green-500">
                  ✔ DESPACHAR
                </button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
