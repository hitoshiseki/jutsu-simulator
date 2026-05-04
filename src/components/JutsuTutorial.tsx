import React, { useEffect, useRef, useCallback, useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    Pressable,
    Animated,
    Easing,
    Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '@/theme/colors';
import { useLanguageContext } from '@/context/LanguageContext';
import { t } from '@/i18n/translations';

const { width: SCREEN_W } = Dimensions.get('window');

export interface TutorialStep {
    icon: string;
    kanji: string;
    title: string;
    description: string;
}

export type TutorialSteps = Record<'en' | 'pt', TutorialStep[]>;

type Props = {
    steps: TutorialSteps;
    primaryColor: string;
    storageKey: string;
    visible: boolean;
    onDismiss: () => void;
};

const _seenCache: Record<string, boolean> = {};

export const JutsuTutorial: React.FC<Props> = ({ steps, primaryColor, storageKey, visible, onDismiss }) => {
    const [step, setStep] = useState(0);
    const { language } = useLanguageContext();
    const lang: 'en' | 'pt' = language ?? 'en';
    const strings = t(lang).tutorial;

    const backdropOpacity = useRef(new Animated.Value(0)).current;
    const cardScale = useRef(new Animated.Value(0.88)).current;
    const cardOpacity = useRef(new Animated.Value(0)).current;
    const glowPulse = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(glowPulse, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                Animated.timing(glowPulse, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, []);

    useEffect(() => {
        if (!visible) return;
        setStep(0);
        _seenCache[storageKey] = true;
        AsyncStorage.setItem(storageKey, '1').catch(() => { });
        Animated.parallel([
            Animated.timing(backdropOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
            Animated.spring(cardScale, { toValue: 1, damping: 14, stiffness: 120, useNativeDriver: true }),
            Animated.timing(cardOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        ]).start();
    }, [visible]);

    const handleNext = useCallback(() => {
        if (step < steps[lang].length - 1) setStep(s => s + 1);
    }, [step, lang, steps]);

    const handleBack = useCallback(() => {
        if (step > 0) setStep(s => s - 1);
    }, [step]);

    const handleDismiss = useCallback(() => {
        Animated.parallel([
            Animated.timing(backdropOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
            Animated.timing(cardOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
            Animated.spring(cardScale, { toValue: 0.88, damping: 14, stiffness: 120, useNativeDriver: true }),
        ]).start(() => {
            onDismiss();
        });
    }, [backdropOpacity, cardOpacity, cardScale, onDismiss]);

    const isLast = step === steps[lang].length - 1;
    const current = steps[lang][step];

    const glowOpacity = glowPulse.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.65] });
    const glowScale = glowPulse.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.08] });

    if (!visible) return null;

    return (
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]} pointerEvents="auto">
            <Animated.View
                style={[
                    styles.glowBlob,
                    { backgroundColor: primaryColor, opacity: glowOpacity, transform: [{ scale: glowScale }] },
                ]}
            />

            <Animated.View
                style={[
                    styles.card,
                    {
                        borderColor: `${primaryColor}55`,
                        shadowColor: primaryColor,
                        opacity: cardOpacity,
                        transform: [{ scale: cardScale }],
                    },
                ]}
            >
                {/* Header */}
                <View style={styles.cardHeader}>
                    <Text style={[styles.cardHeaderKanji, { color: primaryColor, textShadowColor: primaryColor }]}>
                        {strings.header}
                    </Text>
                    <Text style={styles.cardHeaderLabel}>{strings.howToUse}</Text>
                    <View style={[styles.headerDivider, { backgroundColor: primaryColor }]} />
                </View>

                {/* Step indicators */}
                <View style={styles.dotsRow}>
                    {steps[lang].map((_, i) => (
                        <View
                            key={i}
                            style={[
                                styles.dot,
                                i === step && [styles.dotActive, { backgroundColor: primaryColor, shadowColor: primaryColor }],
                                i < step && { backgroundColor: `${primaryColor}66` },
                            ]}
                        />
                    ))}
                </View>

                {/* Step content */}
                <View style={styles.stepBlock}>
                    <Text style={styles.stepIcon}>{current.icon}</Text>
                    <Text style={[styles.stepKanji, { color: primaryColor, textShadowColor: primaryColor }]}>
                        {current.kanji}
                    </Text>
                    <Text style={styles.stepTitle}>{current.title}</Text>
                    <View style={[styles.titleUnderline, { backgroundColor: primaryColor }]} />
                    <Text style={styles.stepDescription}>{current.description}</Text>
                </View>

                {/* Footer actions */}
                <View style={styles.footer}>
                    {step > 0 ? (
                        <Pressable onPress={handleBack} style={[styles.backButton, { borderColor: `${primaryColor}44` }]}>
                            <Text style={[styles.backText, { color: primaryColor }]}>{strings.back}</Text>
                        </Pressable>
                    ) : (
                        <Pressable onPress={handleDismiss} style={styles.skipButton}>
                            <Text style={styles.skipText}>{strings.skip}</Text>
                        </Pressable>
                    )}
                    {!isLast ? (
                        <Pressable
                            onPress={handleNext}
                            style={[styles.nextButton, { borderColor: primaryColor, backgroundColor: `${primaryColor}14` }]}
                        >
                            <Text style={[styles.nextText, { color: primaryColor }]}>{strings.next}</Text>
                        </Pressable>
                    ) : (
                        <Pressable
                            onPress={handleDismiss}
                            style={[styles.readyButton, { backgroundColor: primaryColor, shadowColor: primaryColor }]}
                        >
                            <Text style={styles.readyText}>{strings.ready}</Text>
                        </Pressable>
                    )}
                </View>
            </Animated.View>
        </Animated.View>
    );
};

export const checkJutsuTutorialSeen = async (storageKey: string): Promise<boolean> => {
    if (_seenCache[storageKey]) return true;
    try {
        const val = await AsyncStorage.getItem(storageKey);
        return val === '1';
    } catch {
        return false;
    }
};

const styles = StyleSheet.create({
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.82)',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
    },
    glowBlob: {
        position: 'absolute',
        width: SCREEN_W * 0.8,
        height: SCREEN_W * 0.8,
        borderRadius: SCREEN_W * 0.4,
        opacity: 0.08,
    },
    card: {
        width: SCREEN_W * 0.88,
        backgroundColor: '#08101A',
        borderRadius: 24,
        borderWidth: 1,
        paddingTop: 28,
        paddingHorizontal: 24,
        paddingBottom: 24,
        shadowOpacity: 0.4,
        shadowRadius: 30,
        shadowOffset: { width: 0, height: 0 },
    },
    cardHeader: {
        alignItems: 'center',
        marginBottom: 20,
    },
    cardHeaderKanji: {
        fontSize: 32,
        fontWeight: '900',
        letterSpacing: 6,
        textShadowRadius: 16,
    },
    cardHeaderLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: COLORS.text.secondary,
        letterSpacing: 4,
        marginTop: 2,
    },
    headerDivider: {
        marginTop: 12,
        width: 48,
        height: 2,
        borderRadius: 1,
        opacity: 0.6,
    },
    dotsRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
        marginBottom: 28,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: COLORS.text.muted,
    },
    dotActive: {
        shadowOpacity: 0.8,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 0 },
        width: 22,
    },
    stepBlock: {
        alignItems: 'center',
        marginBottom: 32,
        minHeight: 180,
    },
    stepIcon: {
        fontSize: 52,
        marginBottom: 10,
    },
    stepKanji: {
        fontSize: 13,
        letterSpacing: 6,
        fontWeight: '700',
        marginBottom: 8,
        textShadowRadius: 8,
    },
    stepTitle: {
        fontSize: 20,
        fontWeight: '900',
        color: COLORS.text.primary,
        letterSpacing: 3,
        textAlign: 'center',
    },
    titleUnderline: {
        width: 36,
        height: 2,
        borderRadius: 1,
        opacity: 0.5,
        marginTop: 8,
        marginBottom: 14,
    },
    stepDescription: {
        fontSize: 14,
        color: COLORS.text.secondary,
        lineHeight: 22,
        textAlign: 'center',
        letterSpacing: 0.3,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
    },
    skipButton: {
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
    },
    skipText: {
        fontSize: 11,
        fontWeight: '700',
        color: COLORS.text.muted,
        letterSpacing: 2,
    },
    backButton: {
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 20,
        borderWidth: 1,
    },
    backText: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 2,
        opacity: 0.7,
    },
    nextButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 24,
        borderWidth: 1.5,
        alignItems: 'center',
    },
    nextText: {
        fontSize: 13,
        fontWeight: '800',
        letterSpacing: 2,
    },
    readyButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 24,
        alignItems: 'center',
        shadowOpacity: 0.6,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 0 },
    },
    readyText: {
        fontSize: 14,
        fontWeight: '900',
        color: '#001A2C',
        letterSpacing: 3,
    },
    langToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10,
        paddingVertical: 5,
        paddingHorizontal: 14,
        borderRadius: 16,
        borderWidth: 1,
    },
    langActive: {
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 2,
    },
    langSep: {
        fontSize: 11,
        color: COLORS.text.muted,
        marginHorizontal: 2,
    },
    langInactive: {
        fontSize: 11,
        fontWeight: '600',
        color: COLORS.text.muted,
        letterSpacing: 2,
    },
});
