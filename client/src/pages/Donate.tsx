import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { DonateNotice } from '../components/DonateNotice'

export default function Donate() {
  const { user } = useAuth()
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null)
  const [customAmount, setCustomAmount] = useState('')
  const [message, setMessage] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  const predefinedAmounts = [5, 10, 25, 50, 100]

  const handleAmountSelect = (amount: number) => {
    setSelectedAmount(amount)
    setCustomAmount('')
  }

  const handleCustomAmountChange = (value: string) => {
    setCustomAmount(value)
    setSelectedAmount(null)
  }

  const getSelectedAmount = () => {
    return selectedAmount || (customAmount ? parseFloat(customAmount) : 0)
  }

  const handleDonate = async () => {
    const amount = getSelectedAmount()
    if (amount <= 0) return

    setIsProcessing(true)
    
    try {
      // TODO: Implement payment processing (Stripe, PayPal, etc.)
      console.log('Processing donation:', {
        amount: amount * 100, // Convert to cents
        message,
        userId: user?.id
      })
      
      // Placeholder for actual payment integration
      alert('Payment integration coming soon!')
    } catch (error) {
      console.error('Donation error:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-blue-900/20">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-purple-800 dark:text-purple-200 mb-2">
            Support Gospel Era Web
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Help keep our faith-centered community growing
          </p>
        </div>

        {/* Donate Notice */}
        <DonateNotice className="mb-8" />

        {/* Donation Form */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-purple-200/60 dark:border-purple-700/60 overflow-hidden">
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
              Choose Your Contribution
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
                Or Enter Custom Amount
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
                  min="1"
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

            {/* Donate Button */}
            <button
              onClick={handleDonate}
              disabled={getSelectedAmount() <= 0 || isProcessing}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-4 px-6 rounded-lg transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isProcessing ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                  Processing...
                </div>
              ) : (
                `Donate $${getSelectedAmount().toFixed(2)}`
              )}
            </button>

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
                    Your payment information is encrypted and secure. We never store your payment details.
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