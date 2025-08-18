import { useTheme } from '../hooks/useTheme';

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'heavenly' : 'light');
  };

  return (
    <button
      onClick={toggleTheme}
      className="flex items-center w-full px-4 py-3 text-sm text-primary-700 theme-heavenly:text-primary-600 hover:bg-gradient-to-r hover:from-primary-50 hover:to-purple-50 theme-heavenly:hover:from-heavenly-sky-blue theme-heavenly:hover:to-heavenly-divine-silver transition-all duration-200 font-medium"
    >
      {theme === 'light' ? (
        <>
          <svg className="inline h-4 w-4 mr-3 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
          Switch to Heavenly Light Theme
        </>
      ) : (
        <>
          <svg className="inline h-4 w-4 mr-3 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          Switch to Light Mode
        </>
      )}
    </button>
  );
}