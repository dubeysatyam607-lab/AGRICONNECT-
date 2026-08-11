/**
 * Enterprise Material 3 Agriculture Green Color Palette.
 * Tailored specifically for Indian farming aesthetics: Lush crop greens, golden wheat harvest accents, and earthy clay tones.
 */

export const AGRI_PALETTE = {
  primary: {
    DEFAULT: '#10B981',      // Agriculture Emerald Green
    50: '#ECFDF5',
    100: '#D1FAE5',
    200: '#A7F3D0',
    300: '#6EE7B7',
    400: '#34D399',
    500: '#10B981',
    600: '#059669',          // Deep Farm Green
    700: '#047857',
    800: '#065F46',
    900: '#064E3B',
    950: '#022C22',
  },
  harvest: {
    DEFAULT: '#F59E0B',      // Golden Wheat / Sun Accent
    light: '#FEF3C7',
    dark: '#B45309',
  },
  earth: {
    DEFAULT: '#78350F',      // Rich Soil Brown
    light: '#FEF3C7',
    dark: '#451A03',
  },
  surface: {
    light: '#F8FAFC',        // Slate White
    dark: '#0F172A',         // Midnight Slate
    cardLight: '#FFFFFF',
    cardDark: '#1E293B',
    borderLight: '#E2E8F0',
    borderDark: '#334155',
  },
  status: {
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',
  },
} as const;

export type ColorToken = keyof typeof AGRI_PALETTE;
