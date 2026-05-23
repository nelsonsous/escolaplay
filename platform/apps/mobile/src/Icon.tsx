import React from 'react';
import { FontAwesome5 } from '@expo/vector-icons';

// Mapeia os nomes de icone dos dados (estilo FontAwesome "fa-book") para o
// nome FontAwesome5. Tambem aceita ja o nome curto.
const ALIASES: Record<string, string> = {
  book: 'book',
  calculator: 'calculator',
  globe: 'globe-americas',
  language: 'language',
  leaf: 'leaf',
  landmark: 'landmark',
  flask: 'flask',
  'pen-fancy': 'pen-fancy',
};

export function subjectIconName(raw: string): string {
  const key = raw.replace(/^fa-/, '');
  return ALIASES[key] ?? key;
}

export function SubjectIcon({ name, size = 22, color = '#fff' }: { name: string; size?: number; color?: string }) {
  return <FontAwesome5 name={subjectIconName(name) as any} size={size} color={color} />;
}

export { FontAwesome5 };
