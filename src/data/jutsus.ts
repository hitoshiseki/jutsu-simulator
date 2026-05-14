import { Jutsu } from '@/types';

export const JUTSUS: Jutsu[] = [
  {
    id: 'spiralOrb',
    rank: 'A-Rank',
    emoji: '🌀',
  },
  {
    id: 'lightningPalm',
    rank: 'A-Rank',
    emoji: '⚡',
  },
  {
    id: 'windShuriken',
    rank: 'S-Rank',
    emoji: '✴️',
    defaultLocked: true,
  },
  {
    id: 'crimsonEye',
    rank: 'Bloodline',
    emoji: '👁️',
  },
  {
    id: 'fireBreath',
    rank: 'C-Rank',
    emoji: '🔥',
    defaultLocked: true,
  },
];

export const getJutsu = (id: string): Jutsu | undefined =>
  JUTSUS.find((j) => j.id === id);
