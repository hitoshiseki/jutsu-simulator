export type JutsuId = 'spiralOrb' | 'lightningPalm' | 'windShuriken' | 'crimsonEye' | 'fireBreath';

export interface Jutsu {
  id: JutsuId;
  rank: string;
  emoji: string;
  defaultLocked?: boolean;
}

export type RootStackParamList = {
  LanguageSelection: undefined;
  Home: undefined;
  JutsuSimulation: { jutsuId: JutsuId };
};
