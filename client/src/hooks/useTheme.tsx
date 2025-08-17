import { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

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
    id: 'dark' as Theme,
    name: 'Dark',
    description: 'Easy on the eyes',
    colors: {
      primary: '#a855f7',
      secondary: '#c084fc',
      background: '#1f2937'
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
    root.classList.remove('theme-light', 'theme-dark');
    
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