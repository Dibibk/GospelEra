/**
 * iOS In-App Purchase Integration using cordova-plugin-purchase (CdvPurchase)
 * 
 * This module handles iOS-only In-App Purchases via window.CdvPurchase.store.
 * Android and Web continue to use Stripe - this code does nothing on those platforms.
 * 
 * IMPORTANT: cordova-plugin-purchase exposes CdvPurchase globally, not window.store.
 * Access it via window.CdvPurchase.store which is injected by the Cordova plugin.
 */

import { Capacitor } from '@capacitor/core';

// Declare CdvPurchase types for window.CdvPurchase
declare global {
  interface Window {
    CdvPurchase?: {
      store: CdvPurchaseStore;
      ProductType: {
        CONSUMABLE: string;
        NON_CONSUMABLE: string;
        PAID_SUBSCRIPTION: string;
        FREE_SUBSCRIPTION: string;
      };
      Platform: {
        APPLE_APPSTORE: string;
        GOOGLE_PLAY: string;
        TEST: string;
      };
      LogLevel: {
        QUIET: number;
        ERROR: number;
        WARNING: number;
        INFO: number;
        DEBUG: number;
      };
    };
  }
}

interface CdvPurchaseStore {
  // register() is called on the STORE object, NOT on products
  register: (products: CdvProductDefinition[]) => void;
  initialize: (platforms?: string[]) => Promise<void>;
  update: () => Promise<void>;
  restorePurchases: () => Promise<void>;
  get: (productId: string, platform?: string) => CdvProduct | undefined;
  products: CdvProduct[];
  when: () => CdvEventHandlers;
  order: (offer: CdvOffer) => Promise<void>;
  verbosity: number;
  ready: (callback: () => void) => void;
}

interface CdvProductDefinition {
  id: string;
  type: string;
  platform: string;
}

interface CdvProduct {
  id: string;
  title: string;
  description: string;
  platform: string;
  offers: CdvOffer[];
  owned: boolean;
  pricing?: {
    price: string;
    priceMicros: number;
    currency: string;
  };
  canPurchase: boolean;
}

interface CdvOffer {
  id: string;
  productId: string;
  productType: string;
  platform: string;
  pricingPhases: any[];
}

interface CdvEventHandlers {
  productUpdated: (callback: (product: CdvProduct) => void) => CdvEventHandlers;
  approved: (callback: (transaction: CdvTransaction) => void) => CdvEventHandlers;
  verified: (callback: (receipt: any) => void) => CdvEventHandlers;
  finished: (callback: (transaction: CdvTransaction) => void) => CdvEventHandlers;
  receiptsReady: (callback: () => void) => CdvEventHandlers;
  receiptUpdated: (callback: (receipt: any) => void) => CdvEventHandlers;
}

interface CdvTransaction {
  transactionId: string;
  state: string;
  products: { id: string }[];
  platform: string;
  finish: () => Promise<void>;
  verify: () => Promise<void>;
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
let pendingPurchaseResolve: ((result: { success: boolean; cancelled?: boolean; error?: string }) => void) | null = null;

/**
 * Check if CdvPurchase store is available (iOS only)
 * Returns false on simulator or if plugin not loaded - this is expected behavior
 */
export function isStoreAvailable(): boolean {
  // Only available on iOS with CdvPurchase defined
  if (!isIOS()) return false;
  
  // Check if CdvPurchase global exists (injected by cordova-plugin-purchase)
  return typeof window.CdvPurchase !== 'undefined' && 
         typeof window.CdvPurchase.store !== 'undefined';
}

/**
 * Get the CdvPurchase store instance
 * Returns undefined if not on iOS or plugin not loaded
 */
function getStore(): CdvPurchaseStore | undefined {
  if (!isStoreAvailable()) return undefined;
  return window.CdvPurchase!.store;
}

/**
 * Initialize the iOS In-App Purchase store
 * Does nothing on Android/Web or if plugin not available (simulator)
 * 
 * IMPORTANT: store.register() is called HERE on the store object,
 * NOT on product objects or arrays. This is the correct usage.
 */
export async function initializeStore(): Promise<void> {
  // iOS-only: Skip on Android and Web
  if (!isIOS()) {
    console.log('[iOS IAP] Not on iOS, skipping store initialization');
    return;
  }

  const store = getStore();
  
  // Skip if store not available (simulator or plugin not loaded)
  // This is expected behavior - simulator doesn't support IAP
  if (!store) {
    console.warn('[iOS IAP] CdvPurchase.store not available - likely running in simulator or plugin not installed');
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
      const CdvPurchase = window.CdvPurchase!;
      
      // Set verbosity for debugging (can be reduced in production)
      store.verbosity = CdvPurchase.LogLevel.INFO;
      
      console.log('[iOS IAP] Registering products with store.register()...');
      
      // CORRECT: Call register() on the STORE object with an array of product definitions
      // Each product needs id, type (CONSUMABLE), and platform (APPLE_APPSTORE)
      const productDefinitions: CdvProductDefinition[] = SUPPORT_PRODUCT_IDS.map(id => ({
        id,
        type: CdvPurchase.ProductType.CONSUMABLE,
        platform: CdvPurchase.Platform.APPLE_APPSTORE
      }));
      
      // store.register() - called on store, NOT on products
      store.register(productDefinitions);
      console.log('[iOS IAP] Products registered:', productDefinitions.length);
      
      // Set up global event handlers using store.when()
      store.when()
      .productUpdated((product) => {
        console.log(
          '[iOS IAP] Product updated:',
          product.id,
          product.canPurchase ? 'available' : 'unavailable'
        );
      })
      .approved((transaction) => {
        console.log('[iOS IAP] Transaction approved:', transaction.transactionId);
        transaction.verify(); // REQUIRED
      })
      .verified((transactionOrReceipt: any) => {
        console.log('[iOS IAP] Verified:', transactionOrReceipt);

        // REQUIRED: tell StoreKit the transaction is complete
        if (transactionOrReceipt?.finish) {
          transactionOrReceipt.finish();
        }
      })
      .finished((transaction) => {
        console.log('[iOS IAP] Transaction finished:', transaction.transactionId);
        if (pendingPurchaseResolve) {
          pendingPurchaseResolve({ success: true });
          pendingPurchaseResolve = null;
        }
      });
      
      // Wait for store to be ready
      store.ready(() => {
        console.log('[iOS IAP] Store is ready');
        isStoreInitialized = true;
        resolve();
      });
      
      // Initialize and update products from App Store
      store.initialize([CdvPurchase.Platform.APPLE_APPSTORE])
        .then(() => {
          console.log('[iOS IAP] Store initialized');
          return store.update();
        })
        .then(() => {
          console.log('[iOS IAP] Products updated from App Store');
        })
        .catch((err: any) => {
          console.error('[iOS IAP] Store initialization error:', err);
        });
      
    } catch (error) {
      console.error('[iOS IAP] Store setup error:', error);
      reject(error);
    }
  });

  return storeReadyPromise;
}

/**
 * Get product information (iOS only)
 */
export function getProduct(productId: string): CdvProduct | undefined {
  const store = getStore();
  if (!store) return undefined;
  
  const CdvPurchase = window.CdvPurchase!;
  return store.get(productId, CdvPurchase.Platform.APPLE_APPSTORE);
}

/**
 * Get product price string for display
 */
export function getProductPrice(amount: number): string | null {
  const productId = AMOUNT_TO_PRODUCT_ID[amount];
  if (!productId) return null;
  
  const product = getProduct(productId);
  return product?.pricing?.price || null;
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

  const store = getStore();
  if (!store) {
    return { success: false, error: 'Store not available. Please try again later.' };
  }

  const productId = AMOUNT_TO_PRODUCT_ID[amount];
  if (!productId) {
    return { success: false, error: `No product configured for $${amount}` };
  }

  // Ensure store is initialized
  await initializeStore();

  const CdvPurchase = window.CdvPurchase!;
  const product = store.get(productId, CdvPurchase.Platform.APPLE_APPSTORE);
  
  if (!product) {
    return { success: false, error: 'Product not found. Please try again later.' };
  }
  
  if (!product.canPurchase || product.offers.length === 0) {
    return { success: false, error: 'Product not available for purchase.' };
  }

  return new Promise((resolve) => {
    // Store the resolve function for the finished handler
    pendingPurchaseResolve = resolve;

    // Create a timeout for the purchase
    const timeout = setTimeout(() => {
      if (pendingPurchaseResolve) {
        pendingPurchaseResolve = null;
        resolve({ success: false, error: 'Purchase timeout. Please try again.' });
      }
    }, 120000); // 2 minute timeout

    // Initiate the purchase using the first offer
    const offer = product.offers[0];
    console.log('[iOS IAP] Starting purchase for:', productId);
    
    store.order(offer)
      .then(() => {
        console.log('[iOS IAP] Order placed successfully');
        // Wait for finished event to resolve
      })
      .catch((err: any) => {
        clearTimeout(timeout);
        pendingPurchaseResolve = null;
        
        // Check if user cancelled
        if (err.code === 'E_USER_CANCELLED' || err.message?.includes('cancel')) {
          console.log('[iOS IAP] Purchase cancelled by user');
          resolve({ success: false, cancelled: true });
        } else {
          console.error('[iOS IAP] Order error:', err);
          resolve({ success: false, error: err.message || 'Failed to start purchase' });
        }
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

  const store = getStore();
  if (!store) {
    throw new Error('Store not available');
  }

  await initializeStore();
  
  console.log('[iOS IAP] Restoring purchases...');
  await store.restorePurchases();
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
  
  const store = getStore();
  if (!store) {
    return [];
  }
  
  // Return product info
  return SUPPORT_PRODUCT_IDS.map(id => {
    const product = getProduct(id);
    return product ? {
      id: product.id,
      displayName: product.title || id,
      description: product.description || '',
      displayPrice: product.pricing?.price || ''
    } : null;
  }).filter(Boolean);
}
