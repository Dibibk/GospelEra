/**
 * iOS In-App Purchase Integration using cordova-plugin-purchase (CdvPurchase)
 * 
 * This module handles iOS-only In-App Purchases via window.store (global CdvPurchase).
 * Android and Web continue to use Stripe - this code does nothing on those platforms.
 * 
 * IMPORTANT: Do NOT import cordova-plugin-purchase as a module.
 * Access it via window.store which is injected by the Cordova plugin.
 */

import { Capacitor } from '@capacitor/core';

// Declare CdvPurchase types for window.store
declare global {
  interface Window {
    store?: CdvPurchaseStore;
  }
}

interface CdvPurchaseStore {
  register: (products: CdvProduct[]) => void;
  refresh: () => Promise<void>;
  ready: (callback: () => void) => void;
  when: (product: string) => CdvProductEvents;
  get: (productId: string) => CdvPurchasedProduct | undefined;
  order: (productId: string) => Promise<any>;
  restorePurchases: () => Promise<void>;
  CONSUMABLE: string;
  NON_CONSUMABLE: string;
  PAID_SUBSCRIPTION: string;
  verbosity: number;
  DEBUG: number;
  INFO: number;
  WARNING: number;
  ERROR: number;
  QUIET: number;
}

interface CdvProduct {
  id: string;
  type: string;
  platform: string;
}

interface CdvProductEvents {
  approved: (callback: (product: CdvPurchasedProduct) => void) => CdvProductEvents;
  verified: (callback: (product: CdvPurchasedProduct) => void) => CdvProductEvents;
  finished: (callback: (product: CdvPurchasedProduct) => void) => CdvProductEvents;
  error: (callback: (error: any) => void) => CdvProductEvents;
  cancelled: (callback: (product: CdvPurchasedProduct) => void) => CdvProductEvents;
}

interface CdvPurchasedProduct {
  id: string;
  title?: string;
  description?: string;
  price?: string;
  priceMicros?: number;
  currency?: string;
  owned?: boolean;
  finish: () => void;
  verify: () => Promise<void>;
  transaction?: {
    id: string;
    type: string;
  };
}

// --- Platform Detection (iOS-only logic) ---

export const isIOS = (): boolean => {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';
};

export const isAndroid = (): boolean => {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
};

// --- iOS Product Configuration ---

export const SUPPORT_PRODUCT_IDS = [
  'gospelera_support_5',
  'gospelera_support_10',
  'gospelera_support_25',
  'gospelera_support_50',
  'gospelera_support_100'
];

export const AMOUNT_TO_PRODUCT_ID: Record<number, string> = {
  5: 'gospelera_support_5',
  10: 'gospelera_support_10',
  25: 'gospelera_support_25',
  50: 'gospelera_support_50',
  100: 'gospelera_support_100'
};

// --- iOS IAP State ---

let isStoreInitialized = false;
let storeReadyPromise: Promise<void> | null = null;

/**
 * Check if CdvPurchase store is available (iOS only)
 */
export function isStoreAvailable(): boolean {
  // Only available on iOS with window.store defined
  if (!isIOS()) return false;
  return typeof window.store !== 'undefined';
}

/**
 * Initialize the iOS In-App Purchase store
 * Does nothing on Android/Web
 */
export async function initializeStore(): Promise<void> {
  // iOS-only: Skip on Android and Web
  if (!isIOS()) {
    console.log('[iOS IAP] Not on iOS, skipping store initialization');
    return;
  }

  // Check if store is available
  if (!window.store) {
    console.warn('[iOS IAP] window.store not available - cordova-plugin-purchase not loaded');
    return;
  }

  // Already initialized
  if (isStoreInitialized) {
    console.log('[iOS IAP] Store already initialized');
    return;
  }

  // Return existing promise if initialization is in progress
  if (storeReadyPromise) {
    return storeReadyPromise;
  }

  storeReadyPromise = new Promise<void>((resolve, reject) => {
    try {
      const store = window.store!;
      
      // Set verbosity for debugging (can be reduced in production)
      store.verbosity = store.INFO;
      
      console.log('[iOS IAP] Registering products...');
      
      // Register all consumable support products
      const products: CdvProduct[] = SUPPORT_PRODUCT_IDS.map(id => ({
        id,
        type: store.CONSUMABLE,
        platform: 'ios'
      }));
      
      store.register(products);
      
      // Set up global event handlers for all products
      SUPPORT_PRODUCT_IDS.forEach(productId => {
        store.when(productId)
          .approved((product) => {
            console.log('[iOS IAP] Product approved:', product.id);
            // Verify the purchase with Apple
            product.verify();
          })
          .verified((product) => {
            console.log('[iOS IAP] Product verified:', product.id);
            // Finish the transaction
            product.finish();
          })
          .finished((product) => {
            console.log('[iOS IAP] Product finished:', product.id);
          })
          .error((error) => {
            console.error('[iOS IAP] Product error:', error);
          });
      });
      
      // Wait for store to be ready
      store.ready(() => {
        console.log('[iOS IAP] Store is ready');
        isStoreInitialized = true;
        resolve();
      });
      
      // Refresh to load products from App Store
      store.refresh().catch((err: any) => {
        console.error('[iOS IAP] Store refresh error:', err);
      });
      
    } catch (error) {
      console.error('[iOS IAP] Store initialization error:', error);
      reject(error);
    }
  });

  return storeReadyPromise;
}

/**
 * Get product information (iOS only)
 */
export function getProduct(productId: string): CdvPurchasedProduct | undefined {
  if (!isIOS() || !window.store) return undefined;
  return window.store.get(productId);
}

/**
 * Get product price string for display
 */
export function getProductPrice(amount: number): string | null {
  if (!isIOS() || !window.store) return null;
  
  const productId = AMOUNT_TO_PRODUCT_ID[amount];
  if (!productId) return null;
  
  const product = window.store.get(productId);
  return product?.price || null;
}

/**
 * Purchase a product by amount (iOS only)
 * Returns a promise that resolves when purchase is complete
 */
export async function purchaseByAmount(amount: number): Promise<{ success: boolean; cancelled?: boolean; error?: string }> {
  // iOS-only check
  if (!isIOS()) {
    return { success: false, error: 'In-App Purchase is only available on iOS' };
  }

  if (!window.store) {
    return { success: false, error: 'Store not available' };
  }

  const productId = AMOUNT_TO_PRODUCT_ID[amount];
  if (!productId) {
    return { success: false, error: `No product configured for $${amount}` };
  }

  // Ensure store is initialized
  await initializeStore();

  return new Promise((resolve) => {
    const store = window.store!;
    
    // Set up one-time handlers for this specific purchase
    const cleanup = () => {
      // Handlers are managed globally, no cleanup needed
    };

    // Create a timeout for the purchase
    const timeout = setTimeout(() => {
      cleanup();
      resolve({ success: false, error: 'Purchase timeout' });
    }, 120000); // 2 minute timeout

    // Override handlers temporarily for this purchase
    store.when(productId)
      .finished((product) => {
        clearTimeout(timeout);
        console.log('[iOS IAP] Purchase completed:', product.id);
        resolve({ success: true });
      })
      .cancelled((product) => {
        clearTimeout(timeout);
        console.log('[iOS IAP] Purchase cancelled:', product.id);
        resolve({ success: false, cancelled: true });
      })
      .error((error) => {
        clearTimeout(timeout);
        console.error('[iOS IAP] Purchase error:', error);
        resolve({ success: false, error: error.message || 'Purchase failed' });
      });

    // Initiate the purchase
    console.log('[iOS IAP] Starting purchase for:', productId);
    store.order(productId).catch((err: any) => {
      clearTimeout(timeout);
      console.error('[iOS IAP] Order error:', err);
      resolve({ success: false, error: err.message || 'Failed to start purchase' });
    });
  });
}

/**
 * Restore previous purchases (iOS only)
 */
export async function restorePurchases(): Promise<void> {
  if (!isIOS()) {
    throw new Error('Restore purchases is only available on iOS');
  }

  if (!window.store) {
    throw new Error('Store not available');
  }

  await initializeStore();
  
  console.log('[iOS IAP] Restoring purchases...');
  await window.store.restorePurchases();
  console.log('[iOS IAP] Restore complete');
}

/**
 * Load products (alias for initializeStore for backward compatibility)
 */
export async function loadProducts(): Promise<any[]> {
  if (!isIOS()) {
    console.log('[iOS IAP] Not on iOS, skipping product load');
    return [];
  }

  await initializeStore();
  
  // Return product info
  return SUPPORT_PRODUCT_IDS.map(id => {
    const product = getProduct(id);
    return product ? {
      id: product.id,
      displayName: product.title || id,
      description: product.description || '',
      displayPrice: product.price || ''
    } : null;
  }).filter(Boolean);
}
