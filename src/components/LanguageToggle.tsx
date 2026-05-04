import React, { useCallback, useRef } from 'react';
import { StyleSheet, Text, Pressable, Animated } from 'react-native';
import { useLanguageContext } from '@/context/LanguageContext';
import { COLORS } from '@/theme/colors';

type Props = {
    onPress: () => void;
};

export const LanguageToggle: React.FC<Props> = ({ onPress }) => {
    const { language } = useLanguageContext();
    const scale = useRef(new Animated.Value(1)).current;

    const handlePressIn = useCallback(() => {
        Animated.spring(scale, { toValue: 0.88, damping: 12, useNativeDriver: true }).start();
    }, []);

    const handlePressOut = useCallback(() => {
        Animated.spring(scale, { toValue: 1, damping: 10, useNativeDriver: true }).start();
    }, []);

    const flag = language === 'pt' ? '🇧🇷' : '🇺🇸';
    const label = language === 'pt' ? 'PT' : 'EN';

    return (
        <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
            <Animated.View style={[styles.button, { transform: [{ scale }] }]}>
                <Text style={styles.icon}>{flag}</Text>
                <Text style={styles.label}>{label}</Text>
            </Animated.View>
        </Pressable>
    );
};

const styles = StyleSheet.create({
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        backgroundColor: 'rgba(0, 191, 255, 0.08)',
        borderColor: 'rgba(0, 191, 255, 0.4)',
    },
    icon: { fontSize: 14 },
    label: {
        fontSize: 10,
        fontWeight: '600',
        letterSpacing: 1,
        color: COLORS.text.accent,
    },
});
