/**
 * Donations API library for handling pledges and payment processing
 */
import { Capacitor } from '@capacitor/core';

// Get API base URL - use full URL for native apps, relative for web
function getApiBaseUrl(): string {
  if (Capacitor.isNativePlatform()) {
    return import.meta.env.VITE_API_URL || 'https://gospel-era.replit.app';
  }
  return '';
}

export interface DonationData {
  amount_cents: number;
  currency?: string;
  message?: string;
  provider?: string;
  status?: string;
}

export interface StripeCheckoutData {
  amount: number;
  note?: string;
  isMobile?: boolean;
}

export interface Donation {
  id: number;
  user_id: string;
  amount_cents: number;
  currency: string;
  message?: string;
  provider: string;
  provider_ref?: string;
  status: string;
  created_at: string;
}

/**
 * Submit a donation pledge (pending payment processing setup)
 */
export async function createDonationPledge(donationData: DonationData): Promise<{ donation: Donation } | { error: string }> {
  try {
    const baseUrl = getApiBaseUrl();
    const response = await fetch(`${baseUrl}/api/donations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...donationData,
        provider: 'pending',
        status: 'initiated'
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return { error: errorData.error || 'Failed to create donation pledge' };
    }

    const data = await response.json();
    return { donation: data };
  } catch (error) {
    console.error('Error creating donation pledge:', error);
    return { error: 'Network error occurred' };
  }
}

/**
 * Get user's donation history
 */
export async function getUserDonations(): Promise<{ donations: Donation[] } | { error: string }> {
  try {
    const baseUrl = getApiBaseUrl();
    const response = await fetch(`${baseUrl}/api/donations`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      return { error: errorData.error || 'Failed to fetch donations' };
    }

    const data = await response.json();
    return { donations: data };
  } catch (error) {
    console.error('Error fetching donations:', error);
    return { error: 'Network error occurred' };
  }
}

/**
 * Admin: Get all donations/pledges
 */
export async function getAllDonations(): Promise<{ donations: Donation[] } | { error: string }> {
  try {
    const baseUrl = getApiBaseUrl();
    const response = await fetch(`${baseUrl}/api/admin/donations`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      return { error: errorData.error || 'Failed to fetch all donations' };
    }

    const data = await response.json();
    return { donations: data };
  } catch (error) {
    console.error('Error fetching all donations:', error);
    return { error: 'Network error occurred' };
  }
}

/**
 * Format amount in cents to currency display
 */
export function formatCurrency(amountCents: number, currency = 'USD'): string {
  const amount = amountCents / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

/**
 * Validate donation amount
 */
export function validateDonationAmount(amount: number): { valid: boolean; error?: string } {
  if (amount <= 0) {
    return { valid: false, error: 'Amount must be greater than $0' };
  }
  
  if (amount < 2) {
    return { valid: false, error: 'Minimum donation is $2' };
  }
  
  if (amount > 200) {
    return { valid: false, error: 'Maximum donation is $200' };
  }
  
  return { valid: true };
}

/**
 * Create Stripe checkout session
 */
export async function createStripeCheckout(data: StripeCheckoutData): Promise<{ url: string } | { error: string }> {
  try {
    const baseUrl = getApiBaseUrl();
    const response = await fetch(`${baseUrl}/api/stripe/create-checkout-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return { error: errorData.error || 'Failed to create checkout session' };
    }

    const result = await response.json();
    return { url: result.url };
  } catch (error) {
    console.error('Error creating Stripe checkout:', error);
    return { error: 'Network error occurred' };
  }
}