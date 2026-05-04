import { Jutsu } from '@/types';

export const JUTSUS: Jutsu[] = [
  {
    id: 'rasengan',
    name: 'Rasengan',
    kanji: '螺旋丸',
    user: 'Naruto Uzumaki',
    rank: 'A-Rank',
    description: 'A spinning ball of chakra formed in the palm. Destroys anything it touches.',
    emoji: '🌀',
  },
  {
    id: 'chidori',
    name: 'Chidori',
    kanji: '千鳥',
    user: 'Sasuke Uchiha',
    rank: 'A-Rank',
    description: 'Lightning chakra concentrated in the hand. Pierces through any defense.',
    emoji: '⚡',
  },
  {
    id: 'fuutonRasenshuriken',
    name: 'Fuuton Rasenshuriken',
    kanji: '風遁螺旋手裏剣',
    user: 'Naruto Uzumaki',
    rank: 'S-Rank',
    description: 'Wind Release: Rasenshuriken. A wind-enhanced Rasengan that slices the chakra network.',
    emoji: '✴️',
  },
  {
    id: 'sharingan',
    name: 'Sharingan',
    kanji: '写輪眼',
    user: 'Sasuke Uchiha',
    rank: 'Kekkei Genkai',
    description: 'The eye of the Uchiha. Copies any jutsu and casts powerful genjutsu.',
    emoji: '👁️',
  },
  {
    id: 'katon',
    name: 'Gōkakyū no Jutsu',
    kanji: '豪火球の術',
    user: 'Sasuke Uchiha',
    rank: 'C-Rank',
    description: 'A massive ball of fire expelled from the mouth. Symbol of the Uchiha clan.',
    emoji: '🔥',
  },
];

export const getJutsu = (id: string): Jutsu | undefined =>
  JUTSUS.find((j) => j.id === id);
