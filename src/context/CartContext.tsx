'use client';

import { createContext, useContext, useReducer, useEffect, useRef, ReactNode } from 'react';
import { CartItem, Product } from '@/types';
import { parsePrice } from '@/lib/format';
import { isInStock, maxOrderQty } from '@/lib/stock';

export { parsePrice, formatRupees } from '@/lib/format';

/** Clamp a requested quantity to what is in stock (when stock is tracked). */
function clampQty(product: Product, quantity: number) {
  const max = maxOrderQty(product);
  return max === undefined ? quantity : Math.min(quantity, max);
}

/** Live price/stock fields the storefront layout passes down. */
export type CatalogPatch = Pick<Product, 'id' | 'price' | 'stockStatus' | 'stockQty'>;

/** Refresh saved cart snapshots with live prices and stock; drop removed or sold-out items. */
function syncWithCatalog(items: CartItem[], catalog: CatalogPatch[]): CartItem[] {
  const byId = new Map(catalog.map((patch) => [patch.id, patch]));
  return items.flatMap((item) => {
    const patch = byId.get(item.product.id);
    if (!patch) return [];
    const live: Product = { ...item.product, ...patch };
    if (!isInStock(live)) return [];
    const quantity = clampQty(live, item.quantity);
    return quantity > 0 ? [{ product: live, quantity }] : [];
  });
}

interface CartState {
  items: CartItem[];
}

type CartAction =
  | { type: 'ADD_ITEM'; product: Product; quantity?: number }
  | { type: 'REMOVE_ITEM'; productId: string }
  | { type: 'UPDATE_QUANTITY'; productId: string; quantity: number }
  | { type: 'CLEAR_CART' }
  | { type: 'LOAD_CART'; items: CartItem[] };

interface CartContextValue {
  items: CartItem[];
  itemCount: number;
  total: number;
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  isInCart: (productId: string) => boolean;
  getQuantity: (productId: string) => number;
}

const CartContext = createContext<CartContextValue | null>(null);

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existing = state.items.find((i) => i.product.id === action.product.id);
      if (!isInStock(action.product)) return state;
      if (existing) {
        return {
          ...state,
          items: state.items.map((i) =>
            i.product.id === action.product.id
              ? { ...i, quantity: clampQty(action.product, i.quantity + (action.quantity ?? 1)) }
              : i,
          ),
        };
      }
      return {
        ...state,
        items: [
          ...state.items,
          { product: action.product, quantity: clampQty(action.product, action.quantity ?? 1) },
        ],
      };
    }
    case 'REMOVE_ITEM':
      return { ...state, items: state.items.filter((i) => i.product.id !== action.productId) };
    case 'UPDATE_QUANTITY':
      if (action.quantity <= 0) {
        return { ...state, items: state.items.filter((i) => i.product.id !== action.productId) };
      }
      return {
        ...state,
        items: state.items.map((i) =>
          i.product.id === action.productId
            ? { ...i, quantity: clampQty(i.product, action.quantity) }
            : i,
        ),
      };
    case 'CLEAR_CART':
      return { items: [] };
    case 'LOAD_CART':
      return { items: action.items };
    default:
      return state;
  }
}

export function CartProvider({ children, catalog }: { children: ReactNode; catalog: CatalogPatch[] }) {
  const [state, dispatch] = useReducer(cartReducer, { items: [] });
  const loaded = useRef(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('battery-hub-cart');
      if (saved) dispatch({ type: 'LOAD_CART', items: syncWithCatalog(JSON.parse(saved) as CartItem[], catalog) });
    } catch {}
    loaded.current = true;
    // Only on mount: later catalog changes arrive with a fresh page load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    try {
      localStorage.setItem('battery-hub-cart', JSON.stringify(state.items));
    } catch {}
  }, [state.items]);

  const itemCount = state.items.reduce((sum, i) => sum + i.quantity, 0);
  const total = state.items.reduce(
    (sum, i) => sum + parsePrice(i.product.price) * i.quantity,
    0,
  );

  const addItem = (product: Product, quantity = 1) =>
    dispatch({ type: 'ADD_ITEM', product, quantity });
  const removeItem = (productId: string) => dispatch({ type: 'REMOVE_ITEM', productId });
  const updateQuantity = (productId: string, quantity: number) =>
    dispatch({ type: 'UPDATE_QUANTITY', productId, quantity });
  const clearCart = () => dispatch({ type: 'CLEAR_CART' });
  const isInCart = (productId: string) => state.items.some((i) => i.product.id === productId);
  const getQuantity = (productId: string) =>
    state.items.find((i) => i.product.id === productId)?.quantity ?? 0;

  return (
    <CartContext.Provider
      value={{ items: state.items, itemCount, total, addItem, removeItem, updateQuantity, clearCart, isInCart, getQuantity }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
