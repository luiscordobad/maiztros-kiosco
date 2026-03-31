import { create } from 'zustand';

interface CartItem {
  id: string;
  product: any;
  quantity: number;
  totalPrice: number;
}

interface CartStore {
  cart: CartItem[];
  addToCart: (product: any) => void;
  removeFromCart: (cartItemId: string) => void;
  getTotal: () => number;
}

export const useCartStore = create<CartStore>((set, get) => ({
  cart: [],
  addToCart: (product) => {
    const newItem = {
      id: Math.random().toString(36).substring(7),
      product,
      quantity: 1,
      totalPrice: product.basePrice,
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
