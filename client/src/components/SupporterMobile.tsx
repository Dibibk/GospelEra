import { useState } from 'react';
import { validateDonationAmount, createStripeCheckout } from '@/lib/donations';

interface SupporterMobileProps {
  onBack: () => void;
}

export function SupporterMobile({ onBack }: SupporterMobileProps) {
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [message, setMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'stripe' | 'paypal'>('stripe');

  const predefinedAmounts = [5, 10, 25, 50, 100];
  const stripeEnabled = Boolean(import.meta.env.VITE_STRIPE_PUBLIC_KEY);
  const paymentsEnabled = stripeEnabled;

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
      });

      if ('error' in result) {
        setError(result.error);
        setIsProcessing(false);
      } else {
        // Navigate to Stripe Checkout
        window.location.href = result.url;
        // Note: Keep isProcessing true while redirecting
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

      {/* Payment Method Selection */}
      {paymentsEnabled && (
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
