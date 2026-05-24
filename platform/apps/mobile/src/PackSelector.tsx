// Modal de selecção de pack (ano/curso). Mostra todos os packs do core.
import React from 'react';
import { View, Text, Modal, Pressable, StyleSheet, ScrollView } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { listPacks } from '@escolaplay/core';
import type { CurriculumPack } from '@escolaplay/core';
import { colors, radius, space, shadow, shadowSoft, tint } from './theme';
import { PressScale } from './ui';

export function PackSelector({
  visible,
  currentPackId,
  onChoose,
  onClose,
}: {
  visible: boolean;
  currentPackId: string;
  onChoose: (pack: CurriculumPack) => void;
  onClose: () => void;
}) {
  const packs = listPacks();
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={s.backdrop} onPress={onClose}>
        <Pressable style={s.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={s.handle} />
          <View style={s.head}>
            <Text style={s.title}>Escolhe o ano</Text>
            <Pressable onPress={onClose} hitSlop={10} style={s.closeBtn}>
              <FontAwesome5 name="times" size={18} color={colors.textLight} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ gap: space.md, paddingBottom: 24 }}>
            {packs.map((pack) => {
              const isActive = pack.id === currentPackId;
              const accent = pack.subjects[0]?.color || colors.primary;
              const isCourse = !!pack.course;
              return (
                <PressScale
                  key={pack.id}
                  onPress={() => { onChoose(pack); onClose(); }}
                  style={{ width: '100%' }}
                  scale={0.98}
                >
                  <View style={[s.row, isActive && [s.rowActive, { borderColor: accent }], shadow]}>
                    <View style={[s.icon, { backgroundColor: accent }, shadowSoft(accent)]}>
                      <FontAwesome5
                        name={isCourse ? 'graduation-cap' : 'book-open'}
                        size={20}
                        color={colors.white}
                        solid
                      />
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={s.rowTitle}>{pack.label}</Text>
                      <Text style={s.rowSub}>
                        {pack.exercises.length} exercícios · {pack.subjects.length} {pack.subjects.length === 1 ? 'disciplina' : 'disciplinas'}
                        {isCourse ? ` · ${pack.course!.lessons.length} lições` : ''}
                      </Text>
                    </View>
                    {isActive && (
                      <View style={[s.activePill, { backgroundColor: tint(accent, 0.15) }]}>
                        <FontAwesome5 name="check" size={11} color={accent} solid />
                        <Text style={[s.activeText, { color: accent }]}>activo</Text>
                      </View>
                    )}
                  </View>
                </PressScale>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(20,12,40,0.50)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: space.lg,
    paddingBottom: 32,
    maxHeight: '85%',
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#d1d5db', alignSelf: 'center', marginBottom: space.md },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.md },
  title: { fontSize: 20, fontWeight: '900', color: colors.text, letterSpacing: -0.3 },
  closeBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: '#f3f4f6' },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    padding: space.md,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: colors.card,
  },
  rowActive: { borderColor: colors.primary },
  icon: { width: 48, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontSize: 16, fontWeight: '900', color: colors.text, letterSpacing: -0.2 },
  rowSub: { fontSize: 12, fontWeight: '700', color: colors.textLight },

  activePill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: radius.pill,
  },
  activeText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.4, textTransform: 'uppercase' },
});
