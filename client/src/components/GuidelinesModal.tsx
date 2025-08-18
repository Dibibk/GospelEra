import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'wouter'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface GuidelinesModalProps {
  isOpen: boolean
  onAgree: () => void
  onViewFull: () => void
}

export function GuidelinesModal({ isOpen, onAgree, onViewFull }: GuidelinesModalProps) {
  const [isScrolledToBottom, setIsScrolledToBottom] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const checkScrollPosition = () => {
      if (scrollRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
        const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10 // 10px threshold
        setIsScrolledToBottom(isAtBottom)
      }
    }

    const scrollElement = scrollRef.current
    if (scrollElement) {
      scrollElement.addEventListener('scroll', checkScrollPosition)
      // Check initial position
      checkScrollPosition()
      
      return () => {
        scrollElement.removeEventListener('scroll', checkScrollPosition)
      }
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/95 backdrop-blur-md rounded-2xl max-w-2xl w-full max-h-[90vh] border border-purple-200 shadow-2xl flex flex-col">
        <Card className="border-0 shadow-none bg-transparent flex-1 flex flex-col">
          <CardHeader className="text-center pb-4 flex-shrink-0">
            <CardTitle className="text-2xl font-bold text-purple-800">
              Gospel Community Guidelines
            </CardTitle>
            <p className="text-gray-600 text-sm">
              Welcome to our faith community! Please review these important guidelines.
            </p>
          </CardHeader>
          
          {/* Scrollable Content */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-6">
            <div className="space-y-4 pb-4">
              {/* Pray, Encourage, Respect */}
              <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                <h3 className="text-lg font-semibold text-purple-700 mb-2">
                  🙏 Pray, Encourage, Respect
                </h3>
                <p className="text-gray-700 text-sm leading-relaxed">
                  Share prayer requests and encouragement in love. Respect all users across denominations and cultures. We are united in Christ despite our differences.
                </p>
              </div>

              {/* Christ-Centered */}
              <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                <h3 className="text-lg font-semibold text-purple-700 mb-2">
                  ✝️ Christ-Centered Community
                </h3>
                <p className="text-gray-700 text-sm leading-relaxed mb-3">
                  This is a Christian prayer community where prayers are directed to Jesus Christ, God the Father, or the Holy Spirit in accordance with Scripture.
                </p>
                <p className="text-gray-600 text-xs">
                  While we welcome discussions about faith, all prayer requests should be directed to the Christian God through Jesus Christ.
                </p>
              </div>

              {/* No Abuse or Harm */}
              <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                <h3 className="text-lg font-semibold text-purple-700 mb-2">
                  🛡️ Safe Space Guidelines
                </h3>
                <p className="text-gray-700 text-sm leading-relaxed">
                  No hateful, obscene, violent, or mocking content. No harassment, bullying, or content that damages our witness as Christians.
                </p>
              </div>

              {/* Community Standards */}
              <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                <h3 className="text-lg font-semibold text-purple-700 mb-2">
                  📖 Biblical Foundation
                </h3>
                <p className="text-gray-700 text-sm leading-relaxed mb-3">
                  Our community is built on biblical principles. Content should align with Christian values and Scripture.
                </p>
                <ul className="text-gray-600 text-xs space-y-1 list-disc list-inside">
                  <li>Share genuine prayer needs and testimonies</li>
                  <li>Encourage others with Scripture and Christian love</li>
                  <li>Maintain a spirit of unity and fellowship</li>
                  <li>Honor God in all interactions</li>
                </ul>
              </div>

              {/* Moderation Notice */}
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <h3 className="text-lg font-semibold text-blue-700 mb-2">
                  🔍 Content Moderation
                </h3>
                <p className="text-gray-700 text-sm leading-relaxed">
                  Our community uses faith-aligned moderation to ensure content remains Christ-centered. Posts referencing other religious practices may be gently redirected to maintain our community's focus.
                </p>
                <p className="text-blue-600 text-xs mt-2">
                  "We welcome all people but this space is specifically for Christian prayer to Jesus."
                </p>
              </div>

              {/* Scripture Foundation */}
              <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                <blockquote className="text-gray-700 text-sm italic mb-2">
                  "For where two or three gather in my name, there am I with them."
                </blockquote>
                <cite className="text-yellow-700 text-xs">— Matthew 18:20</cite>
              </div>
            </div>
          </div>

          {/* Fixed Footer with Single Button */}
          <CardContent className="flex-shrink-0 pt-4">
            <div className="pt-4 border-t border-gray-200">
              {!isScrolledToBottom && (
                <p className="text-xs text-purple-600 text-center mb-3 animate-pulse">
                  Please scroll down to read all guidelines before continuing
                </p>
              )}
              <Button 
                onClick={onAgree}
                disabled={!isScrolledToBottom}
                className={`w-full ${
                  isScrolledToBottom 
                    ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {isScrolledToBottom ? '✝️ I Agree & Join the Community' : '📜 Please Read All Guidelines First'}
              </Button>
            </div>

            <div className="flex justify-center mt-3">
              <button 
                onClick={onViewFull}
                className="text-xs text-purple-600 hover:text-purple-800 underline"
              >
                View Full Guidelines Page
              </button>
            </div>

            <p className="text-xs text-gray-500 text-center pt-2">
              By continuing, you agree to follow these Christ-centered community guidelines.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}