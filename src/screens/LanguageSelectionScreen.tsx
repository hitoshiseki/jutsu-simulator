import React, { useCallback, useRef } from 'react';
import {
    StyleSheet,
    Text,
    View,
    Pressable,
    Animated,
    StatusBar,
    Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { COLORS } from '@/theme/colors';
import { RootStackParamList } from '@/types';
import { useLanguageContext } from '@/context/LanguageContext';
import { Lang, TRANSLATIONS } from '@/i18n/translations';

type Props = {
    navigation: NativeStackNavigationProp<RootStackParamList, 'LanguageSelection'>;
};

const { width: SCREEN_W } = Dimensions.get('window');

const LANGUAGES: { lang: Lang; flag: string; label: string; nativeLabel: string }[] = [
    { lang: 'en', flag: '🇺🇸', label: 'English', nativeLabel: 'English' },
    { lang: 'pt', flag: '🇧🇷', label: 'Português', nativeLabel: 'Português' },
];

export const LanguageSelectionScreen: React.FC<Props> = ({ navigation }) => {
    const { language, setLanguage } = useLanguageContext();
    const [selected, setSelected] = React.useState<Lang | null>(language);

    const scaleEn = useRef(new Animated.Value(1)).current;
    const scalePt = useRef(new Animated.Value(1)).current;

    const getScaleRef = (lang: Lang) => (lang === 'en' ? scaleEn : scalePt);

    const handlePressIn = useCallback(
        (lang: Lang) => {
            Animated.spring(getScaleRef(lang), { toValue: 0.95, damping: 12, useNativeDriver: true }).start();
        },
        [],
    );

    const handlePressOut = useCallback(
        (lang: Lang) => {
            Animated.spring(getScaleRef(lang), { toValue: 1, damping: 10, useNativeDriver: true }).start();
        },
        [],
    );

    const handleSelect = useCallback((lang: Lang) => {
        setSelected(lang);
    }, []);

    const handleConfirm = useCallback(() => {
        if (!selected) return;
        setLanguage(selected);
        navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
    }, [selected, setLanguage, navigation]);

    const isFirstTime = !language;
    const uiLang = selected ?? language ?? 'en';
    const strings = TRANSLATIONS[uiLang].languageSelection;
    const backText = TRANSLATIONS[uiLang].tutorial.back;

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.kanji}>{strings.kanji}</Text>
                    <Text style={styles.title}>{strings.title}</Text>
                    <Text style={styles.subtitle}>{strings.subtitle}</Text>
                    <View style={styles.divider} />
                </View>

                {/* Language options */}
                <View style={styles.optionsContainer}>
                    {LANGUAGES.map(({ lang, flag, label }) => {
                        const isSelected = selected === lang;
                        const scaleAnim = getScaleRef(lang);
                        return (
                            <Pressable
                                key={lang}
                                onPress={() => handleSelect(lang)}
                                onPressIn={() => handlePressIn(lang)}
                                onPressOut={() => handlePressOut(lang)}
                            >
                                <Animated.View
                                    style={[
                                        styles.langCard,
                                        isSelected && styles.langCardSelected,
                                        { transform: [{ scale: scaleAnim }] },
                                    ]}
                                >
                                    {isSelected && (
                                        <View style={styles.selectedIndicator} />
                                    )}
                                    <Text style={styles.flag}>{flag}</Text>
                                    <Text style={[styles.langLabel, isSelected && styles.langLabelSelected]}>
                                        {label}
                                    </Text>
                                    <Text style={styles.langCode}>{lang.toUpperCase()}</Text>
                                    {isSelected && (
                                        <View style={styles.checkmark}>
                                            <Text style={styles.checkmarkText}>✓</Text>
                                        </View>
                                    )}
                                </Animated.View>
                            </Pressable>
                        );
                    })}
                </View>

                {/* Confirm button */}
                <View style={styles.footer}>
                    <Pressable
                        onPress={handleConfirm}
                        disabled={!selected}
                        style={[styles.confirmButton, !selected && styles.confirmButtonDisabled]}
                    >
                        <Text style={[styles.confirmText, !selected && styles.confirmTextDisabled]}>
                            {strings.confirm}
                        </Text>
                    </Pressable>

                    {!isFirstTime && (
                        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
                            <Text style={styles.backText}>{backText}</Text>
                        </Pressable>
                    )}
                </View>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    container: {
        flex: 1,
        paddingHorizontal: 24,
        justifyContent: 'space-between',
        paddingBottom: 32,
    },
    header: {
        alignItems: 'center',
        paddingTop: 40,
    },
    kanji: {
        fontSize: 52,
        color: COLORS.text.accent,
        fontWeight: '900',
        letterSpacing: 8,
        textShadowColor: COLORS.jutsu.rasengan.glow,
        textShadowRadius: 24,
    },
    title: {
        fontSize: 20,
        color: COLORS.text.primary,
        fontWeight: '800',
        letterSpacing: 5,
        marginTop: 8,
    },
    subtitle: {
        fontSize: 12,
        color: COLORS.text.secondary,
        letterSpacing: 2,
        marginTop: 8,
        textTransform: 'uppercase',
    },
    divider: {
        width: 60,
        height: 2,
        backgroundColor: COLORS.text.accent,
        marginTop: 20,
        borderRadius: 1,
        opacity: 0.6,
    },
    optionsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 16,
        marginTop: 20,
    },
    langCard: {
        width: (SCREEN_W - 48 - 16) / 2,
        aspectRatio: 0.85,
        backgroundColor: COLORS.card,
        borderRadius: 20,
        borderWidth: 1.5,
        borderColor: COLORS.cardBorder,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        overflow: 'hidden',
    },
    langCardSelected: {
        borderColor: COLORS.text.accent,
        backgroundColor: 'rgba(0, 191, 255, 0.06)',
        shadowColor: COLORS.text.accent,
        shadowOpacity: 0.35,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 0 },
    },
    selectedIndicator: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 3,
        backgroundColor: COLORS.text.accent,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
    },
    flag: {
        fontSize: 52,
    },
    langLabel: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.text.secondary,
        letterSpacing: 1,
    },
    langLabelSelected: {
        color: COLORS.text.accent,
    },
    langCode: {
        fontSize: 10,
        fontWeight: '800',
        color: COLORS.text.muted,
        letterSpacing: 3,
    },
    checkmark: {
        position: 'absolute',
        top: 12,
        right: 12,
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: COLORS.text.accent,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkmarkText: {
        color: '#001A2C',
        fontSize: 12,
        fontWeight: '900',
    },
    footer: {
        alignItems: 'center',
        gap: 14,
    },
    confirmButton: {
        width: '100%',
        paddingVertical: 16,
        borderRadius: 28,
        backgroundColor: COLORS.text.accent,
        alignItems: 'center',
        shadowColor: COLORS.text.accent,
        shadowOpacity: 0.5,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 0 },
    },
    confirmButtonDisabled: {
        backgroundColor: COLORS.surface,
        shadowOpacity: 0,
    },
    confirmText: {
        fontSize: 14,
        fontWeight: '900',
        color: '#001A2C',
        letterSpacing: 3,
    },
    confirmTextDisabled: {
        color: COLORS.text.muted,
    },
    backButton: {
        paddingVertical: 10,
        paddingHorizontal: 20,
    },
    backText: {
        fontSize: 11,
        fontWeight: '700',
        color: COLORS.text.muted,
        letterSpacing: 2,
    },
});
