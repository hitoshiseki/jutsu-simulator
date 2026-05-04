import { useCallback } from 'react';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

export const useHaptics = () => {
  const impactLight = useCallback(async () => {
    if (Platform.OS === 'web') return;
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
  }, []);

  const impactMedium = useCallback(async () => {
    if (Platform.OS === 'web') return;
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
  }, []);

  const impactHeavy = useCallback(async () => {
    if (Platform.OS === 'web') return;
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch {}
  }, []);

  const notificationSuccess = useCallback(async () => {
    if (Platform.OS === 'web') return;
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
  }, []);

  const chidoriPulse = useCallback(async () => {
    if (Platform.OS === 'web') return;
    try {
      for (let i = 0; i < 5; i++) {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        await new Promise((r) => setTimeout(r, 80));
      }
    } catch {}
  }, []);

  return { impactLight, impactMedium, impactHeavy, notificationSuccess, chidoriPulse };
};
