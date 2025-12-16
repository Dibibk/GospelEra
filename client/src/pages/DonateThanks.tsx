import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useEffect, useState } from 'react'

export default function DonateThanks() {
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { amount, message } = location.state || {}
  const sessionId = searchParams.get('session_id')
  const [loading, setLoading] = useState(!!sessionId)

  useEffect(() => {
    // If there's a session_id, this came from Stripe
    if (sessionId) {
      setLoading(false)
      return
    }
    
    // If no donation data from state and no session_id, redirect back to donate page
    if (!amount && !sessionId) {
      navigate('/support')
    }
  }, [amount, sessionId, navigate])

  if (!amount && !sessionId) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 py-12">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Confirming your support...</p>
          </div>
        ) : (
          <>
            {/* Thank You Message */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-purple-200/60 dark:border-purple-700/60 p-8 text-center">
              {/* Success Icon */}
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>

              {/* Main Message */}
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                {sessionId ? 'Thank you for your support!' : 'Thank You for Your Pledge!'}
              </h1>
              
              {sessionId ? (
                <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">
                  Your support has been processed successfully through Stripe.
                </p>
              ) : (
                <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">
                  Your support pledge of <span className="font-semibold text-purple-600 dark:text-purple-400">
                    ${amount.toFixed(2)}
                  </span> has been recorded.
                </p>
              )}

              {sessionId && (
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 mb-6">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Transaction ID: <span className="font-mono">{sessionId}</span>
                  </p>
                </div>
              )}

              {message && (
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 mb-6">
                  <h3 className="font-medium text-gray-900 dark:text-white mb-2">Your Message:</h3>
                  <p className="text-gray-700 dark:text-gray-300 italic">"{message}"</p>
                </div>
              )}

              {/* Email Notice - only show for pledges, not completed payments */}
              {!sessionId && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
                  <div className="flex items-center justify-center space-x-2 mb-2">
                    <svg className="h-5 w-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                      <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                    </svg>
                    <p className="text-blue-800 dark:text-blue-200 font-medium">
                      We'll email you when donations go live!
                    </p>
                  </div>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Once payment processing is enabled, we'll send you a secure link to complete your donation.
                  </p>
                </div>
              )}

          {/* What's Next */}
          <div className="text-left bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">What happens next:</h3>
            <div className="space-y-2">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Your pledge is saved and secure
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  We'll set up payment processing with Stripe and PayPal
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  You'll receive an email with payment instructions
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Your support helps keep our Christian community thriving
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate('/dashboard')}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors"
            >
              Continue to Dashboard
            </button>
            <button
              onClick={() => navigate('/support')}
              className="px-6 py-3 border border-purple-600 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 font-semibold rounded-lg transition-colors"
            >
              Give More Support
            </button>
          </div>
            </div>

            {/* Scripture */}
            <div className="mt-8 text-center">
              <blockquote className="text-gray-600 dark:text-gray-400 italic">
                {sessionId ? (
                  "Each of you should give what you have decided in your heart to give, not reluctantly or under compulsion, for God loves a cheerful giver."
                ) : (
                  "Give, and it will be given to you. A good measure, pressed down, shaken together and running over, will be poured into your lap. For with the measure you use, it will be measured to you."
                )}
              </blockquote>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                {sessionId ? '2 Corinthians 9:7' : 'Luke 6:38'}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}