// Pequenos componentes de UI reutilizaveis.
import React, { useEffect, useRef } from 'react';
import { Animated, View, Text, StyleSheet, Easing } from 'react-native';
import { colors, radius } from './theme';

/** Barra de progresso que anima a largura ao montar / quando muda. */
export function ProgressBar({
  percent,
  height = 12,
  track = 'rgba(255,255,255,0.28)',
  fill = colors.white,
  radiusOverride,
}: {
  percent: number;
  height?: number;
  track?: string;
  fill?: string;
  radiusOverride?: number;
}) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: Math.max(0, Math.min(100, percent)),
      duration: 650,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [percent, anim]);
  const r = radiusOverride ?? radius.pill;
  const width = anim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] });
  return (
    <View style={{ height, borderRadius: r, backgroundColor: track, overflow: 'hidden' }}>
      <Animated.View style={{ height, borderRadius: r, backgroundColor: fill, width }} />
    </View>
  );
}

/** Cartao com tudo dentro elevado (sombra suave). */
const sc = StyleSheet.create({
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  statText: { color: colors.white, fontWeight: '900', fontSize: 13 },
});

export function StatPill({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <View style={sc.statPill}>
      {icon}
      <Text style={sc.statText}>{children}</Text>
    </View>
  );
}
