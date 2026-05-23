// Entrada da app nativa (Expo). Casca fina: monta o TamaguiProvider e
// renderiza o HomeScreen partilhado. A MESMA <HomeScreen /> corre na web.
//
// NOTA: este ficheiro precisa do toolchain Expo instalado localmente para
// correr (ver platform/README.md). Nao foi possivel executar/renderizar no
// ambiente remoto — so o core (testado) e o ui (typecheck) foram validados.

import { TamaguiProvider } from '@tamagui/core';
import { SafeAreaView } from 'react-native';
import {
  tamaguiConfig,
  HomeScreen,
} from '@escolaplay/ui';
import { buildPackFromLegacy } from '@escolaplay/core';
import type { Profile } from '@escolaplay/core';

const demoPack = buildPackFromLegacy({
  locale: 'pt-PT',
  grade: 2,
  label: '2.º ano',
  subjects: {
    portugues: { name: 'Português', icon: 'fa-book', color: '#e11d48' },
    matematica: { name: 'Matemática', icon: 'fa-calculator', color: '#2563eb' },
    estudo_meio: { name: 'Estudo do Meio', icon: 'fa-globe', color: '#16a34a' },
    ingles: { name: 'Inglês', icon: 'fa-language', color: '#7c3aed' },
  },
  curriculum: {
    portugues: ['Vogais e consoantes'],
    matematica: ['Adição até 100'],
    estudo_meio: ['Os sentidos'],
    ingles: ['Greetings'],
  },
  exercises: [],
});

const demoProfile: Profile = {
  id: 'demo',
  name: 'Laura',
  avatar: '🦊',
  packId: demoPack.id,
  xp: 1750,
  streakDays: 7,
  subjects: {},
};

export default function App() {
  return (
    <TamaguiProvider config={tamaguiConfig} defaultTheme="light">
      <SafeAreaView style={{ flex: 1 }}>
        <HomeScreen
          profile={demoProfile}
          pack={demoPack}
          onOpenSubject={(key) => console.log('abrir disciplina', key)}
        />
      </SafeAreaView>
    </TamaguiProvider>
  );
}
