'use client';
import { useCartStore } from '../store/cart';

export default function KioscoClient({ products }: { products: any[] }) {
  const { cart, addToCart, removeFromCart, getTotal } = useCartStore();

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-zinc-950 text-white font-sans">
      
      {/* Sección Izquierda: Menú Principal */}
      <div className="flex-1 p-6 md:p-12 h-screen overflow-y-auto">
        <header className="mb-10 text-center md:text-left">
          <h1 className="text-5xl font-black text-yellow-400 tracking-tight">MAIZTROS</h1>
          <p className="text-zinc-400 text-lg mt-2">Bienvenido. Ordena tu antojo aquí.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <div key={product.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-lg flex flex-col justify-between hover:border-yellow-400/50 transition-colors">
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
                <button 
                  onClick={() => addToCart(product)}
                  className="bg-yellow-400 text-zinc-950 px-4 py-2 rounded-xl font-bold hover:bg-yellow-300 transition-colors active:scale-95"
                >
                  Agregar
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sección Derecha: Carrito Lateral */}
      <div className="w-full lg:w-[400px] bg-zinc-900 border-l border-zinc-800 p-6 flex flex-col h-screen">
        <h2 className="text-3xl font-black text-white mb-6">Tu Orden</h2>
        
        <div className="flex-1 overflow-y-auto">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-zinc-500">
              <p className="text-lg font-bold">Tu carrito está vacío</p>
              <p className="text-sm">Agrega algunos esquites para empezar</p>
            </div>
          ) : (
            <ul className="space-y-4">
              {cart.map((item) => (
                <li key={item.id} className="flex justify-between items-center bg-zinc-800 p-4 rounded-xl border border-zinc-700">
                  <div>
                    <p className="font-bold text-lg">{item.product.name}</p>
                    <p className="text-yellow-400 font-bold">${item.totalPrice.toFixed(2)}</p>
                  </div>
                  <button 
                    onClick={() => removeFromCart(item.id)}
                    className="text-zinc-500 hover:text-red-400 bg-zinc-900 rounded-full w-8 h-8 flex items-center justify-center font-bold transition-colors"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Totales y Botón de Pagar */}
        <div className="mt-6 pt-6 border-t border-zinc-800">
          <div className="flex justify-between items-center mb-6">
            <span className="text-2xl text-zinc-400 font-bold">Total:</span>
            <span className="text-4xl text-yellow-400 font-black">${getTotal().toFixed(2)}</span>
          </div>
          <button 
            disabled={cart.length === 0}
            className="w-full bg-yellow-400 text-zinc-950 py-4 rounded-xl font-black text-xl hover:bg-yellow-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Pagar Orden
          </button>
        </div>
      </div>
      
    </div>
  );
}
