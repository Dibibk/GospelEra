import { Link } from 'react-router-dom'

interface DonateNoticeProps {
  className?: string
}

export function DonateNotice({ className = "" }: DonateNoticeProps) {
  return (
    <div className={`bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border border-purple-200/60 dark:border-purple-700/60 rounded-xl p-6 shadow-sm ${className}`}>
      <div className="text-center space-y-4">
        <h3 className="text-xl font-bold text-purple-800 dark:text-purple-200">
          Support this App
        </h3>
        
        <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed max-w-2xl mx-auto">
          Your contribution supports hosting, development, and moderation. Contributions are not tax-deductible.
        </p>
        
        <div className="pt-2">
          <Link 
            to="/guidelines"
            className="text-xs text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 transition-colors duration-200 underline"
          >
            Community Guidelines and Terms
          </Link>
        </div>
      </div>
    </div>
  )
}