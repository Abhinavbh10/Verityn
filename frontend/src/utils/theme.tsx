import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { secureStorage } from './secureStorage';

const THEME_KEY = 'verityn_theme_preference';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeColors {
  background: string;
  surface: string;
  card: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  primary: string;
  primaryLight: string;
  accent: string;
  danger: string;
  success: string;
  overlay: string;
  imagePlaceholder: string;
}

// European Elegance Theme - Warm, sophisticated, premium feel
export const lightColors: ThemeColors = {
  background: '#FDF8F3',      // Warm white
  surface: '#FFF9F5',         // Slightly warmer surface
  card: '#FFFFFF',            // Pure white cards for contrast
  text: '#292524',            // Stone 800 - warm dark
  textSecondary: '#57534E',   // Stone 600
  textMuted: '#A8A29E',       // Stone 400
  border: '#E7E5E4',          // Stone 200
  primary: '#B45309',         // Warm Amber - premium accent
  primaryLight: '#FEF3C7',    // Amber 100
  accent: '#1E3A5F',          // Navy accent
  danger: '#DC2626',
  success: '#059669',
  overlay: 'rgba(41,37,36,0.5)',
  imagePlaceholder: '#44403C', // Stone 700
};

export const darkColors: ThemeColors = {
  background: '#18181B',      // Zinc 900 - true dark
  surface: '#27272A',         // Zinc 800
  card: '#27272A',            // Zinc 800
  text: '#FAFAF9',            // Stone 50
  textSecondary: '#D6D3D1',   // Stone 300
  textMuted: '#78716C',       // Stone 500
  border: '#3F3F46',          // Zinc 700
  primary: '#F59E0B',         // Bright Amber
  primaryLight: '#422006',    // Amber 950
  accent: '#60A5FA',          // Blue accent
  danger: '#EF4444',
  success: '#10B981',
  overlay: 'rgba(0,0,0,0.7)',
  imagePlaceholder: '#3F3F46', // Zinc 700
};

interface ThemeContextType {
  theme: ThemeMode;
  colors: ThemeColors;
  isDark: boolean;
  setTheme: (theme: ThemeMode) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [theme, setThemeState] = useState<ThemeMode>('system');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const saved = await secureStorage.getItem(THEME_KEY);
      if (saved && ['light', 'dark', 'system'].includes(saved)) {
        setThemeState(saved as ThemeMode);
      }
    } catch (error) {
      console.error('Error loading theme:', error);
    }
    setIsLoaded(true);
  };

  const setTheme = async (newTheme: ThemeMode) => {
    setThemeState(newTheme);
    await secureStorage.setItem(THEME_KEY, newTheme);
  };

  const isDark = theme === 'dark' || (theme === 'system' && systemColorScheme === 'dark');
  const colors = isDark ? darkColors : lightColors;

  if (!isLoaded) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{ theme, colors, isDark, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
