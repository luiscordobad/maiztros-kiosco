import { prisma } from '../lib/prisma';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const products = await prisma.product.findMany({
    orderBy: { basePrice: 'asc' }
  });

  return (
    <main className="min-h-screen bg-zinc-950 text-white font-sans p-6 md:p-12">
      <div className="max-w-5xl mx-auto">
        <header className="mb-10 text-center md:text-left">
          <h1 className="text-5xl font-black text-yellow-400 tracking-tight">MAIZTROS</h1>
          <p className="text-zinc-400 text-lg mt-2">Bienvenido. Ordena tu antojo aquí.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <div 
              key={product.id} 
              className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-lg flex flex-col justify-between hover:border-yellow-400/50 transition-colors"
            >
              <div>
                <span className="inline-block px-3 py-1 bg-zinc-800 text-zinc-300 text-xs font-bold uppercase tracking-wider rounded-full mb-3">
                  {product.category}
                </span>
                <h2 className="text-2xl font-bold mb-1">{product.name}</h2>
              </div>
              <div className="mt-6 flex items-center justify-between">
                <p className="text-yellow-400 text-2xl font-black">
                  ${product.basePrice.toFixed(2)}
                </p>
                <button className="bg-yellow-400 text-zinc-950 px-4 py-2 rounded-xl font-bold hover:bg-yellow-300 transition-colors">
                  Agregar
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
