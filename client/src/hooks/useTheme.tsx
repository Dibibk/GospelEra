import { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'light' | 'heavenly';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  themes: Array<{
    id: Theme;
    name: string;
    description: string;
    colors: {
      primary: string;
      secondary: string;
      background: string;
    };
  }>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const themes = [
  {
    id: 'light' as Theme,
    name: 'Light',
    description: 'Clean and bright',
    colors: {
      primary: '#7c3aed',
      secondary: '#a855f7',
      background: '#ffffff'
    }
  },
  {
    id: 'heavenly' as Theme,
    name: 'Heavenly Light',
    description: 'Divine and uplifting',
    colors: {
      primary: '#A7C7E7',
      secondary: '#F6E6B4',
      background: '#DCEBFA'
    }
  }
];

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('gospel-era-theme');
    return (saved as Theme) || 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    
    // Remove all theme classes
    root.classList.remove('theme-light', 'theme-heavenly');
    
    // Add current theme class
    root.classList.add(`theme-${theme}`);
    
    // Store theme preference
    localStorage.setItem('gospel-era-theme', theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themes }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}