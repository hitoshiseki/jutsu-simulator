import React from 'react';
import { JutsuTutorial, checkJutsuTutorialSeen, type TutorialSteps } from './JutsuTutorial';
import { COLORS } from '@/theme/colors';

const STORAGE_KEY = 'fuuton_rasenshuriken_tutorial_seen';

const STEPS: TutorialSteps = {
    en: [
        {
            icon: '👋',
            kanji: '集中',
            title: 'TAP TO CHARGE',
            description: 'Tap the screen up to 5 times to gather wind chakra and shape the Fuuton Rasenshuriken.',
        },
        {
            icon: '🌪️',
            kanji: '風遁',
            title: 'FEEL THE WIND',
            description: 'Each tap grows the blade. Watch the wind chakra expand as your power builds.',
        },
        {
            icon: '⚡',
            kanji: '完成',
            title: 'REACH FULL POWER',
            description: 'After the 5th tap the Rasenshuriken is complete. Hold steady — contain the wind.',
        },
        {
            icon: '🤲',
            kanji: '投げ',
            title: 'THRUST TO THROW',
            description: 'Quickly thrust your phone forward (away from you) to hurl the Fuuton Rasenshuriken.',
        },
    ],
    pt: [
        {
            icon: '👋',
            kanji: '集中',
            title: 'TOQUE PARA CARREGAR',
            description: 'Toque na tela até 5 vezes para reunir chakra do vento e formar o Fuuton Rasenshuriken.',
        },
        {
            icon: '🌪️',
            kanji: '風遁',
            title: 'SINTA O VENTO',
            description: 'Cada toque aumenta a lâmina. Veja o chakra do vento crescer conforme seu poder aumenta.',
        },
        {
            icon: '⚡',
            kanji: '完成',
            title: 'PODER COMPLETO',
            description: 'No 5º toque o Rasenshuriken está completo. Mantenha firme — contenha o vento.',
        },
        {
            icon: '🤲',
            kanji: '投げ',
            title: 'ARREMESSE PARA LANÇAR',
            description: 'Empurre o celular rapidamente para frente (para longe de você) para lançar o Fuuton Rasenshuriken.',
        },
    ],
};

type Props = {
    visible: boolean;
    onDismiss: () => void;
};

export const FuutonRasenshurikenTutorial: React.FC<Props> = ({ visible, onDismiss }) => (
    <JutsuTutorial
        steps={STEPS}
        primaryColor={COLORS.jutsu.windShuriken.primary}
        storageKey={STORAGE_KEY}
        visible={visible}
        onDismiss={onDismiss}
    />
);

export const checkFuutonRasenshurikenTutorialSeen = (): Promise<boolean> =>
    checkJutsuTutorialSeen(STORAGE_KEY);
