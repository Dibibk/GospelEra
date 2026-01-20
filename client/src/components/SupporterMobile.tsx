import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { validateDonationAmount, createStripeCheckout } from '@/lib/donations';
import { isIOS, isStoreAvailable, loadProducts, purchaseByAmount, AMOUNT_TO_PRODUCT_ID, getProductPrice } from '@/lib/iosIAP';

interface SupporterMobileProps {
  onBack: () => void;
}

export function SupporterMobile({ onBack }: SupporterMobileProps) {
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [message, setMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentCompleted, setPaymentCompleted] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'stripe' | 'paypal'>('stripe');
  const [iapProductsLoaded, setIapProductsLoaded] = useState(false);

  // Detect iOS for Apple In-App Purchase (via cordova-plugin-purchase)
  const isiOSDevice = isIOS();
  const [iapAvailable, setIapAvailable] = useState(false);

  // Load iOS IAP products on mount (iOS only, uses window.store from cordova-plugin-purchase)
  useEffect(() => {
    if (isiOSDevice && isStoreAvailable()) {
      console.log('[Supporter] iOS detected with store available, loading IAP products...');
      loadProducts()
        .then((products) => {
          console.log('[Supporter] IAP products loaded:', products.length);
          setIapProductsLoaded(true);
          setIapAvailable(true);
        })
        .catch((err) => {
          console.error('[Supporter] Failed to load IAP products:', err);
          setIapAvailable(false);
        });
    } else if (isiOSDevice) {
      console.log('[Supporter] iOS detected but store not available (simulator or plugin not loaded)');
      setIapAvailable(false);
    }
  }, [isiOSDevice]);

  // Listen for browser close on native apps (for Stripe on Android)
  useEffect(() => {
    if (!Capacitor.isNativePlatform() || isiOSDevice) return;

    const handleBrowserFinished = () => {
      console.log('[Supporter] Browser closed');
      if (isProcessing) {
        setIsProcessing(false);
        setPaymentCompleted(true);
      }
    };

    Browser.addListener('browserFinished', handleBrowserFinished);

    return () => {
      Browser.removeAllListeners();
    };
  }, [isProcessing, isiOSDevice]);

  // iOS only allows predefined IAP amounts
  const predefinedAmounts = [5, 10, 25, 50, 100];

  // Detect native vs web
  const isNative = Capacitor.isNativePlatform();

  const stripeEnabled = Boolean(import.meta.env.VITE_STRIPE_PUBLIC_KEY);
  // iOS uses Apple IAP, Android/web uses Stripe
  const paymentsEnabled = isiOSDevice || stripeEnabled;

  const handleAmountSelect = (amount: number) => {
    console.log('Amount button clicked:', amount);
    setSelectedAmount(amount);
    setCustomAmount('');
    setError('');
  };

  const handleCustomAmountChange = (value: string) => {
    setCustomAmount(value);
    setSelectedAmount(null);
    setError('');
  };

  const getSelectedAmount = () => {
    return selectedAmount || (customAmount ? parseFloat(customAmount) : 0);
  };

  const handleSupport = async () => {
    const amount = getSelectedAmount();

    // Validate amount
    const validation = validateDonationAmount(amount);
    if (!validation.valid) {
      setError(validation.error || 'Invalid amount');
      return;
    }

    // iOS: Use Apple In-App Purchase (via cordova-plugin-purchase / window.store)
    if (isiOSDevice) {
      // iOS only supports predefined amounts
      if (!AMOUNT_TO_PRODUCT_ID[amount]) {
        setError('Please select a predefined amount for iOS payments.');
        return;
      }

      setIsProcessing(true);
      setError('');

      try {
        const result = await purchaseByAmount(amount);
        
        if (result.success) {
          setPaymentCompleted(true);
          console.log('[Supporter] iOS purchase successful:', result);
        } else if (result.cancelled) {
          setError('');
        } else if (result.error) {
          setError(result.error);
        }
      } catch (err: any) {
        console.error('[Supporter] iOS purchase error:', err);
        setError(err.message || 'Purchase failed. Please try again.');
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    // Android/Web: Use Stripe
    if (!paymentsEnabled || activeTab !== 'stripe') {
      alert(
        `Thank you for wanting to support with $${amount}! Payment processing will be implemented soon.`
      );
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      const result = await createStripeCheckout({
        amount: amount,
        note: message.trim() || undefined,
        isMobile: isNative,
      });

      if ('error' in result) {
        setError(result.error);
        setIsProcessing(false);
      } else {
        const checkoutUrl = result.url;

        if (isNative) {
          await Browser.open({
            url: checkoutUrl,
            presentationStyle: 'popover',
          });
        } else {
          window.location.href = checkoutUrl;
        }
      }
    } catch (error) {
      console.error('Stripe payment error:', error);
      setError('An unexpected error occurred. Please try again.');
      setIsProcessing(false);
    }
  };

  return (
    <div style={{ padding: '16px', background: '#ffffff', minHeight: '100vh' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: '24px',
          paddingBottom: '16px',
          borderBottom: '1px solid #dbdbdb',
        }}
      >
        <button
          onClick={onBack}
          data-testid="button-back-supporter"
          style={{
            background: 'none',
            border: 'none',
            fontSize: '18px',
            color: '#262626',
            cursor: 'pointer',
            marginRight: '16px',
          }}
        >
          ←
        </button>
        <div style={{ fontSize: '18px', fontWeight: 600, color: '#262626' }}>
          Be a Supporter
        </div>
      </div>

      {/* Support Notice */}
      <div
        style={{
          background: '#0095f6',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '24px',
          color: '#ffffff',
        }}
      >
        <div style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>
          Support Gospel Era
        </div>
        <div style={{ fontSize: '14px', opacity: 0.9 }}>
          Your contribution supports hosting, development, and moderation.
          Contributions are not tax-deductible.
        </div>
      </div>

      {/* Payment Processing Banner */}
      {!paymentsEnabled && (
        <div
          style={{
            background: '#fff8dc',
            border: '1px solid #f0e68c',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '16px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '14px', color: '#b8860b', fontWeight: 600 }}>
            Payment processing will be enabled soon; you can still pledge now.
          </div>
        </div>
      )}

      {/* Amount Selection */}
      <div style={{ marginBottom: '24px' }}>
        <div
          style={{
            fontSize: '16px',
            fontWeight: 600,
            color: '#262626',
            marginBottom: '12px',
          }}
        >
          Choose Amount
        </div>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            marginBottom: '16px',
          }}
        >
          {predefinedAmounts.map((amount) => (
            <button
              key={amount}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleAmountSelect(amount);
              }}
              onTouchStart={(e) => {
                e.preventDefault();
                console.log('Touch start on amount button:', amount);
              }}
              data-testid={`button-amount-${amount}`}
              style={{
                padding: '12px 16px',
                borderRadius: '8px',
                border:
                  selectedAmount === amount
                    ? '2px solid #4285f4'
                    : '1px solid #dbdbdb',
                background: selectedAmount === amount ? '#4285f4' : '#ffffff',
                color: selectedAmount === amount ? '#ffffff' : '#262626',
                fontSize: '14px',
                fontWeight: selectedAmount === amount ? 700 : 600,
                cursor: 'pointer',
                touchAction: 'manipulation',
                userSelect: 'none',
                WebkitTapHighlightColor: 'rgba(0,0,0,0)',
                transform:
                  selectedAmount === amount ? 'scale(1.02)' : 'scale(1)',
                transition: 'all 0.2s ease',
                boxShadow:
                  selectedAmount === amount
                    ? '0 2px 8px rgba(66, 133, 244, 0.3)'
                    : 'none',
              }}
            >
              ${amount}
            </button>
          ))}
        </div>

        {/* Custom amount only available on Android/Web (not iOS) */}
        {!isiOSDevice && (
          <div style={{ marginBottom: '8px' }}>
            <input
              type="number"
              placeholder="Custom amount"
              value={customAmount}
              onChange={(e) => handleCustomAmountChange(e.target.value)}
              inputMode="decimal"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              data-testid="input-custom-amount"
              style={{
                width: '100%',
                padding: '12px',
                border: customAmount
                  ? '2px solid #4285f4'
                  : '1px solid #dbdbdb',
                borderRadius: '8px',
                fontSize: '16px',
                touchAction: 'manipulation',
                WebkitAppearance: 'none',
                boxSizing: 'border-box',
                transition: 'all 0.2s ease',
                boxShadow: customAmount
                  ? '0 2px 8px rgba(66, 133, 244, 0.2)'
                  : 'none',
              }}
              min="2"
              max="200"
            />
          </div>
        )}
      </div>

      {/* Message */}
      <div style={{ marginBottom: '24px' }}>
        <div
          style={{
            fontSize: '16px',
            fontWeight: 600,
            color: '#262626',
            marginBottom: '8px',
          }}
        >
          Optional Message
        </div>
        <textarea
          placeholder="Add a message (optional)"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          inputMode="text"
          autoCapitalize="sentences"
          autoCorrect="on"
          spellCheck={true}
          data-testid="input-message"
          style={{
            width: '100%',
            padding: '12px',
            border: message ? '2px solid #4285f4' : '1px solid #dbdbdb',
            borderRadius: '8px',
            fontSize: '16px',
            minHeight: '80px',
            resize: 'vertical',
            touchAction: 'manipulation',
            WebkitAppearance: 'none',
            boxSizing: 'border-box',
            transition: 'all 0.2s ease',
            boxShadow: message ? '0 2px 8px rgba(66, 133, 244, 0.2)' : 'none',
          }}
        />
      </div>

      {/* Payment Completed Message */}
      {paymentCompleted && (
        <div
          style={{
            background: '#d4edda',
            border: '1px solid #c3e6cb',
            color: '#155724',
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '16px',
            fontSize: '14px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: '4px' }}>Thank you!</div>
          <div>
            {isiOSDevice
              ? 'Your purchase was successful. Thank you for supporting Gospel Era!'
              : 'If your payment was successful, you will receive a confirmation email from Stripe. Check your email for details.'}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div
          style={{
            background: '#fee',
            border: '1px solid #fcc',
            color: '#c00',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '16px',
            fontSize: '14px',
            textAlign: 'center',
          }}
        >
          {error}
        </div>
      )}

      {/* Payment Method Selection - Only show on Android/Web (not iOS) */}
      {paymentsEnabled && !isiOSDevice && (
        <div style={{ marginBottom: '16px' }}>
          <div
            style={{
              fontSize: '16px',
              fontWeight: 600,
              color: '#262626',
              marginBottom: '8px',
            }}
          >
            Payment Method
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setActiveTab('stripe')}
              data-testid="button-tab-stripe"
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #dbdbdb',
                fontSize: '14px',
                fontWeight: 600,
                background: activeTab === 'stripe' ? '#0095f6' : '#ffffff',
                color: activeTab === 'stripe' ? '#ffffff' : '#262626',
                cursor: 'pointer',
              }}
            >
              Stripe
            </button>
            <button
              disabled
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #dbdbdb',
                fontSize: '14px',
                fontWeight: 600,
                background: '#f5f5f5',
                color: '#8e8e8e',
                cursor: 'not-allowed',
              }}
            >
              PayPal (Soon)
            </button>
          </div>
        </div>
      )}

      {/* iOS Payment Info */}
      {isiOSDevice && (
        <div
          style={{
            marginBottom: '16px',
            padding: '12px',
            background: '#f0f7ff',
            borderRadius: '8px',
            fontSize: '13px',
            color: '#1a73e8',
            textAlign: 'center',
          }}
        >
          Secure payment via Apple In-App Purchase
        </div>
      )}

      {/* Support Button */}
      <button
        onClick={handleSupport}
        onTouchStart={() => {}}
        disabled={!getSelectedAmount() || isProcessing}
        data-testid="button-submit-support"
        style={{
          width: '100%',
          background: getSelectedAmount() ? '#0095f6' : '#dbdbdb',
          color: getSelectedAmount() ? '#ffffff' : '#8e8e8e',
          border: 'none',
          padding: '16px',
          borderRadius: '8px',
          fontSize: '16px',
          fontWeight: 600,
          cursor: getSelectedAmount() ? 'pointer' : 'default',
          touchAction: 'manipulation',
          userSelect: 'none',
          WebkitTapHighlightColor: 'rgba(0,0,0,0)',
          boxSizing: 'border-box',
          transition: 'all 0.2s ease',
          boxShadow: getSelectedAmount()
            ? '0 2px 8px rgba(66, 133, 244, 0.3)'
            : 'none',
        }}
      >
        {isProcessing
          ? 'Processing...'
          : isiOSDevice
            ? `Support with $${getSelectedAmount() || 0}`
            : paymentsEnabled
              ? `Pay $${getSelectedAmount() || 0} via Stripe`
              : `Support with $${getSelectedAmount() || 0}`}
      </button>

      {/* Info */}
      {!paymentsEnabled && (
        <div
          style={{
            marginTop: '24px',
            padding: '16px',
            background: '#f8f9fa',
            borderRadius: '8px',
            fontSize: '12px',
            color: '#8e8e8e',
            textAlign: 'center',
          }}
        >
          Payment processing will be implemented soon. Thank you for your
          interest in supporting Gospel Era!
        </div>
      )}
    </div>
  );
}
