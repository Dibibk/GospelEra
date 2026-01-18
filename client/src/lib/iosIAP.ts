import { Capacitor, registerPlugin } from '@capacitor/core';

interface StoreKitProduct {
  id: string;
  displayName: string;
  description: string;
  price: string;
  displayPrice: string;
  type: string;
}

interface PurchaseResult {
  success: boolean;
  cancelled?: boolean;
  pending?: boolean;
  transactionId?: string;
  productId?: string;
  purchaseDate?: number;
}

interface StoreKitPluginInterface {
  getProducts(options: { productIds: string[] }): Promise<{ products: StoreKitProduct[] }>;
  purchase(options: { productId: string }): Promise<PurchaseResult>;
  restorePurchases(): Promise<{ transactions: any[] }>;
}

const StoreKit = registerPlugin<StoreKitPluginInterface>('StoreKit');

export const isIOS = (): boolean => {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';
};

export const isAndroid = (): boolean => {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
};

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

let cachedProducts: StoreKitProduct[] | null = null;

export async function loadProducts(): Promise<StoreKitProduct[]> {
  if (!isIOS()) {
    console.log('[iOS IAP] Not on iOS, skipping product load');
    return [];
  }

  if (cachedProducts) {
    return cachedProducts;
  }

  try {
    console.log('[iOS IAP] Loading products from App Store...');
    const result = await StoreKit.getProducts({ productIds: SUPPORT_PRODUCT_IDS });
    cachedProducts = result.products;
    console.log('[iOS IAP] Loaded products:', cachedProducts);
    return cachedProducts;
  } catch (error) {
    console.error('[iOS IAP] Failed to load products:', error);
    return [];
  }
}

export async function purchaseProduct(productId: string): Promise<PurchaseResult> {
  if (!isIOS()) {
    throw new Error('In-App Purchase is only available on iOS');
  }

  console.log('[iOS IAP] Starting purchase for:', productId);
  
  try {
    const result = await StoreKit.purchase({ productId });
    console.log('[iOS IAP] Purchase result:', result);
    return result;
  } catch (error: any) {
    console.error('[iOS IAP] Purchase failed:', error);
    throw new Error(error.message || 'Purchase failed');
  }
}

export async function purchaseByAmount(amount: number): Promise<PurchaseResult> {
  const productId = AMOUNT_TO_PRODUCT_ID[amount];
  if (!productId) {
    throw new Error(`No product configured for $${amount}. Available amounts: $5, $10, $25, $50, $100`);
  }
  
  await loadProducts();
  return purchaseProduct(productId);
}

export async function restorePurchases(): Promise<any[]> {
  if (!isIOS()) {
    throw new Error('Restore purchases is only available on iOS');
  }

  try {
    console.log('[iOS IAP] Restoring purchases...');
    const result = await StoreKit.restorePurchases();
    console.log('[iOS IAP] Restored transactions:', result.transactions);
    return result.transactions;
  } catch (error: any) {
    console.error('[iOS IAP] Restore failed:', error);
    throw new Error(error.message || 'Failed to restore purchases');
  }
}

export function getProductPrice(amount: number): string | null {
  if (!cachedProducts) return null;
  const productId = AMOUNT_TO_PRODUCT_ID[amount];
  const product = cachedProducts.find(p => p.id === productId);
  return product?.displayPrice || null;
}
