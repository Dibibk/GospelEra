import { Link } from 'react-router-dom'
import { ArrowLeft, Home } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export function GuidelinesCard() {
  return (
    <Card className="bg-white/80 backdrop-blur-sm border-amber-200">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-purple-800 text-center">
          Gospel Community Guidelines
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Pray, Encourage, Respect */}
        <div>
          <h3 className="text-lg font-semibold text-purple-700 mb-2">
            Pray, Encourage, Respect
          </h3>
          <p className="text-gray-700 leading-relaxed">
            Share prayer requests and encouragement in love. Respect all users across denominations and cultures.
          </p>
        </div>

        {/* Christ-Centered */}
        <div>
          <h3 className="text-lg font-semibold text-purple-700 mb-2">
            Christ-Centered
          </h3>
          <p className="text-gray-700 leading-relaxed">
            This is a Christian prayer community. Prayers are to Jesus Christ and in line with Scripture.
          </p>
        </div>

        {/* No Abuse or Harm */}
        <div>
          <h3 className="text-lg font-semibold text-purple-700 mb-2">
            No Abuse or Harm
          </h3>
          <p className="text-gray-700 leading-relaxed">
            No hateful, obscene, violent, or mocking content. No harassment or bullying.
          </p>
        </div>

        {/* Protect Privacy */}
        <div>
          <h3 className="text-lg font-semibold text-purple-700 mb-2">
            Protect Privacy
          </h3>
          <p className="text-gray-700 leading-relaxed">
            Be mindful with sensitive details. Respect confidentiality.
          </p>
        </div>

        {/* Stay Authentic */}
        <div>
          <h3 className="text-lg font-semibold text-purple-700 mb-2">
            Stay Authentic
          </h3>
          <p className="text-gray-700 leading-relaxed">
            No spam or unrelated promotion. Share genuinely.
          </p>
        </div>

        {/* Help Keep It Safe */}
        <div>
          <h3 className="text-lg font-semibold text-purple-700 mb-2">
            Help Keep It Safe
          </h3>
          <p className="text-gray-700 leading-relaxed">
            Use Report on anything concerning. We may remove content or restrict accounts that break these rules.
          </p>
        </div>

        {/* Agreement Note */}
        <div className="pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-600 text-center italic">
            By using this app, you agree to follow these guidelines.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

export default function Guidelines() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-amber-200 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link to="/dashboard" className="text-purple-600 hover:text-purple-700">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <h1 className="text-xl font-bold text-purple-800">Community Guidelines</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-3xl mx-auto space-y-6">
          <GuidelinesCard />
          
          {/* Back to Home Button */}
          <div className="text-center">
            <Link to="/dashboard">
              <Button className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3">
                <Home className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}