import React, { useCallback, useRef } from 'react';
import { StyleSheet, Text, Pressable, Animated } from 'react-native';
import { useSoundContext } from '@/context/SoundContext';
import { useLanguageContext } from '@/context/LanguageContext';
import { t } from '@/i18n/translations';
import { COLORS } from '@/theme/colors';

export const SoundToggle: React.FC = () => {
  const { soundEnabled, toggleSound } = useSoundContext();
  const { language } = useLanguageContext();
  const strings = t(language ?? 'en').sound;
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.spring(scale, { toValue: 0.88, damping: 12, useNativeDriver: true }).start();
  }, []);

  const handlePressOut = useCallback(() => {
    Animated.spring(scale, { toValue: 1, damping: 10, useNativeDriver: true }).start();
  }, []);

  return (
    <Pressable onPress={toggleSound} onPressIn={handlePressIn} onPressOut={handlePressOut}>
      <Animated.View style={[styles.button, soundEnabled ? styles.enabled : styles.disabled, { transform: [{ scale }] }]}>
        <Text style={styles.icon}>{soundEnabled ? '🔊' : '🔇'}</Text>
        <Text style={[styles.label, { color: soundEnabled ? COLORS.text.accent : COLORS.text.muted }]}>
          {soundEnabled ? strings.on : strings.off}
        </Text>
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
  },
  enabled: {
    backgroundColor: 'rgba(0, 191, 255, 0.08)',
    borderColor: 'rgba(0, 191, 255, 0.4)',
  },
  disabled: {
    backgroundColor: 'rgba(100, 100, 120, 0.08)',
    borderColor: 'rgba(100, 100, 120, 0.3)',
  },
  icon: { fontSize: 14 },
  label: { fontSize: 10, fontWeight: '600', letterSpacing: 1 },
});
