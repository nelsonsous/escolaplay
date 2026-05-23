// Pequenos componentes de UI reutilizáveis.
import React, { useEffect, useRef } from 'react';
import { Animated, View, Text, StyleSheet, Easing, Pressable, type ViewStyle } from 'react-native';
import { colors, radius, ease } from './theme';

/**
 * Barra de progresso que anima a largura ao montar / quando muda.
 * Pode ter `shine` (brilho que percorre a barra preenchida) para o XP.
 */
export function ProgressBar({
  percent,
  height = 12,
  track = 'rgba(255,255,255,0.28)',
  fill = colors.white,
  radiusOverride,
  shine = false,
  shineColor = 'rgba(255,255,255,0.6)',
}: {
  percent: number;
  height?: number;
  track?: string;
  fill?: string;
  radiusOverride?: number;
  shine?: boolean;
  shineColor?: string;
}) {
  const anim = useRef(new Animated.Value(0)).current;
  const shineAnim = useRef(new Animated.Value(-1)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: Math.max(0, Math.min(100, percent)),
      duration: 750,
      easing: ease.out,
      useNativeDriver: false,
    }).start();
  }, [percent, anim]);

  useEffect(() => {
    if (!shine) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shineAnim, { toValue: 1, duration: 1800, easing: Easing.linear, useNativeDriver: true }),
        Animated.delay(900),
        Animated.timing(shineAnim, { toValue: -1, duration: 0, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [shine, shineAnim]);

  const r = radiusOverride ?? radius.pill;
  const width = anim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] });

  return (
    <View style={{ height, borderRadius: r, backgroundColor: track, overflow: 'hidden' }}>
      <Animated.View style={{ height, borderRadius: r, backgroundColor: fill, width, overflow: 'hidden' }}>
        {shine && (
          <Animated.View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: 0, bottom: 0,
              width: 60,
              backgroundColor: shineColor,
              opacity: 0.55,
              transform: [{ skewX: '-25deg' }, { translateX: shineAnim.interpolate({ inputRange: [-1, 1], outputRange: [-80, 300] }) }],
            }}
          />
        )}
      </Animated.View>
    </View>
  );
}

const sc = StyleSheet.create({
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.30)',
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

/**
 * Pressable que faz scale-down ao premir (uniforme em toda a app).
 * Usa Animated nativo — gestos fluidos a 60fps.
 */
export function PressScale({
  children,
  onPress,
  scale = 0.97,
  style,
  disabled,
  hitSlop,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  scale?: number;
  style?: ViewStyle | ViewStyle[];
  disabled?: boolean;
  hitSlop?: number;
}) {
  const v = useRef(new Animated.Value(1)).current;
  return (
    <Pressable
      hitSlop={hitSlop}
      disabled={disabled}
      onPressIn={() => Animated.spring(v, { toValue: scale, useNativeDriver: true, speed: 40, bounciness: 0 }).start()}
      onPressOut={() => Animated.spring(v, { toValue: 1, useNativeDriver: true, speed: 18, bounciness: 8 }).start()}
      onPress={onPress}
    >
      <Animated.View style={[{ transform: [{ scale: v }] }, style]}>{children}</Animated.View>
    </Pressable>
  );
}

/** Decoração circular blur fake (camada absoluta) — para profundidade em headers. */
export function DecorOrb({
  size,
  top,
  bottom,
  left,
  right,
  color,
  opacity = 0.12,
}: {
  size: number;
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
  color: string;
  opacity?: number;
}) {
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        opacity,
        top, bottom, left, right,
      }}
    />
  );
}
