import React, { createContext, useContext, useEffect, useState } from 'react';

/**
 * Enterprise ThemeManager supporting Light and Dark Mode with System Preference Auto-detection.
 */

export type ThemeMode = 'dark' | 'light' | 'system';

interface ThemeContextType {
  theme: ThemeMode;
  resolvedTheme: 'dark' | 'light';
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = 'agri_theme_preference';
const LEGACY_STORAGE_KEY = 'bkl_theme_preference';

const THEME_COLORS: Record<'dark' | 'light', string> = { light: '#2E7D32', dark: '#10251a' };

function applyThemeClass(theme: ThemeMode): 'dark' | 'light' {
  if (typeof window === 'undefined' || !window.document) return 'light';
  const root = window.document.documentElement;
  if (!root) return 'light';
  root.classList.remove('light', 'dark');

  let effective: 'dark' | 'light' = 'light';
  if (theme === 'system') {
    if (typeof window.matchMedia === 'function') {
      effective = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } else {
      effective = 'light';
    }
  } else {
    effective = theme;
  }
  root.classList.add(effective);

  // Keep the browser chrome / PWA title bar in sync with the active theme.
  const meta = window.document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', THEME_COLORS[effective]);
  return effective;
}

export const ThemeManagerProvider: React.FC<{ children: React.ReactNode; defaultTheme?: ThemeMode }> = ({
  children,
  defaultTheme = 'system',
}) => {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    if (typeof window !== 'undefined') {
      const stored = (window.localStorage.getItem(STORAGE_KEY) ||
        window.localStorage.getItem(LEGACY_STORAGE_KEY)) as ThemeMode | null;
      if (stored) return stored;
    }
    return defaultTheme;
  });

  const [resolvedTheme, setResolvedTheme] = useState<'dark' | 'light'>(() =>
    typeof window !== 'undefined' ? applyThemeClass(theme) : 'light',
  );

  useEffect(() => {
    setResolvedTheme(applyThemeClass(theme));
  }, [theme]);

  // Listen for OS system theme changes when in 'system' mode
  useEffect(() => {
    if (theme !== 'system' || typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => setResolvedTheme(applyThemeClass(theme));
    mediaQuery.addEventListener?.('change', handleChange);
    return () => mediaQuery.removeEventListener?.('change', handleChange);
  }, [theme]);

  const setTheme = (newTheme: ThemeMode) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, newTheme);
      window.localStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch (e) {
      console.warn('[ThemeManager] Could not save theme preference', e);
    }
    setThemeState(newTheme);
  };

  const toggleTheme = () => {
    if (resolvedTheme === 'dark') {
      setTheme('light');
    } else {
      setTheme('dark');
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useThemeManager = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeManager must be used within a ThemeManagerProvider');
  }
  return context;
};
