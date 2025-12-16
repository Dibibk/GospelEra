import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { CheckCircle, Heart, Star } from 'lucide-react'

interface SubscriptionPromptProps {
  isOpen: boolean
  onClose: () => void
  onSubscribe: () => void
}

export function SubscriptionPrompt({ isOpen, onClose, onSubscribe }: SubscriptionPromptProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px] bg-white dark:bg-gray-900">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-white" />
            </div>
            <DialogTitle className="text-xl font-bold text-green-800 dark:text-green-200">
              Media Access Approved!
            </DialogTitle>
          </div>
          <DialogDescription className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            Congratulations! Your media upload request has been approved. To continue enjoying premium features 
            and support our Gospel community, consider becoming a supporter.
          </DialogDescription>
        </DialogHeader>

        <div className="bg-gradient-to-r from-purple-50 to-primary-50 dark:from-purple-900/20 dark:to-primary-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800 mb-4">
          <div className="font-medium text-primary-700 dark:text-primary-300 mb-2 flex items-center gap-2">
            <Star className="w-4 h-4" />
            Supporter Benefits
          </div>
          <ul className="text-sm space-y-1 text-gray-700 dark:text-gray-300">
            <li>• Priority media upload processing</li>
            <li>• Extended storage limits (100MB per file)</li>
            <li>• Early access to new Gospel community features</li>
            <li>• Direct support for ministry operations</li>
          </ul>
        </div>

        <div className="space-y-4 mt-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary-800 dark:text-primary-200 mb-1">
              $5/month
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Cancel anytime • Secure payment
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              className="flex-1 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
            >
              Maybe Later
            </Button>
            <Button 
              onClick={onSubscribe}
              className="flex-1 bg-gradient-to-r from-primary-600 to-purple-600 hover:from-primary-700 hover:to-purple-700 text-white"
            >
              <Heart className="w-4 h-4 mr-2" />
              Be a Supporter
            </Button>
          </div>

          <div className="text-xs text-center text-gray-500 dark:text-gray-400">
            ✝️ Your support helps maintain our Gospel-centered community
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}