import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { colors, radius } from './theme';

export type TabKey = 'home' | 'progress' | 'profile';

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'home', label: 'Início', icon: 'home' },
  { key: 'progress', label: 'Progresso', icon: 'chart-line' },
  { key: 'profile', label: 'Perfil', icon: 'user' },
];

export function TabBar({ active, onChange }: { active: TabKey; onChange: (k: TabKey) => void }) {
  return (
    <View style={s.bar}>
      {TABS.map((t) => {
        const on = active === t.key;
        return (
          <Pressable key={t.key} style={s.tab} onPress={() => onChange(t.key)} hitSlop={8}>
            <FontAwesome5 name={t.icon as any} size={20} color={on ? colors.primary : colors.textMuted} solid={on} />
            <Text style={[s.label, { color: on ? colors.primary : colors.textMuted }]}>{t.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export const TAB_BAR_HEIGHT = 84;

const s = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    paddingTop: 10,
    paddingBottom: 26,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    shadowColor: '#9d174d',
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
    elevation: 12,
  },
  tab: { flex: 1, alignItems: 'center', gap: 4 },
  label: { fontSize: 11, fontWeight: '800' },
});
