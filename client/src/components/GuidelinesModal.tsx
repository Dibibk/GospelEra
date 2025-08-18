import { useState } from 'react'
import { useRouter } from 'wouter'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface GuidelinesModalProps {
  isOpen: boolean
  onAgree: () => void
  onViewFull: () => void
}

export function GuidelinesModal({ isOpen, onAgree, onViewFull }: GuidelinesModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/95 backdrop-blur-md rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-purple-200 shadow-2xl">
        <Card className="border-0 shadow-none bg-transparent">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl font-bold text-purple-800">
              Gospel Community Guidelines
            </CardTitle>
            <p className="text-gray-600 text-sm">
              Welcome to our faith community! Please review these important guidelines.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Pray, Encourage, Respect */}
            <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
              <h3 className="text-lg font-semibold text-purple-700 mb-2">
                Pray, Encourage, Respect
              </h3>
              <p className="text-gray-700 text-sm">
                Share prayer requests and encouragement in love. Respect all users across denominations and cultures.
              </p>
            </div>

            {/* Christ-Centered */}
            <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
              <h3 className="text-lg font-semibold text-purple-700 mb-2">
                Christ-Centered
              </h3>
              <p className="text-gray-700 text-sm">
                This is a Christian prayer community. Prayers are to Jesus Christ and in line with Scripture.
              </p>
            </div>

            {/* No Abuse or Harm */}
            <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
              <h3 className="text-lg font-semibold text-purple-700 mb-2">
                No Abuse or Harm
              </h3>
              <p className="text-gray-700 text-sm">
                No hateful, obscene, violent, or mocking content. No harassment or bullying.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200">
              <Button 
                onClick={onViewFull}
                variant="outline" 
                className="flex-1 border-purple-300 text-purple-700 hover:bg-purple-50"
              >
                View Full Guidelines
              </Button>
              <Button 
                onClick={onAgree}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
              >
                I Agree & Continue
              </Button>
            </div>

            <p className="text-xs text-gray-500 text-center pt-2">
              By continuing, you agree to follow these community guidelines.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}