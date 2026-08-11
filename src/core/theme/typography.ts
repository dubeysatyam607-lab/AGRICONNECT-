/**
 * Enterprise Material 3 Typography System for AgriConnect.
 * Follows Google M3 Type Scale: Display, Headline, Title, Body, and Label.
 */

export const M3_TYPOGRAPHY = {
  displayLarge: 'text-4xl sm:text-5xl font-extrabold tracking-tight leading-none',
  displayMedium: 'text-3xl sm:text-4xl font-bold tracking-tight leading-tight',
  displaySmall: 'text-2xl sm:text-3xl font-bold tracking-tight leading-snug',
  
  headlineLarge: 'text-2xl font-bold tracking-normal leading-normal',
  headlineMedium: 'text-xl font-bold tracking-normal leading-normal',
  headlineSmall: 'text-lg font-bold tracking-normal leading-normal',
  
  titleLarge: 'text-lg font-semibold tracking-normal leading-normal',
  titleMedium: 'text-base font-semibold tracking-normal leading-normal',
  titleSmall: 'text-sm font-semibold tracking-normal leading-normal',
  
  bodyLarge: 'text-base font-normal tracking-normal leading-relaxed',
  bodyMedium: 'text-sm font-normal tracking-normal leading-relaxed',
  bodySmall: 'text-xs font-normal tracking-normal leading-relaxed',
  
  labelLarge: 'text-sm font-bold uppercase tracking-wider leading-none',
  labelMedium: 'text-xs font-bold uppercase tracking-wider leading-none',
  labelSmall: 'text-[10px] font-bold uppercase tracking-widest leading-none',
} as const;

export type TypographyToken = keyof typeof M3_TYPOGRAPHY;
