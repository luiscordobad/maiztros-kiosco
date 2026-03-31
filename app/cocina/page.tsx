import { prisma } from '../../lib/prisma';
import { revalidatePath } from 'next/cache';

// Le decimos a Vercel que no guarde esta página en caché, que siempre traiga datos frescos
export const dynamic = 'force-dynamic';

export default async function Cocina() {
  // 1. Traemos de Supabase todas las órdenes que tienen estatus 'RECEIVED'
  const orders = await prisma.order.findMany({
    where: { kitchenStatus: 'RECEIVED' },
    orderBy: { createdAt: 'asc' }, // Las más viejas primero (filas reales)
    include: {
      items: {
        include: {
          product: true,
          modifiers: {
            include: { modifier: true }
          }
        }
      }
    }
  });

  // 2. Función "Server Action" para marcar la orden como lista
  async function despacharOrden(formData: FormData) {
    'use server';
    const orderId = formData.get('orderId') as string;
    
    await prisma.order.update({
      where: { id: orderId },
      data: { kitchenStatus: 'DELIVERED' }
    });
    
    // Recargamos la pantalla al instante para desaparecer el ticket
    revalidatePath('/cocina'); 
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white font-sans p-6 md:p-12">
      <header className="mb-8 flex justify-between items-center border-b border-zinc-800 pb-6">
        <div>
          <h1 className="text-5xl font-black text-yellow-400">🔥 Pantalla de Cocina</h1>
          <p className="text-zinc-400 text-xl mt-2">Maiztros - Estación de Preparación</p>
        </div>
        <div className="bg-zinc-900 px-8 py-4 rounded-2xl border border-zinc-800 text-center">
          <span className="text-4xl font-black text-white">{orders.length}</span>
          <p className="text-zinc-500 font-bold uppercase tracking-widest text-sm mt-1">Pendientes</p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {orders.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-32 text-zinc-500">
            <span className="text-8xl mb-6">🌽</span>
            <p className="text-4xl font-black text-zinc-700">Sin órdenes pendientes</p>
            <p className="text-xl mt-2">La estación de preparación está limpia.</p>
          </div>
        ) : (
          orders.map((order) => (
            <div key={order.id} className="bg-zinc-900 border border-zinc-700 rounded-2xl overflow-hidden flex flex-col shadow-xl">
              
              {/* Encabezado del Ticket */}
              <div className="bg-yellow-400 text-zinc-950 p-5 flex justify-between items-center">
                <h2 className="font-black text-2xl">Orden #{order.id.slice(-4).toUpperCase()}</h2>
              </div>

              {/* Lista de Esquites y Toppings */}
              <div className="p-6 flex-1 space-y-6">
                {order.items.map((item) => (
                  <div key={item.id} className="border-b border-zinc-800 pb-4 last:border-0 last:pb-0">
                    <p className="font-black text-2xl flex items-start leading-tight mb-2">
                      <span className="text-yellow-400 mr-3">{item.quantity}x</span>
                      {item.product.name}
                    </p>
                    
                    {/* Imprimimos la lista de ingredientes que eligió */}
                    {item.modifiers.length > 0 && (
                      <ul className="ml-9 space-y-2 mt-3">
                        {item.modifiers.map((modItem) => (
                          <li 
                            key={modItem.id} 
                            className={`text-lg font-bold flex items-center ${modItem.modifier.type === 'RESTRICCION' ? 'text-red-400' : 'text-zinc-300'}`}
                          >
                            <span className="mr-2 opacity-50">↳</span> {modItem.modifier.name}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>

              {/* Botón para Despachar */}
              <div className="p-4 border-t border-zinc-800 bg-zinc-950">
                <form action={despacharOrden}>
                  <input type="hidden" name="orderId" value={order.id} />
                  <button type="submit" className="w-full bg-zinc-800 hover:bg-green-500 hover:text-white text-zinc-400 hover:border-green-500 border border-zinc-700 py-4 rounded-xl font-black transition-all text-xl">
                    ✔ Marcar como Lista
                  </button>
                </form>
              </div>
            </div>
          ))
        )}
      </div>
    </main>
  );
}
