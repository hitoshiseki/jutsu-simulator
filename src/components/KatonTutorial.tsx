import React from 'react';
import { JutsuTutorial, checkJutsuTutorialSeen, type TutorialSteps } from './JutsuTutorial';
import { COLORS } from '@/theme/colors';

const STORAGE_KEY = 'katon_tutorial_seen';

const STEPS: TutorialSteps = {
    en: [
        {
            icon: '🔥',
            kanji: '構え',
            title: 'HOLD YOUR FINGER',
            description: 'Press and hold anywhere on the screen to channel fire chakra. The jutsu activates at your fingertip.',
        },
        {
            icon: '💨',
            kanji: '息吹',
            title: 'BLOW INTO THE MIC',
            description: 'After a moment, blow into the microphone to release the Great Fireball. Keep blowing to sustain the flames.',
        },
        {
            icon: '🎯',
            kanji: '方向',
            title: 'DRAG TO AIM',
            description: 'Slide your finger while blowing to steer the fire in any direction. Release to extinguish the flames.',
        },
    ],
    pt: [
        {
            icon: '🔥',
            kanji: '構え',
            title: 'PRESSIONE O DEDO',
            description: 'Pressione e segure em qualquer lugar da tela para canalizar o chakra de fogo. O jutsu se ativa na ponta do seu dedo.',
        },
        {
            icon: '💨',
            kanji: '息吹',
            title: 'SOPRE NO MICROFONE',
            description: 'Após um momento, sopre no microfone para soltar a Grande Bola de Fogo. Continue soprando para manter as chamas.',
        },
        {
            icon: '🎯',
            kanji: '方向',
            title: 'ARRASTE PARA MIRAR',
            description: 'Deslize o dedo enquanto sopra para direcionar o fogo para qualquer direção. Solte o dedo para apagar as chamas.',
        },
    ],
};

type Props = {
    visible: boolean;
    onDismiss: () => void;
};

export const KatonTutorial: React.FC<Props> = ({ visible, onDismiss }) => (
    <JutsuTutorial
        steps={STEPS}
        primaryColor={COLORS.jutsu.katon.primary}
        storageKey={STORAGE_KEY}
        visible={visible}
        onDismiss={onDismiss}
    />
);

export const checkKatonTutorialSeen = (): Promise<boolean> =>
    checkJutsuTutorialSeen(STORAGE_KEY);
