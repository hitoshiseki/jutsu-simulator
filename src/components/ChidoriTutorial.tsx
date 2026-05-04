import React from 'react';
import { JutsuTutorial, checkJutsuTutorialSeen, type TutorialSteps } from './JutsuTutorial';
import { COLORS } from '@/theme/colors';

const STORAGE_KEY = 'chidori_tutorial_seen';

const STEPS: TutorialSteps = {
    en: [
        {
            icon: '⚡',
            kanji: '集中',
            title: 'SHAKE TO CHARGE',
            description: 'Shake your phone quickly on the horizontal axis to channel lightning chakra into your hand.',
        },
        {
            icon: '🌩️',
            kanji: '千鳥',
            title: 'FEEL THE LIGHTNING',
            description: 'The Chidori sparks and crackles. The electricity surges as your chakra focuses.',
        },
        {
            icon: '💥',
            kanji: '完成',
            title: 'REACH FULL POWER',
            description: 'The Chidori is fully charged. Hold steady — keep the lightning contained in your palm.',
        },
        {
            icon: '👊',
            kanji: '突き',
            title: 'THRUST TO PIERCE',
            description: 'Quickly thrust your phone forward (away from you) to strike with the Chidori.',
        },
    ],
    pt: [
        {
            icon: '⚡',
            kanji: '集中',
            title: 'BALANCE PARA CARREGAR',
            description: 'Balance o celular rapidamente no eixo horizontal para canalizar o chakra do raio em sua mão.',
        },
        {
            icon: '🌩️',
            kanji: '千鳥',
            title: 'SINTA O RAIO',
            description: 'O Chidori faísca e estaleja. A eletricidade surge enquanto seu chakra se concentra.',
        },
        {
            icon: '💥',
            kanji: '完成',
            title: 'PODER COMPLETO',
            description: 'O Chidori está completamente carregado. Mantenha firme — contenha o raio na palma da mão.',
        },
        {
            icon: '👊',
            kanji: '突き',
            title: 'ARREMESSE PARA GOLPEAR',
            description: 'Empurre o celular rapidamente para frente (para longe de você) para atacar com o Chidori.',
        },
    ],
};

type Props = {
    visible: boolean;
    onDismiss: () => void;
};

export const ChidoriTutorial: React.FC<Props> = ({ visible, onDismiss }) => (
    <JutsuTutorial
        steps={STEPS}
        primaryColor={COLORS.jutsu.chidori.primary}
        storageKey={STORAGE_KEY}
        visible={visible}
        onDismiss={onDismiss}
    />
);

export const checkChidoriTutorialSeen = (): Promise<boolean> =>
    checkJutsuTutorialSeen(STORAGE_KEY);
