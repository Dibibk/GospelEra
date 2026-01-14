export const PAYMENTS = {
  ENABLE_STRIPE: !!import.meta.env.VITE_STRIPE_PUBLIC_KEY,
  ENABLE_PAYPAL: !!import.meta.env.VITE_PAYPAL_CLIENT_ID,
  CURRENCY: 'USD'
} as const;

export const PAYMENT_STATUS = {
  INITIATED: 'initiated',
  PAID: 'paid',
  FAILED: 'failed',
  REFUNDED: 'refunded'
} as const;

export const PAYMENT_PROVIDERS = {
  STRIPE: 'stripe',
  PAYPAL: 'paypal',
  MANUAL: 'manual',
  PENDING: 'pending'
} as const;