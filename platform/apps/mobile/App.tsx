// Raiz da app. Navegacao por tabs (Inicio/Progresso/Perfil) + overlay do
// Exercicio em ecra inteiro. Toda a logica vem de @escolaplay/core.
import React, { useState } from 'react';
import { View } from 'react-native';
import { HomeScreen } from './src/HomeScreen';
import { ProgressScreen } from './src/ProgressScreen';
import { ProfileScreen } from './src/ProfileScreen';
import { ExerciseScreen } from './src/ExerciseScreen';
import { TabBar, type TabKey } from './src/TabBar';
import { demoPack, demoProfile, dailyGoal, achievements } from './src/data';
import type { Profile } from '@escolaplay/core';

export default function App() {
  const [profile, setProfile] = useState<Profile>(demoProfile);
  const [daily, setDaily] = useState(dailyGoal);
  const [tab, setTab] = useState<TabKey>('home');
  const [exerciseSubject, setExerciseSubject] = useState<string | null>(null);

  if (exerciseSubject) {
    return (
      <ExerciseScreen
        pack={demoPack}
        subjectKey={exerciseSubject}
        onExit={(xpGained, answered) => {
          if (xpGained > 0) setProfile((p) => ({ ...p, xp: p.xp + xpGained }));
          if (answered > 0) setDaily((d) => ({ ...d, done: Math.min(d.target, d.done + answered) }));
          setExerciseSubject(null);
        }}
      />
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#fdf2f8' }}>
      <View style={{ flex: 1 }}>
        {tab === 'home' && (
          <HomeScreen profile={profile} pack={demoPack} daily={daily} onOpenSubject={setExerciseSubject} />
        )}
        {tab === 'progress' && <ProgressScreen profile={profile} pack={demoPack} />}
        {tab === 'profile' && <ProfileScreen profile={profile} achievements={achievements} />}
      </View>
      <TabBar active={tab} onChange={setTab} />
    </View>
  );
}
