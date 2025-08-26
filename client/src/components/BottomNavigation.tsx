import { Link, useLocation } from 'react-router-dom'
import { Home, Search, PlusCircle, Users, User } from 'lucide-react'

export function BottomNavigation() {
  const location = useLocation()
  
  const isActive = (path: string) => location.pathname === path
  
  const navItems = [
    { path: '/dashboard', icon: Home, label: 'Home', key: 'home' },
    { path: '/dashboard', icon: Search, label: 'Search', key: 'search', isSearch: true },
    { path: '/dashboard', icon: PlusCircle, label: 'Post', key: 'create', isCreate: true },
    { path: '/prayer/browse', icon: Users, label: 'Prayer', key: 'prayer' },
    { path: '/profile', icon: User, label: 'Profile', key: 'profile' }
  ]

  const handleCreateClick = (e: React.MouseEvent) => {
    e.preventDefault()
    // Trigger post creation modal via custom event
    window.dispatchEvent(new CustomEvent('openPostModal'))
  }

  const handleSearchClick = (e: React.MouseEvent) => {
    e.preventDefault()
    // Focus on search input
    setTimeout(() => {
      const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement
      if (searchInput) {
        searchInput.focus()
        searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }, 100)
  }

  return (
    <nav className="nav-mobile md:hidden">
      <div className="flex items-center justify-around w-full">
        {navItems.map((item) => (
          <Link
            key={item.key}
            to={item.path}
            onClick={item.isCreate ? handleCreateClick : item.isSearch ? handleSearchClick : undefined}
            className={`nav-mobile-item md:flex md:items-center md:space-x-2 md:px-3 md:py-2 md:rounded-lg ${
              isActive(item.path) && !item.isCreate && !item.isSearch
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