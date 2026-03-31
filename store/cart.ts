import { create } from 'zustand';

interface CartItem {
  id: string;
  product: any;
  notes: string;
  quantity: number;
  totalPrice: number;
}

interface CartStore {
  cart: CartItem[];
  addToCart: (product: any, extraCost: number, notes: string) => void;
  removeFromCart: (cartItemId: string) => void;
  getTotal: () => number;
}

export const useCartStore = create<CartStore>((set, get) => ({
  cart: [],
  addToCart: (product, extraCost = 0, notes = '') => {
    const newItem = {
      id: Math.random().toString(36).substring(7),
      product,
      notes,
      quantity: 1,
      totalPrice: product.basePrice + extraCost,
    };
    set((state) => ({ cart: [...state.cart, newItem] }));
  },
  removeFromCart: (id) => {
    set((state) => ({ cart: state.cart.filter((item) => item.id !== id) }));
  },
  getTotal: () => {
    return get().cart.reduce((total, item) => total + item.totalPrice, 0);
  },
}));
