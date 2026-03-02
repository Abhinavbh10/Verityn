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
  danger: string;
  success: string;
  overlay: string;
  imagePlaceholder: string;
}

export const lightColors: ThemeColors = {
  background: '#FFFFFF',
  surface: '#F8FAFC',
  card: '#FFFFFF',
  text: '#111827',
  textSecondary: '#374151',
  textMuted: '#9CA3AF',
  border: '#F1F5F9',
  primary: '#2563EB',
  primaryLight: '#EFF6FF',
  danger: '#DC2626',
  success: '#059669',
  overlay: 'rgba(0,0,0,0.5)',
  imagePlaceholder: '#1F2937',
};

export const darkColors: ThemeColors = {
  background: '#0F172A',
  surface: '#1E293B',
  card: '#1E293B',
  text: '#F1F5F9',
  textSecondary: '#CBD5E1',
  textMuted: '#64748B',
  border: '#334155',
  primary: '#3B82F6',
  primaryLight: '#1E3A5F',
  danger: '#EF4444',
  success: '#10B981',
  overlay: 'rgba(0,0,0,0.7)',
  imagePlaceholder: '#334155',
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
