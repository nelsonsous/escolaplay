// Raiz da app. Navegacao simples por estado entre a Home e o Exercicio.
// Toda a logica (validar resposta, XP, nivel) vem de @escolaplay/core.
import React, { useState } from 'react';
import { HomeScreen } from './src/HomeScreen';
import { ExerciseScreen } from './src/ExerciseScreen';
import { demoPack, demoProfile, dailyGoal } from './src/data';
import type { Profile } from '@escolaplay/core';

type Screen = { name: 'home' } | { name: 'exercise'; subjectKey: string };

export default function App() {
  const [profile, setProfile] = useState<Profile>(demoProfile);
  const [daily, setDaily] = useState(dailyGoal);
  const [screen, setScreen] = useState<Screen>({ name: 'home' });

  if (screen.name === 'exercise') {
    return (
      <ExerciseScreen
        pack={demoPack}
        subjectKey={screen.subjectKey}
        onExit={(xpGained, answered) => {
          if (xpGained > 0) setProfile((p) => ({ ...p, xp: p.xp + xpGained }));
          if (answered > 0) setDaily((d) => ({ ...d, done: Math.min(d.target, d.done + answered) }));
          setScreen({ name: 'home' });
        }}
      />
    );
  }

  return (
    <HomeScreen
      profile={profile}
      pack={demoPack}
      daily={daily}
      onOpenSubject={(subjectKey) => setScreen({ name: 'exercise', subjectKey })}
    />
  );
}
