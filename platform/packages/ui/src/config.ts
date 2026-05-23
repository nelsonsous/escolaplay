// Configuracao Tamagui com a identidade visual da EscolaPlay.
// Os tokens vêm diretamente de styles.css (paleta rosa + Nunito), por
// isso o aspeto nativo fica 1:1 com a PWA atual.

import { createTamagui, createTokens, createFont } from '@tamagui/core';

const nunito = createFont({
  family:
    'Nunito, -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
  size: { 1: 12, 2: 14, 3: 16, 4: 18, 5: 22, 6: 28, 7: 34, true: 16 },
  lineHeight: { 1: 16, 2: 20, 3: 22, 4: 26, 5: 30, 6: 36, 7: 42, true: 22 },
  weight: { 4: '400', 6: '600', 7: '700', 8: '800', 9: '900', true: '600' },
  letterSpacing: { 4: 0, true: 0 },
});

export const tokens = createTokens({
  color: {
    primary: '#f472b6',
    primaryDark: '#db2777',
    primaryLight: '#fce7f3',
    accent: '#f59e0b',
    success: '#16a34a',
    danger: '#dc2626',
    text: '#1f2937',
    textLight: '#6b7280',
    textMuted: '#9ca3af',
    border: '#e5e7eb',
    cardBg: '#ffffff',
    bgTop: '#fdf2f8',
    bgBottom: '#fce7f3',
    white: '#ffffff',
  },
  space: { 0: 0, 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 7: 32, true: 16 },
  size: { 0: 0, 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 7: 32, 8: 44, 9: 60, true: 16 },
  radius: { 0: 0, 1: 8, 2: 10, 3: 13, 4: 14, 5: 18, 6: 20, true: 14 },
  zIndex: { 0: 0, 1: 50, 2: 100, true: 0 },
});

const config = createTamagui({
  fonts: { heading: nunito, body: nunito },
  tokens,
  themes: {
    light: {
      background: tokens.color.bgTop,
      color: tokens.color.text,
      primary: tokens.color.primary,
      card: tokens.color.cardBg,
      borderColor: tokens.color.border,
    },
  },
  shorthands: {
    p: 'padding',
    px: 'paddingHorizontal',
    py: 'paddingVertical',
    m: 'margin',
    mt: 'marginTop',
    mb: 'marginBottom',
    br: 'borderRadius',
    bg: 'backgroundColor',
    f: 'flex',
    ai: 'alignItems',
    jc: 'justifyContent',
    gap: 'gap',
  } as const,
});

export type AppConfig = typeof config;

declare module '@tamagui/core' {
  interface TamaguiCustomConfig extends AppConfig {}
}

export default config;
