import { useState } from 'react';
import { useTheme, themes } from '../hooks/useTheme';

export function ThemeSelector() {
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 rounded-lg border border-primary-200 hover:border-primary-400 transition-colors duration-200 bg-white/80 backdrop-blur-sm shadow-sm"
        title="Change theme"
      >
        <div className="w-4 h-4 rounded-full bg-gradient-to-r from-primary-600 to-purple-600"></div>
        <span className="text-sm font-medium text-primary-700 capitalize">{theme}</span>
        <svg 
          className={`w-4 h-4 text-primary-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Theme menu */}
          <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-2xl border border-primary-200 z-20 overflow-hidden backdrop-blur-sm">
            <div className="p-3 border-b border-primary-100">
              <h3 className="text-sm font-semibold text-primary-900">Choose Theme</h3>
              <p className="text-xs text-primary-600 mt-1">Customize your experience</p>
            </div>
            
            <div className="p-2 max-h-80 overflow-y-auto">
              {themes.map((themeOption) => (
                <button
                  key={themeOption.id}
                  onClick={() => {
                    setTheme(themeOption.id);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left p-3 rounded-lg transition-all duration-200 mb-1 group ${
                    theme === themeOption.id 
                      ? 'bg-primary-50 border-2 border-primary-300' 
                      : 'hover:bg-purple-50 border-2 border-transparent'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-8 h-8 rounded-lg shadow-sm border border-primary-200 flex-shrink-0"
                      style={{
                        background: `linear-gradient(135deg, ${themeOption.colors.primary}, ${themeOption.colors.secondary})`
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-primary-900">
                          {themeOption.name}
                        </span>
                        {theme === themeOption.id && (
                          <div className="w-2 h-2 bg-primary-600 rounded-full"></div>
                        )}
                      </div>
                      <p className="text-xs text-primary-600 mt-0.5">
                        {themeOption.description}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            
            <div className="p-3 border-t border-primary-100">
              <p className="text-xs text-primary-500 text-center">
                Theme saved automatically
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}