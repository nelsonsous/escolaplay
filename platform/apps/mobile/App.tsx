// Raiz da app. Navegacao simples por estado entre a Home e o Exercicio.
// Toda a logica (validar resposta, XP, nivel) vem de @escolaplay/core.
import React, { useState } from 'react';
import { HomeScreen } from './src/HomeScreen';
import { ExerciseScreen } from './src/ExerciseScreen';
import { demoPack, demoProfile } from './src/data';
import type { Profile } from '@escolaplay/core';

type Screen = { name: 'home' } | { name: 'exercise'; subjectKey: string };

export default function App() {
  const [profile, setProfile] = useState<Profile>(demoProfile);
  const [screen, setScreen] = useState<Screen>({ name: 'home' });

  if (screen.name === 'exercise') {
    return (
      <ExerciseScreen
        pack={demoPack}
        subjectKey={screen.subjectKey}
        onExit={(xpGained) => {
          if (xpGained > 0) setProfile((p) => ({ ...p, xp: p.xp + xpGained }));
          setScreen({ name: 'home' });
        }}
      />
    );
  }

  return (
    <HomeScreen
      profile={profile}
      pack={demoPack}
      onOpenSubject={(subjectKey) => setScreen({ name: 'exercise', subjectKey })}
    />
  );
}
