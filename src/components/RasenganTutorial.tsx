import React from 'react';
import { JutsuTutorial, checkJutsuTutorialSeen, type TutorialSteps } from './JutsuTutorial';
import { COLORS } from '@/theme/colors';

const STORAGE_KEY = 'rasengan_tutorial_seen';

const STEPS: TutorialSteps = {
    en: [
        {
            icon: '👋',
            kanji: '集中',
            title: 'TAP TO CHARGE',
            description: 'Tap the screen up to 5 times to gather chakra and build the Rasengan.',
        },
        {
            icon: '🌀',
            kanji: '回転',
            title: 'FEEL THE SPIN',
            description: 'Each tap grows the Rasengan. Watch the orb expand as your power increases.',
        },
        {
            icon: '⚡',
            kanji: '完成',
            title: 'REACH FULL POWER',
            description: 'After the 5th tap the Rasengan is complete. Hold steady — keep your focus.',
        },
        {
            icon: '🤲',
            kanji: '投げ',
            title: 'THRUST TO RELEASE',
            description: 'Quickly thrust your phone forward (away from you) to launch the Rasengan.',
        },
    ],
    pt: [
        {
            icon: '👋',
            kanji: '集中',
            title: 'TOQUE PARA CARREGAR',
            description: 'Toque na tela até 5 vezes para reunir chakra e formar o Rasengan.',
        },
        {
            icon: '🌀',
            kanji: '回転',
            title: 'SINTA O GIRO',
            description: 'Cada toque aumenta o Rasengan. Veja o orbe crescer conforme seu poder aumenta.',
        },
        {
            icon: '⚡',
            kanji: '完成',
            title: 'PODER COMPLETO',
            description: 'No 5º toque o Rasengan está completo. Mantenha firme — concentre-se.',
        },
        {
            icon: '🤲',
            kanji: '投げ',
            title: 'ARREMESSE PARA LANÇAR',
            description: 'Empurre o celular rapidamente para frente (para longe de você) para lançar o Rasengan.',
        },
    ],
};

type Props = {
    visible: boolean;
    onDismiss: () => void;
};

export const RasenganTutorial: React.FC<Props> = ({ visible, onDismiss }) => (
    <JutsuTutorial
        steps={STEPS}
        primaryColor={COLORS.jutsu.rasengan.primary}
        storageKey={STORAGE_KEY}
        visible={visible}
        onDismiss={onDismiss}
    />
);

export const checkRasenganTutorialSeen = (): Promise<boolean> =>
    checkJutsuTutorialSeen(STORAGE_KEY);

