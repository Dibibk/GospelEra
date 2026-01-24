import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { requestMediaAccess } from '../lib/mediaRequests'

interface MediaRequestModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function MediaRequestModal({ open, onOpenChange, onSuccess }: MediaRequestModalProps) {
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!reason.trim()) {
      setError('Please provide a reason for requesting media access')
      return
    }

    setSubmitting(true)
    setError('')

    const { data, error: submitError } = await requestMediaAccess(reason.trim())

    if (submitError) {
      setError(submitError.message || 'Failed to submit request')
    } else {
      onSuccess()
      onOpenChange(false)
      setReason('')
    }

    setSubmitting(false)
  }

  const handleClose = () => {
    if (!submitting) {
      onOpenChange(false)
      setReason('')
      setError('')
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md mx-auto">
        <DialogHeader className="text-center">
          <div className="mx-auto h-12 w-12 bg-gradient-to-br from-primary-600 to-purple-600 rounded-xl flex items-center justify-center mb-4 shadow-lg">
            <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <DialogTitle className="text-xl font-bold text-primary-800">
            Request Media Access
          </DialogTitle>
          <DialogDescription className="text-primary-600 text-sm leading-relaxed">
            Media sharing are a privilege granted to trusted community members to keep our app Christ-centered. 
            If you feel led to share gospel images or videos, you can request access. Every sharing must honor Jesus and align with our guidelines.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="reason" className="text-sm font-semibold text-primary-800">
              Why would you like media upload access?
            </Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Share your heart for how you'd like to use media sharing to spread the Gospel and encourage the faith community..."
              className="min-h-[120px] resize-none bg-white/80 border-primary-200 focus:border-gold-500 focus:ring-gold-500"
              disabled={submitting}
            />
            <p className="text-xs text-primary-500">
              Please be specific about how you plan to use media sharing in a Christ-honoring way.
            </p>
          </div>

          {error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertDescription className="text-red-700 text-sm">
                {error}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={submitting}
              className="flex-1 border-primary-200 text-primary-700 hover:bg-primary-50"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting || !reason.trim()}
              className="flex-1 bg-gradient-to-r from-primary-600 to-purple-600 hover:from-primary-700 hover:to-purple-700 text-white shadow-lg"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                  Submitting...
                </>
              ) : (
                'Submit Request'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}