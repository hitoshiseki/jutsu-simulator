export const COLORS = {
  background: '#08080F',
  card: '#0F0F1E',
  cardBorder: '#1A1A3A',
  surface: '#141428',

  text: {
    primary: '#FFFFFF',
    secondary: '#9999BB',
    accent: '#00BFFF',
    muted: '#555577',
  },

  jutsu: {
    rasengan: {
      primary: '#00BFFF',
      secondary: '#1E90FF',
      tertiary: '#87CEEB',
      glow: 'rgba(0, 191, 255, 0.35)',
      background: '#00050F',
    },
    chidori: {
      primary: '#00E5FF',
      secondary: '#FFFFFF',
      tertiary: '#80D8FF',
      glow: 'rgba(0, 229, 255, 0.35)',
      background: '#000A10',
    },
    fuutonRasenshuriken: {
      primary: '#BB44FF',
      secondary: '#FF88FF',
      tertiary: '#8844AA',
      glow: 'rgba(187, 68, 255, 0.35)',
      background: '#080010',
    },
    sharingan: {
      primary: '#FF2222',
      secondary: '#FF6600',
      tertiary: '#CC0000',
      glow: 'rgba(255, 34, 34, 0.35)',
      background: '#0F0000',
    },
    katon: {
      primary: '#FF5500',
      secondary: '#FFCC00',
      tertiary: '#FF2200',
      glow: 'rgba(255, 85, 0, 0.35)',
      background: '#0F0200',
    },
  },
} as const;

export type JutsuColorKey = keyof typeof COLORS.jutsu;
