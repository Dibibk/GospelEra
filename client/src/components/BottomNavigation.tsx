import { Link, useLocation } from 'react-router-dom'
import { Home, Search, PlusCircle, Users, User } from 'lucide-react'

export function BottomNavigation() {
  const location = useLocation()
  
  const isActive = (path: string) => location.pathname === path
  
  const navItems = [
    { path: '/dashboard', icon: Home, label: 'Home' },
    { path: '/search', icon: Search, label: 'Search' },
    { path: '/dashboard', icon: PlusCircle, label: 'Post', isCreate: true },
    { path: '/prayer/browse', icon: Users, label: 'Prayer' },
    { path: '/profile', icon: User, label: 'Profile' }
  ]

  const handleCreateClick = (e: React.MouseEvent) => {
    e.preventDefault()
    const postForm = document.getElementById('post-form')
    if (postForm) {
      postForm.scrollIntoView({ behavior: 'smooth' })
      const titleInput = postForm.querySelector('input[name="title"]') as HTMLInputElement
      if (titleInput) {
        titleInput.focus()
      }
    }
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 z-50 md:hidden">
      <div className="flex items-center justify-around py-2 px-4 safe-area-inset-bottom">
        {navItems.map((item) => (
          <Link
            key={item.path + (item.isCreate ? '-create' : '')}
            to={item.path}
            onClick={item.isCreate ? handleCreateClick : undefined}
            className={`flex flex-col items-center p-2 rounded-lg transition-colors ${
              isActive(item.path) && !item.isCreate
                ? 'text-purple-600 dark:text-purple-400' 
                : 'text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400'
            }`}
            data-testid={`bottom-nav-${item.label.toLowerCase()}`}
          >
            <item.icon className="h-6 w-6" />
            <span className="text-xs mt-1">{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  )
}