// Sistema de design da EscolaPlay (paleta + tokens + helpers).
import type { ViewStyle, TextStyle } from 'react-native';
import { Easing } from 'react-native';

export const colors = {
  // Marca
  primary: '#f472b6',
  primaryDark: '#db2777',
  primaryDeep: '#9d174d',
  primaryLight: '#fce7f3',
  primarySoft: '#fdf2f8',
  // Fundo
  bg: '#fdf2f8',
  bgSoft: '#fff5fa',
  card: '#ffffff',
  // Texto
  text: '#18162c',
  textLight: '#6b7280',
  textMuted: '#9ca3af',
  border: '#eef0f3',
  borderStrong: '#e2e4e7',
  // Apoio
  accent: '#f59e0b',
  accentDeep: '#b45309',
  success: '#16a34a',
  successBg: '#dcfce7',
  successDeep: '#15803d',
  danger: '#dc2626',
  dangerBg: '#fee2e2',
  dangerDeep: '#991b1b',
  info: '#0ea5e9',
  white: '#ffffff',
  // Disciplinas (eco do data.ts — para usar como referência)
  subjPortugues: '#e11d48',
  subjMatematica: '#2563eb',
  subjEstudoMeio: '#16a34a',
  subjIngles: '#7c3aed',
};

export const radius = { xs: 8, sm: 10, md: 16, lg: 20, xl: 28, pill: 999 };

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 };

// Easings premium (mola, saída suave).
export const ease = {
  out: Easing.bezier(0.16, 1, 0.3, 1),
  spring: Easing.bezier(0.34, 1.56, 0.64, 1),
  inOut: Easing.bezier(0.65, 0, 0.35, 1),
  swift: Easing.bezier(0.4, 0, 0.2, 1),
};

// Tipografia consistente.
export const font = {
  hero: { fontSize: 28, fontWeight: '900' as const, letterSpacing: -0.6 },
  title: { fontSize: 22, fontWeight: '900' as const, letterSpacing: -0.4 },
  subtitle: { fontSize: 17, fontWeight: '800' as const, letterSpacing: -0.2 },
  body: { fontSize: 15, fontWeight: '600' as const },
  caption: { fontSize: 12, fontWeight: '700' as const, color: colors.textLight },
  overline: { fontSize: 11, fontWeight: '900' as const, letterSpacing: 0.8, textTransform: 'uppercase' as const },
};

// Sombras — escala completa.
export const shadow: ViewStyle = {
  shadowColor: '#9d174d',
  shadowOpacity: 0.08,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 6 },
  elevation: 3,
};

export const shadowSm: ViewStyle = {
  shadowColor: '#18162c',
  shadowOpacity: 0.06,
  shadowRadius: 4,
  shadowOffset: { width: 0, height: 2 },
  elevation: 2,
};

export const shadowLg: ViewStyle = {
  shadowColor: '#9d174d',
  shadowOpacity: 0.14,
  shadowRadius: 22,
  shadowOffset: { width: 0, height: 12 },
  elevation: 8,
};

// Sombra tingida com a cor do elemento (estilo Linear / Stripe).
export const shadowStrong = (tint: string): ViewStyle => ({
  shadowColor: tint,
  shadowOpacity: 0.42,
  shadowRadius: 18,
  shadowOffset: { width: 0, height: 10 },
  elevation: 8,
});

export const shadowSoft = (tint: string): ViewStyle => ({
  shadowColor: tint,
  shadowOpacity: 0.18,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 6 },
  elevation: 4,
});

// Converte um hex em rgba (para tints suaves do fundo dos cards).
export function tint(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Mistura uma cor com branco (claro) ou preto (escuro) — sem libs.
// amount: 0..1 (0 = sem mudar, 1 = saturado em branco/preto)
export function shade(hex: string, amount: number, towards: 'white' | 'black' = 'black'): string {
  const h = hex.replace('#', '');
  let r = parseInt(h.slice(0, 2), 16);
  let g = parseInt(h.slice(2, 4), 16);
  let b = parseInt(h.slice(4, 6), 16);
  const t = towards === 'white' ? 255 : 0;
  r = Math.round(r + (t - r) * amount);
  g = Math.round(g + (t - g) * amount);
  b = Math.round(b + (t - b) * amount);
  return `rgb(${r}, ${g}, ${b})`;
}
