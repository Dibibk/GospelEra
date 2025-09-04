import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/useAuth'
import { requestMediaAccess } from '@/lib/mediaRequests'

interface MediaAccessRequestModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function MediaAccessRequestModal({ isOpen, onClose, onSuccess }: MediaAccessRequestModalProps) {
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()
  const { user } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation() // Prevent any parent form submission
    
    if (!user) {
      toast({
        variant: "destructive",
        title: "Authentication required",
        description: "Please sign in to request link sharing access."
      })
      return
    }

    if (!reason.trim()) {
      toast({
        variant: "destructive", 
        title: "Reason required",
        description: "Please explain why you need link sharing access."
      })
      return
    }

    setIsSubmitting(true)
    
    try {
      const { error } = await requestMediaAccess(reason.trim())
      
      if (error) {
        throw new Error(error.message || 'Failed to submit request')
      }
      
      toast({
        title: "Request submitted successfully!",
        description: "Your media access request has been sent for review. You'll be notified once it's approved.",
      })
      
      setReason('')
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error submitting media request:', error)
      toast({
        variant: "destructive",
        title: "Submission failed",
        description: "Failed to submit your request. Please try again.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] bg-white dark:bg-gray-900">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-gradient-to-r from-primary-500 to-purple-600 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <DialogTitle className="text-xl font-bold text-primary-800 dark:text-primary-200">
              Request Link Sharing
            </DialogTitle>
          </div>
          <DialogDescription className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            Share YouTube links (no uploads). Links are reviewed before appearing publicly.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mb-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            You can request permission to share YouTube links. We don't host uploads.
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-500">
            All content is reviewed to align with Gospel truth and community standards
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <Label htmlFor="reason" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Why do you need link sharing access? <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Share how you plan to use YouTube links to encourage our Gospel community (e.g., worship music, sermons, testimonies, etc.)"
              className="mt-1 min-h-[100px] border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              disabled={isSubmitting}
              className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || !reason.trim()}
              className="bg-gradient-to-r from-primary-600 to-purple-600 hover:from-primary-700 hover:to-purple-700 text-white"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Request'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}