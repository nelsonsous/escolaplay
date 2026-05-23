import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Animated } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { colors, radius, ease } from './theme';

export type TabKey = 'home' | 'progress' | 'profile';

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'home', label: 'Início', icon: 'home' },
  { key: 'progress', label: 'Progresso', icon: 'chart-line' },
  { key: 'profile', label: 'Perfil', icon: 'user' },
];

function Tab({ tab, active, onPress }: { tab: typeof TABS[number]; active: boolean; onPress: () => void }) {
  const v = useRef(new Animated.Value(active ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(v, { toValue: active ? 1 : 0, useNativeDriver: true, speed: 18, bounciness: 10 }).start();
  }, [active, v]);

  const iconLift = v.interpolate({ inputRange: [0, 1], outputRange: [0, -3] });
  const iconScale = v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.10] });
  const indicatorScale = v.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

  return (
    <Pressable style={s.tab} onPress={onPress} hitSlop={8}>
      {/* Indicador no topo */}
      <Animated.View style={[s.indicator, { transform: [{ scaleX: indicatorScale }] }]} />
      <Animated.View style={{ transform: [{ translateY: iconLift }, { scale: iconScale }] }}>
        <FontAwesome5
          name={tab.icon as any}
          size={20}
          color={active ? colors.primary : colors.textMuted}
          solid={active}
        />
      </Animated.View>
      <Text style={[s.label, { color: active ? colors.primary : colors.textMuted }]}>{tab.label}</Text>
    </Pressable>
  );
}

export function TabBar({ active, onChange }: { active: TabKey; onChange: (k: TabKey) => void }) {
  return (
    <View style={s.barWrap}>
      <View style={s.bar}>
        {TABS.map((t) => (
          <Tab key={t.key} tab={t} active={active === t.key} onPress={() => onChange(t.key)} />
        ))}
      </View>
    </View>
  );
}

export const TAB_BAR_HEIGHT = 88;

const s = StyleSheet.create({
  barWrap: {
    backgroundColor: 'rgba(253,242,248,0.96)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(252,231,243,0.9)',
    shadowColor: colors.primaryDeep,
    shadowOpacity: 0.10,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -6 },
    elevation: 12,
  },
  bar: {
    flexDirection: 'row',
    paddingTop: 12,
    paddingBottom: 28,
  },
  tab: { flex: 1, alignItems: 'center', gap: 5, position: 'relative' },
  indicator: {
    position: 'absolute',
    top: -1,
    width: 30,
    height: 3,
    backgroundColor: colors.primary,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
    shadowColor: colors.primary,
    shadowOpacity: 0.55,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  label: { fontSize: 11, fontWeight: '800' },
});
