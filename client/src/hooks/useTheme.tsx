import { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark' | 'gospel' | 'ocean' | 'forest' | 'sunset';

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
  },
  {
    id: 'gospel' as Theme,
    name: 'Gospel Gold',
    description: 'Purple and gold elegance',
    colors: {
      primary: '#7c3aed',
      secondary: '#f59e0b',
      background: '#fdf4ff'
    }
  },
  {
    id: 'ocean' as Theme,
    name: 'Ocean Blue',
    description: 'Calm and peaceful',
    colors: {
      primary: '#0ea5e9',
      secondary: '#06b6d4',
      background: '#f0f9ff'
    }
  },
  {
    id: 'forest' as Theme,
    name: 'Forest Green',
    description: 'Natural and grounding',
    colors: {
      primary: '#059669',
      secondary: '#10b981',
      background: '#f0fdf4'
    }
  },
  {
    id: 'sunset' as Theme,
    name: 'Sunset Orange',
    description: 'Warm and energetic',
    colors: {
      primary: '#ea580c',
      secondary: '#f97316',
      background: '#fff7ed'
    }
  }
];

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('gospel-era-theme');
    return (saved as Theme) || 'gospel';
  });

  useEffect(() => {
    const root = document.documentElement;
    
    // Remove all theme classes
    root.classList.remove('theme-light', 'theme-dark', 'theme-gospel', 'theme-ocean', 'theme-forest', 'theme-sunset');
    
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