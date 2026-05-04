export type JutsuId = 'rasengan' | 'chidori' | 'fuutonRasenshuriken' | 'sharingan' | 'katon';

export interface Jutsu {
  id: JutsuId;
  name: string;
  kanji: string;
  user: string;
  rank: string;
  description: string;
  emoji: string;
}

export type RootStackParamList = {
  LanguageSelection: undefined;
  Home: undefined;
  JutsuSimulation: { jutsuId: JutsuId };
};
