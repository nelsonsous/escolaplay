// Raiz da app. Navegacao por tabs (Inicio/Progresso/Perfil) + overlay do
// Exercicio em ecra inteiro. Toda a logica vem de @escolaplay/core.
//
// Suporta packs do core (anos 2/3/5/6 + English PM) com troca via
// PackSelector. Packs com `course` mostram CourseScreen em vez do grid
// de disciplinas.
import React, { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { HomeScreen } from './src/HomeScreen';
import { ProgressScreen } from './src/ProgressScreen';
import { ProfileScreen } from './src/ProfileScreen';
import { ExerciseScreen } from './src/ExerciseScreen';
import { CourseScreen } from './src/CourseScreen';
import { PackSelector } from './src/PackSelector';
import { TabBar, type TabKey } from './src/TabBar';
import { demoProfile, dailyGoal, achievements } from './src/data';
import { getPack, listPacks, emptySubjectProgress } from '@escolaplay/core';
import type { Profile, CurriculumPack } from '@escolaplay/core';
import { usePersistedState } from './src/persistence';

const DEFAULT_PACK_ID = 'pt-PT.grade-2';

/** Alvo do exercício — pode ser uma disciplina inteira OU uma lição. */
interface ExerciseTarget {
  subjectKey: string;
  title?: string;
  /** Se presente, filtra exercícios apenas para estes IDs (modo curso). */
  exerciseIds?: string[];
}

export default function App() {
  const [profile, setProfile] = usePersistedState<Profile>('@escolaplay/profile', demoProfile);
  const [daily, setDaily] = usePersistedState('@escolaplay/daily', dailyGoal);
  const [packId, setPackId] = usePersistedState<string>('@escolaplay/packId', DEFAULT_PACK_ID);
  const [tab, setTab] = useState<TabKey>('home');
  const [target, setTarget] = useState<ExerciseTarget | null>(null);
  const [showPackSelector, setShowPackSelector] = useState(false);

  const pack: CurriculumPack = useMemo(
    () => getPack(packId) ?? listPacks()[0]!,
    [packId],
  );

  // Garantir que o profile tem entradas de progresso para todos os subjects
  // do pack ativo (evita acessos undefined quando troca de pack).
  useEffect(() => {
    setProfile((p) => {
      const next = { ...p, subjects: { ...p.subjects } };
      let changed = false;
      for (const sub of pack.subjects) {
        if (!next.subjects[sub.key]) {
          next.subjects[sub.key] = emptySubjectProgress();
          changed = true;
        }
      }
      if (next.packId !== pack.id) { next.packId = pack.id; changed = true; }
      return changed ? next : p;
    });
  }, [pack, setProfile]);

  if (target) {
    return (
      <ExerciseScreen
        pack={pack}
        subjectKey={target.subjectKey}
        exerciseIds={target.exerciseIds}
        sessionTitle={target.title}
        onExit={(xpGained, answered) => {
          if (xpGained > 0) setProfile((p) => ({ ...p, xp: p.xp + xpGained }));
          if (answered > 0) setDaily((d) => ({ ...d, done: Math.min(d.target, d.done + answered) }));
          setTarget(null);
        }}
      />
    );
  }

  const isCourse = !!pack.course;

  return (
    <View style={{ flex: 1, backgroundColor: '#fdf2f8' }}>
      <View style={{ flex: 1 }}>
        {tab === 'home' && (
          isCourse ? (
            <CourseScreen
              pack={pack}
              profile={profile}
              onStartLesson={(lesson) => setTarget({
                subjectKey: lesson.subjectKey,
                title: lesson.title,
                exerciseIds: lesson.exerciseIds,
              })}
            />
          ) : (
            <HomeScreen
              profile={profile}
              pack={pack}
              daily={daily}
              onOpenSubject={(subjectKey) => setTarget({ subjectKey })}
              onOpenPackSelector={() => setShowPackSelector(true)}
            />
          )
        )}
        {tab === 'progress' && <ProgressScreen profile={profile} pack={pack} />}
        {tab === 'profile' && (
          <ProfileScreen
            profile={profile}
            achievements={achievements}
            packLabel={pack.label}
            onChangePack={() => setShowPackSelector(true)}
          />
        )}
      </View>
      <TabBar active={tab} onChange={setTab} />
      <PackSelector
        visible={showPackSelector}
        currentPackId={packId}
        onChoose={(p) => setPackId(p.id)}
        onClose={() => setShowPackSelector(false)}
      />
    </View>
  );
}
