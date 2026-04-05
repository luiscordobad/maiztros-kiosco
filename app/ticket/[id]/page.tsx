import { prisma } from '@/lib/prisma';

export default async function TicketDigital({ params }: { params: { id: string } }) {
  const order = await prisma.order.findFirst({
    where: { turnNumber: params.id }
  });

  if (!order) {
    return <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center text-2xl font-bold">Ticket no encontrado ❌</div>;
  }

  const items = typeof order.items === 'string' ? JSON.parse(order.items as string) : order.items;

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center p-6 font-sans">
      <div className="bg-white text-zinc-950 w-full max-w-md p-8 rounded-3xl shadow-2xl mt-10">
        <div className="text-center border-b-2 border-dashed border-zinc-300 pb-6 mb-6">
          <h1 className="text-4xl font-black text-yellow-500 mb-2">MAIZTROS</h1>
          <p className="text-zinc-500 font-bold uppercase tracking-widest text-sm">Ticket Digital</p>
          <h2 className="text-7xl font-black italic mt-4">#{order.turnNumber}</h2>
          <p className="font-bold text-xl mt-2">{order.customerName}</p>
        </div>

        <div className="space-y-4 mb-6 border-b-2 border-dashed border-zinc-300 pb-6">
          {items.map((item: any, idx: number) => (
            <div key={idx} className="flex justify-between items-start">
              <div className="flex-1 pr-4">
                <p className="font-black text-lg leading-tight">{item.product.name}</p>
                {item.notes && <p className="text-zinc-500 text-xs mt-1 leading-relaxed">{item.notes}</p>}
              </div>
              <p className="font-black text-lg">${item.totalPrice.toFixed(2)}</p>
            </div>
          ))}
        </div>

        <div className="space-y-2 mb-6">
          <div className="flex justify-between text-zinc-500 font-bold"><p>Subtotal</p><p>${order.totalAmount.toFixed(2)}</p></div>
          <div className="flex justify-between text-zinc-500 font-bold"><p>Propina Equipo</p><p>${order.tipAmount.toFixed(2)}</p></div>
          <div className="flex justify-between text-2xl font-black pt-4 border-t border-zinc-200">
            <p>TOTAL</p><p className="text-green-600">${(order.totalAmount + order.tipAmount).toFixed(2)}</p>
          </div>
        </div>

        <div className="text-center text-sm font-bold text-zinc-400">
          <p>Método: {order.paymentMethod === 'TERMINAL' ? '💳 Tarjeta' : '💵 Efectivo'}</p>
          <p>Fecha: {new Date(order.createdAt).toLocaleString()}</p>
          <p className="mt-6 text-yellow-500">¡Gracias por tu antojo!</p>
        </div>
      </div>
    </div>
  );
}
