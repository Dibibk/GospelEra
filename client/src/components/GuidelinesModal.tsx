import { useEffect, useState, useRef } from 'react'
import { Button } from './ui/button'

interface GuidelinesModalProps {
  isOpen: boolean
  onAgree: () => void
  onViewFull: () => void
}

export function GuidelinesModal({ isOpen, onAgree, onViewFull }: GuidelinesModalProps) {
  const [isScrolledToBottom, setIsScrolledToBottom] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const checkScrollPosition = () => {
    const scrollElement = scrollRef.current
    if (scrollElement) {
      const { scrollTop, scrollHeight, clientHeight } = scrollElement
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10
      setIsScrolledToBottom(isAtBottom)
    }
  }

  useEffect(() => {
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
      <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-2xl w-full h-[85vh] border border-purple-200 dark:border-purple-700 shadow-2xl flex flex-col overflow-hidden">
        
        {/* Fixed Header */}
        <div className="flex-shrink-0 text-center p-6 border-b border-purple-200 dark:border-purple-700">
          <h2 className="text-2xl font-bold text-purple-800 dark:text-purple-300">
            Gospel Community Guidelines
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm mt-2">
            Welcome to our faith community! Please review these important guidelines.
          </p>
        </div>
        
        {/* Scrollable Content */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-purple-400 scrollbar-track-purple-100"
             style={{ scrollbarWidth: 'thin', scrollbarColor: '#a855f7 #e9d5ff' }}>
          <div className="space-y-4">
            
            {/* Pray, Encourage, Respect */}
            <div className="bg-purple-50 dark:bg-purple-900/30 rounded-lg p-4 border border-purple-200 dark:border-purple-700">
              <h3 className="text-lg font-semibold text-purple-700 dark:text-purple-300 mb-2">
                🙏 Pray, Encourage, Respect
              </h3>
              <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                Share prayer requests and encouragement in love. Respect all users across denominations and cultures. We are united in Christ despite our differences.
              </p>
            </div>

            {/* Christ-Centered */}
            <div className="bg-purple-50 dark:bg-purple-900/30 rounded-lg p-4 border border-purple-200 dark:border-purple-700">
              <h3 className="text-lg font-semibold text-purple-700 dark:text-purple-300 mb-2">
                ✝️ Christ-Centered Community
              </h3>
              <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed mb-3">
                This is a Christian prayer community where prayers are directed to Jesus Christ, God the Father, or the Holy Spirit in accordance with Scripture.
              </p>
              <p className="text-gray-600 dark:text-gray-400 text-xs">
                While we welcome discussions about faith, all prayer requests should be directed to the Christian God through Jesus Christ.
              </p>
            </div>

            {/* Safe Space Guidelines */}
            <div className="bg-purple-50 dark:bg-purple-900/30 rounded-lg p-4 border border-purple-200 dark:border-purple-700">
              <h3 className="text-lg font-semibold text-purple-700 dark:text-purple-300 mb-2">
                🛡️ Safe Space Guidelines
              </h3>
              <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                No hateful, obscene, violent, or mocking content. No harassment, bullying, or content that damages our witness as Christians.
              </p>
            </div>

            {/* Biblical Foundation */}
            <div className="bg-purple-50 dark:bg-purple-900/30 rounded-lg p-4 border border-purple-200 dark:border-purple-700">
              <h3 className="text-lg font-semibold text-purple-700 dark:text-purple-300 mb-2">
                📖 Biblical Foundation
              </h3>
              <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed mb-3">
                Our community is built on biblical principles. Content should align with Christian values and Scripture.
              </p>
              <ul className="text-gray-600 dark:text-gray-400 text-xs space-y-1 list-disc list-inside">
                <li>Share genuine prayer needs and testimonies</li>
                <li>Encourage others with Scripture and Christian love</li>
                <li>Maintain a spirit of unity and fellowship</li>
                <li>Honor God in all interactions</li>
              </ul>
            </div>

            {/* Content Moderation */}
            <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
              <h3 className="text-lg font-semibold text-blue-700 dark:text-blue-300 mb-2">
                🔍 Content Moderation
              </h3>
              <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                Our community uses faith-aligned moderation to ensure content remains Christ-centered. Posts referencing other religious practices may be gently redirected to maintain our community's focus.
              </p>
              <p className="text-blue-600 dark:text-blue-400 text-xs mt-2">
                "We welcome all people but this space is specifically for Christian prayer to Jesus."
              </p>
            </div>

            {/* Scripture Foundation */}
            <div className="bg-yellow-50 dark:bg-yellow-900/30 rounded-lg p-4 border border-yellow-200 dark:border-yellow-700">
              <blockquote className="text-gray-700 dark:text-gray-300 text-sm italic mb-2">
                "For where two or three gather in my name, there am I with them."
              </blockquote>
              <cite className="text-yellow-700 dark:text-yellow-300 text-xs">— Matthew 18:20</cite>
            </div>

            {/* Additional Community Expectations */}
            <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-4 border border-green-200 dark:border-green-700">
              <h3 className="text-lg font-semibold text-green-700 dark:text-green-300 mb-2">
                🤝 Community Expectations
              </h3>
              <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed mb-3">
                We ask all members to approach this community with humility, love, and genuine faith. Whether you're sharing a prayer request or responding to others, let Christ's love guide your words.
              </p>
              <ul className="text-gray-600 dark:text-gray-400 text-xs space-y-1 list-disc list-inside">
                <li>Pray for others as you would want them to pray for you</li>
                <li>Share encouragement based on biblical truth</li>
                <li>Respect different Christian denominations and traditions</li>
                <li>Keep personal information private and safe</li>
                <li>Report any content that doesn't align with our guidelines</li>
              </ul>
            </div>

            {/* Final Reminder */}
            <div className="bg-purple-100 dark:bg-purple-900/50 rounded-lg p-4 border border-purple-300 dark:border-purple-600">
              <h3 className="text-lg font-semibold text-purple-800 dark:text-purple-200 mb-2">
                💜 Welcome to Our Family
              </h3>
              <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                Thank you for joining our Christ-centered community. Together, we can support each other through prayer, encouragement, and the love of Jesus. May God bless your time here and strengthen your faith journey.
              </p>
              <p className="text-purple-700 dark:text-purple-300 text-xs mt-2 italic">
                "Bear one another's burdens, and so fulfill the law of Christ." - Galatians 6:2
              </p>
            </div>
            
            {/* Bottom spacing to ensure scroll */}
            <div className="h-8"></div>
          </div>
        </div>
        
        {/* Fixed Footer */}
        <div className="flex-shrink-0 p-6 border-t border-purple-200 dark:border-purple-700 bg-white dark:bg-gray-900">
          {!isScrolledToBottom && (
            <p className="text-xs text-purple-600 dark:text-purple-400 text-center mb-3 animate-pulse">
              Please scroll down to read all guidelines before continuing
            </p>
          )}
          <Button 
            onClick={onAgree}
            disabled={!isScrolledToBottom}
            className={`w-full mb-3 ${
              isScrolledToBottom 
                ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isScrolledToBottom ? '✝️ I Agree & Join the Community' : '📜 Please Read All Guidelines First'}
          </Button>

          <div className="flex justify-center mb-2">
            <button 
              onClick={onViewFull}
              className="text-xs text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 underline"
            >
              View Full Guidelines Page
            </button>
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            By continuing, you agree to follow these Christ-centered community guidelines.
          </p>
        </div>
      </div>
    </div>
  )
}