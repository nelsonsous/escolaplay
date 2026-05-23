// Sistema de design da EscolaPlay (paleta de styles.css + tokens).
import type { ViewStyle } from 'react-native';

export const colors = {
  primary: '#f472b6',
  primaryDark: '#db2777',
  primaryDeep: '#9d174d',
  primaryLight: '#fce7f3',
  bg: '#fdf2f8',
  card: '#ffffff',
  text: '#1f2937',
  textLight: '#6b7280',
  textMuted: '#9ca3af',
  border: '#eef0f3',
  accent: '#f59e0b',
  success: '#16a34a',
  successBg: '#dcfce7',
  danger: '#dc2626',
  dangerBg: '#fee2e2',
  white: '#ffffff',
};

export const radius = { sm: 10, md: 16, lg: 20, xl: 28, pill: 999 };

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24 };

// Sombra suave e consistente para cards.
export const shadow: ViewStyle = {
  shadowColor: '#9d174d',
  shadowOpacity: 0.1,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 6 },
  elevation: 3,
};

// Sombra mais marcada para botoes principais.
export const shadowStrong = (tint: string): ViewStyle => ({
  shadowColor: tint,
  shadowOpacity: 0.35,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 8 },
  elevation: 6,
});

// Converte um hex em rgba (para tints suaves do fundo dos cards).
export function tint(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
