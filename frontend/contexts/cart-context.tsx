"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type CartItem = {
  id: string;
  name: string;
  restaurantId: string;
  restaurantName: string;
  slug: string;
  image: string | null;
  price: number;
  quantity: number;
};

type AddCartItemInput = Omit<CartItem, "quantity"> & {
  quantity?: number;
};

type CartContextValue = {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  deliveryFee: number;
  total: number;
  isCartOpen: boolean;
  addItem: (item: AddCartItemInput) => void;
  openCart: () => void;
  closeCart: () => void;
  updateQuantity: (id: string, quantity: number) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
};

const CART_STORAGE_KEY = "luxe-bites-cart";
const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hasLoadedStoredCart, setHasLoadedStoredCart] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    const storedCart = window.localStorage.getItem(CART_STORAGE_KEY);

    if (storedCart) {
      try {
        setItems(JSON.parse(storedCart) as CartItem[]);
      } catch (error) {
        console.error("Failed to restore cart:", error);
      }
    }

    setHasLoadedStoredCart(true);
  }, []);

  useEffect(() => {
    if (!hasLoadedStoredCart) return;

    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  }, [hasLoadedStoredCart, items]);

  const addItem = (item: AddCartItemInput) => {
    setItems((currentItems) => {
      const existingItem = currentItems.find((entry) => entry.id === item.id);

      if (existingItem) {
        return currentItems.map((entry) =>
          entry.id === item.id
            ? {
                ...entry,
                image: item.image,
                quantity: entry.quantity + (item.quantity ?? 1),
              }
            : entry,
        );
      }

      return [
        ...currentItems,
        {
          ...item,
          quantity: item.quantity ?? 1,
        },
      ];
    });
    setIsCartOpen(true);
  };

  const openCart = () => setIsCartOpen(true);
  const closeCart = () => setIsCartOpen(false);

  const updateQuantity = (id: string, quantity: number) => {
    setItems((currentItems) =>
      currentItems
        .map((item) => (item.id === id ? { ...item, quantity: Math.max(0, quantity) } : item))
        .filter((item) => item.quantity > 0),
    );
  };

  const removeItem = (id: string) => {
    setItems((currentItems) => currentItems.filter((item) => item.id !== id));
  };

  const clearCart = () => {
    setItems([]);
  };

  const itemCount = items.reduce((total, item) => total + item.quantity, 0);
  const subtotal = items.reduce((total, item) => total + item.price * item.quantity, 0);
  const deliveryFee = subtotal > 0 ? 49 : 0;

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      itemCount,
      subtotal,
      deliveryFee,
      total: subtotal + deliveryFee,
      isCartOpen,
      addItem,
      openCart,
      closeCart,
      updateQuantity,
      removeItem,
      clearCart,
    }),
    [items, itemCount, subtotal, deliveryFee, isCartOpen],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }

  return context;
}
