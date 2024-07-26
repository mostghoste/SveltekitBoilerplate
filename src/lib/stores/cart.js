import { writable } from 'svelte/store';

// Helper function to safely access localStorage
function getStoredCart() {
  if (typeof window !== 'undefined') {
    const storedCart = localStorage.getItem('cart');
    return storedCart ? JSON.parse(storedCart) : [];
  }
  return [];
}

function createCart() {
  const { subscribe, set, update } = writable(getStoredCart());

  if (typeof window !== 'undefined') {
    // Save the cart to localStorage whenever it changes
    subscribe((value) => {
      localStorage.setItem('cart', JSON.stringify(value));
    });
  }

  return {
    subscribe,
    addToCart: (product) => {
      update((items) => {
        // Check if product already exists in cart
        const existingProduct = items.find(item => item.id === product.id);
        if (existingProduct) {
          return items.map(item =>
            item.id === product.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          );
        }
        return [...items, { ...product, quantity: 1 }];
      });
    },
    removeFromCart: (productId) => {
      update((items) => items.filter(item => item.id !== productId));
    },
    clearCart: () => {
      set([]);
    }
  };
}

export const cart = createCart();
