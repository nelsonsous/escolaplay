// Preview da Home em React Native puro (sem Tamagui).
// Usa @escolaplay/core diretamente — o motor de XP/niveis e os packs
// de curriculo funcionam identicamente em nativo e em web.
import React from 'react';
import {
  View, Text, ScrollView, StyleSheet, StatusBar, Pressable,
} from 'react-native';
import { levelInfo, levelProgressPercent, buildPackFromLegacy } from '@escolaplay/core';
import type { Profile, CurriculumPack, Subject } from '@escolaplay/core';

// ─── Dados de demonstração ────────────────────────────────────────────────────

const demoPack: CurriculumPack = buildPackFromLegacy({
  locale: 'pt-PT', grade: 2, label: '2.º ano',
  subjects: {
    portugues:   { name: 'Português',      icon: '📖', color: '#e11d48' },
    matematica:  { name: 'Matemática',     icon: '🔢', color: '#2563eb' },
    estudo_meio: { name: 'Estudo do Meio', icon: '🌍', color: '#16a34a' },
    ingles:      { name: 'Inglês',         icon: '🗣️', color: '#7c3aed' },
  },
  curriculum: {
    portugues:   ['Vogais e consoantes', 'Sílabas'],
    matematica:  ['Adição até 100'],
    estudo_meio: ['Os sentidos'],
    ingles:      ['Greetings'],
  },
  exercises: [],
});

const demoProfile: Profile = {
  id: 'demo', name: 'Laura', avatar: '🦊',
  packId: demoPack.id, xp: 1750, streakDays: 7, subjects: {},
};

// ─── Componentes ──────────────────────────────────────────────────────────────

function Header({ profile }: { profile: Profile }) {
  const lvl = levelInfo(profile.xp);
  const pct = levelProgressPercent(profile.xp);
  return (
    <View style={s.header}>
      <StatusBar barStyle="light-content" backgroundColor="#db2777" />
      <View style={s.headerRow}>
        <View style={s.avatar}>
          <Text style={s.avatarEmoji}>{profile.avatar}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.name}>{profile.name}</Text>
          <Text style={s.levelLabel}>{lvl.name} · 🔥 {profile.streakDays} dias</Text>
        </View>
        <Text style={s.xpBadge}>{profile.xp} XP</Text>
      </View>

      <View style={s.barBg}>
        <View style={[s.barFill, { width: `${pct}%` as any }]} />
      </View>
      <Text style={s.barLabel}>
        {lvl.into}/{lvl.span} XP para {lvl.next ?? 'nível máximo'}
      </Text>
    </View>
  );
}

function SubjectCard({ subject, onPress }: { subject: Subject; onPress: () => void }) {
  return (
    <Pressable
      style={({ pressed }) => [s.card, { borderLeftColor: subject.color, opacity: pressed ? 0.85 : 1 }]}
      onPress={onPress}
    >
      <View style={[s.cardIcon, { backgroundColor: subject.color }]}>
        <Text style={{ fontSize: 20 }}>{subject.icon}</Text>
      </View>
      <Text style={s.cardName}>{subject.name}</Text>
    </Pressable>
  );
}

// ─── Ecrã principal ───────────────────────────────────────────────────────────

export default function App() {
  const subjects = demoPack.subjects;
  const pairs: Subject[][] = [];
  for (let i = 0; i < subjects.length; i += 2) {
    pairs.push(subjects.slice(i, i + 2));
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#fdf2f8' }}>
      <Header profile={demoProfile} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <Text style={s.sectionTitle}>{demoPack.label} · Disciplinas</Text>
        {pairs.map((row, i) => (
          <View key={i} style={s.row}>
            {row.map(s_ => (
              <SubjectCard
                key={s_.key}
                subject={s_}
                onPress={() => console.log('abrir', s_.key)}
              />
            ))}
            {row.length === 1 && <View style={{ flex: 1 }} />}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  header:      { backgroundColor: '#f472b6', paddingHorizontal: 16, paddingTop: 52, paddingBottom: 20 },
  headerRow:   { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  avatar:      { width: 58, height: 58, borderRadius: 29, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.45)' },
  avatarEmoji: { fontSize: 28 },
  name:        { color: '#fff', fontSize: 18, fontWeight: '800' },
  levelLabel:  { color: 'rgba(255,255,255,0.9)', fontSize: 13, marginTop: 2 },
  xpBadge:     { color: '#fff', fontWeight: '900', fontSize: 14 },
  barBg:       { height: 10, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.25)', overflow: 'hidden' },
  barFill:     { height: 10, borderRadius: 5, backgroundColor: '#fff' },
  barLabel:    { color: 'rgba(255,255,255,0.85)', fontSize: 11, marginTop: 4 },
  sectionTitle:{ fontSize: 16, fontWeight: '800', color: '#db2777', marginBottom: 4 },
  row:         { flexDirection: 'row', gap: 12 },
  card:        { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 14, gap: 8, borderLeftWidth: 4, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  cardIcon:    { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cardName:    { fontSize: 13, fontWeight: '700', color: '#1f2937' },
});
