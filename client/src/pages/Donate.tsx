import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { DonateNotice } from '../components/DonateNotice'
import { createDonationPledge, validateDonationAmount, formatCurrency, createStripeCheckout } from '../lib/donations'
import { PAYMENTS } from '../config/payments'
import { useNavigate } from 'react-router-dom'

export default function Donate() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null)
  const [customAmount, setCustomAmount] = useState('')
  const [message, setMessage] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState('')

  const predefinedAmounts = [5, 10, 25, 50, 100]
  const paymentsEnabled = Boolean(import.meta.env.VITE_STRIPE_PUBLIC_KEY) || PAYMENTS.ENABLE_PAYPAL

  const handleAmountSelect = (amount: number) => {
    setSelectedAmount(amount)
    setCustomAmount('')
    setError('')
  }

  const handleCustomAmountChange = (value: string) => {
    setCustomAmount(value)
    setSelectedAmount(null)
    setError('')
  }

  const getSelectedAmount = () => {
    return selectedAmount || (customAmount ? parseFloat(customAmount) : 0)
  }

  const handleSupport = async () => {
    const amount = getSelectedAmount()
    
    // Validate amount
    const validation = validateDonationAmount(amount)
    if (!validation.valid) {
      setError(validation.error || 'Invalid amount')
      return
    }

    setIsProcessing(true)
    setError('')
    
    try {
      const result = await createDonationPledge({
        amount_cents: Math.round(amount * 100),
        currency: PAYMENTS.CURRENCY,
        message: message.trim() || undefined
      })

      if ('error' in result) {
        setError(result.error)
      } else {
        // Success - redirect to thanks page
        navigate('/support/thanks', { 
          state: { 
            amount: amount,
            message: message.trim() 
          }
        })
      }
    } catch (error) {
      console.error('Support error:', error)
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleStripePayment = async () => {
    const amount = getSelectedAmount()
    
    // Validate amount
    const validation = validateDonationAmount(amount)
    if (!validation.valid) {
      setError(validation.error || 'Invalid amount')
      return
    }

    setIsProcessing(true)
    setError('')
    
    try {
      const result = await createStripeCheckout({
        amount: amount,
        note: message.trim() || undefined
      })

      if ('error' in result) {
        setError(result.error)
      } else {
        // Redirect to Stripe Checkout
        window.location.href = result.url
      }
    } catch (error) {
      console.error('Stripe payment error:', error)
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  const handlePayPalPayment = async () => {
    // TODO: Implement PayPal integration
    console.log('PayPal payment not implemented yet')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-blue-900/20">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-purple-800 dark:text-purple-200 mb-2">
            Support Gospel Era
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Help keep our faith-centered community growing
          </p>
        </div>

        {/* Donate Notice */}
        <DonateNotice className="mb-8" />

        {/* Payment Processing Banner */}
        {!paymentsEnabled && (
          <div className="mb-8 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4 text-center">
            <div className="flex items-center justify-center space-x-2">
              <svg className="h-5 w-5 text-amber-600 dark:text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <p className="text-amber-800 dark:text-amber-200 font-medium">
                Payment processing will be enabled soon; you can still pledge now.
              </p>
            </div>
          </div>
        )}

        {/* Support Form */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-purple-200/60 dark:border-purple-700/60 overflow-hidden">
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
              Choose Your Support Amount
            </h2>

            {/* Predefined Amounts */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Select Amount (USD)
              </label>
              <div className="grid grid-cols-3 gap-3">
                {predefinedAmounts.map((amount) => (
                  <button
                    key={amount}
                    onClick={() => handleAmountSelect(amount)}
                    className={`p-3 rounded-lg border-2 font-semibold transition-all duration-200 ${
                      selectedAmount === amount
                        ? 'border-purple-500 bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                        : 'border-gray-300 hover:border-purple-400 dark:border-gray-600 dark:hover:border-purple-500 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    ${amount}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Amount */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Or Enter Custom Amount ($2–$200)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">
                  $
                </span>
                <input
                  type="number"
                  value={customAmount}
                  onChange={(e) => handleCustomAmountChange(e.target.value)}
                  placeholder="0.00"
                  min="2"
                  max="200"
                  step="0.01"
                  className="w-full pl-8 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            {/* Message */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Optional Message
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Share why you're supporting this community..."
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-white resize-none"
                maxLength={500}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {message.length}/500 characters
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-800 dark:text-red-200 text-sm">
                {error}
              </div>
            )}

            {/* Payment Buttons */}
            <div className="space-y-4">
              {paymentsEnabled && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    {import.meta.env.VITE_STRIPE_PUBLIC_KEY && (
                      <button
                        type="button"
                        onClick={handleStripePayment}
                        disabled={getSelectedAmount() <= 0 || isProcessing}
                        className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105 disabled:transform-none disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                      >
                        {isProcessing ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                            <span>Processing...</span>
                          </>
                        ) : (
                          <>
                            <span>💳</span>
                            <span>Donate with Stripe</span>
                          </>
                        )}
                      </button>
                    )}

                    {PAYMENTS.ENABLE_PAYPAL && (
                      <button
                        type="button"
                        onClick={handlePayPalPayment}
                        disabled={getSelectedAmount() <= 0 || isProcessing}
                        className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105 disabled:transform-none disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                      >
                        {isProcessing ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                            <span>Processing...</span>
                          </>
                        ) : (
                          <>
                            <span>🅿️</span>
                            <span>Support with PayPal</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {/* Or divider */}
                  <div className="text-center">
                    <span className="inline-block px-4 py-2 text-gray-500 dark:text-gray-400 font-medium">
                      or
                    </span>
                  </div>
                </>
              )}

              {!paymentsEnabled && (
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <button
                    type="button"
                    disabled={true}
                    className="w-full bg-gray-400 text-gray-600 font-semibold py-3 px-6 rounded-lg cursor-not-allowed flex items-center justify-center space-x-2"
                  >
                    <span>💳</span>
                    <span>Support with Stripe</span>
                  </button>

                  <button
                    type="button"
                    disabled={true}
                    className="w-full bg-gray-400 text-gray-600 font-semibold py-3 px-6 rounded-lg cursor-not-allowed flex items-center justify-center space-x-2"
                  >
                    <span>🅿️</span>
                    <span>Support with PayPal</span>
                  </button>
                </div>
              )}

              {/* Support Button */}
              <button
                type="button"
                onClick={handleSupport}
                disabled={getSelectedAmount() <= 0 || isProcessing}
                className="w-full bg-gradient-to-r from-gold-400 to-gold-500 hover:from-gold-500 hover:to-gold-600 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-4 px-6 rounded-lg transition-all duration-200 transform hover:scale-[1.02] disabled:transform-none disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    <span>Creating Support...</span>
                  </>
                ) : (
                  <>
                    <span>❤️</span>
                    <span>{paymentsEnabled ? 'Give Support' : `Give $${getSelectedAmount().toFixed(2)} Support`}</span>
                  </>
                )}
              </button>
            </div>

            {/* Security Notice */}
            <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div className="flex items-start space-x-3">
                <svg className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Secure Payment
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    Your gift helps us keep the Gospel community alive. Not tax-deductible.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Impact Section */}
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-purple-200/60 dark:border-purple-700/60 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Your Impact
          </h3>
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Keep the platform running with reliable hosting and infrastructure
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Support ongoing development of new features and improvements
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Enable community moderation and content review
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Help maintain a safe, Christ-centered environment for all users
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}