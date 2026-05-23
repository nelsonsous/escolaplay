// Ecra Home partilhado. O MESMO componente corre em web (react-native-web
// via Next) e em nativo (Expo). Consome o motor do @escolaplay/core, por
// isso XP, niveis e progresso sao identicos em todas as plataformas.

import { levelInfo, levelProgressPercent } from '@escolaplay/core';
import type { CurriculumPack, Profile, Subject } from '@escolaplay/core';
import { tokens } from './config.js';
import { YStack, XStack, Card, Heading, Body, View, Text } from './primitives.js';

export interface HomeScreenProps {
  profile: Profile;
  pack: CurriculumPack;
  /** Disparado ao tocar numa disciplina. */
  onOpenSubject?: (subjectKey: string) => void;
}

function Avatar({ emoji }: { emoji: string }) {
  return (
    <View
      width={60}
      height={60}
      borderRadius={30}
      backgroundColor="rgba(255,255,255,0.22)"
      borderWidth={2}
      borderColor="rgba(255,255,255,0.45)"
      alignItems="center"
      justifyContent="center"
    >
      <Text fontSize={28}>{emoji}</Text>
    </View>
  );
}

function Header({ profile }: { profile: Profile }) {
  const lvl = levelInfo(profile.xp);
  const pct = levelProgressPercent(profile.xp);
  return (
    <YStack
      px="$4"
      py="$4"
      backgroundColor="$primary"
      borderBottomLeftRadius="$6"
      borderBottomRightRadius="$6"
    >
      <XStack ai="center" gap="$3">
        <Avatar emoji={profile.avatar} />
        <YStack f={1}>
          <Heading color="$white" fontSize="$5">
            {profile.name}
          </Heading>
          <Body color="$white" fontSize="$2" opacity={0.9}>
            {lvl.name} · 🔥 {profile.streakDays}
          </Body>
        </YStack>
        <Body color="$white" fontWeight="900" fontSize="$3">
          {profile.xp} XP
        </Body>
      </XStack>

      {/* Barra de XP */}
      <YStack mt="$3" gap="$1">
        <View
          height={10}
          br="$5"
          bg="rgba(255,255,255,0.25)"
          overflow="hidden"
        >
          <View height={10} br="$5" bg="$white" width={`${pct}%`} />
        </View>
        <Body color="$white" fontSize="$1" opacity={0.85}>
          {lvl.into}/{lvl.span} para {lvl.next ?? 'nível máximo'}
        </Body>
      </YStack>
    </YStack>
  );
}

function SubjectCard({
  subject,
  onPress,
}: {
  subject: Subject;
  onPress?: () => void;
}) {
  return (
    <Card
      f={1}
      gap="$2"
      pressStyle={{ scale: 0.97 }}
      borderLeftWidth={4}
      borderLeftColor={subject.color}
      onPress={onPress}
    >
      <View
        width={40}
        height={40}
        br="$3"
        ai="center"
        jc="center"
        bg={subject.color}
      >
        <Text fontSize={18} color="$white">
          {subject.name.charAt(0)}
        </Text>
      </View>
      <Heading fontSize="$3">{subject.name}</Heading>
    </Card>
  );
}

export function HomeScreen({ profile, pack, onOpenSubject }: HomeScreenProps) {
  return (
    <YStack f={1} bg="$bgTop">
      <Header profile={profile} />

      <YStack p="$4" gap="$3">
        <Heading fontSize="$4" color="$primaryDark">
          {pack.label} · Disciplinas
        </Heading>

        {/* Grelha de disciplinas, 2 por linha */}
        <YStack gap="$3">
          {chunk(pack.subjects, 2).map((row, i) => (
            <XStack key={i} gap="$3">
              {row.map((s) => (
                <SubjectCard
                  key={s.key}
                  subject={s}
                  onPress={() => onOpenSubject?.(s.key)}
                />
              ))}
              {row.length === 1 ? <View f={1} /> : null}
            </XStack>
          ))}
        </YStack>
      </YStack>
    </YStack>
  );
}

function chunk<T>(arr: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

// Mantem o token de cor "primary" referenciado para o tree-shaking nao o
// remover em builds que so usam o tema.
export const _brandPrimary = tokens.color.primary;
