import React, { useEffect, useRef, useState, useCallback, useImperativeHandle } from 'react';
import { StyleSheet, Animated, Easing, Pressable, Text, Dimensions, Platform, Vibration } from 'react-native';
import { Accelerometer } from 'expo-sensors';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { useSoundContext } from '@/context/SoundContext';
import { Images } from '@/assets/images';
import { Sounds } from '@/assets/sounds';
import { t } from '@/i18n/translations';

const { width: SCREEN_W } = Dimensions.get('window');

const RASENGAN_IMG = Images.rasengan;

const RESET_AFTER_MS = 3000;

const STAGES = [
  { scale: 0.2, opacity: 0.5 },
  { scale: 0.4, opacity: 0.7 },
  { scale: 0.6, opacity: 0.8 },
  { scale: 0.8, opacity: 0.9 },
  { scale: 1.0, opacity: 1.0 },
];

export interface RasenganAnimationRef {
  cleanup: () => void;
}

type Props = {
  onPowerStart?: () => void;
  onPowerReset?: () => void;
  lang?: 'en' | 'pt';
};

export const RasenganAnimation = React.forwardRef<RasenganAnimationRef, Props>(
  function RasenganAnimation ({ onPowerStart, onPowerReset, lang = 'en' }, ref) {
    const [tapCount, setTapCount] = useState(0);
    const { soundEnabled } = useSoundContext();
    const soundEnabledRef = useRef(soundEnabled);

    const rotation = useRef(new Animated.Value(0)).current;
    const animScale = useRef(new Animated.Value(0)).current;
    const animOpacity = useRef(new Animated.Value(0)).current;
    const hintOpacity = useRef(new Animated.Value(1)).current;
    const handTranslateY = useRef(new Animated.Value(0)).current;
    const handScale = useRef(new Animated.Value(1)).current;
    const rippleScale = useRef(new Animated.Value(0.6)).current;
    const rippleOpacity = useRef(new Animated.Value(0)).current;

    // Tap-hand bounce + ripple loop
    useEffect(() => {
      const tapLoop = Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.spring(handTranslateY, { toValue: 8, damping: 6, stiffness: 160, useNativeDriver: true }),
            Animated.spring(handScale, { toValue: 0.88, damping: 6, stiffness: 160, useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.spring(handTranslateY, { toValue: 0, damping: 7, stiffness: 120, useNativeDriver: true }),
            Animated.spring(handScale, { toValue: 1, damping: 7, stiffness: 120, useNativeDriver: true }),
          ]),
          Animated.delay(600),
        ])
      );
      const rippleLoop = Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(rippleScale, { toValue: 1.8, duration: 700, easing: Easing.out(Easing.quad), useNativeDriver: true }),
            Animated.timing(rippleOpacity, { toValue: 0.35, duration: 150, useNativeDriver: true }),
          ]),
          Animated.timing(rippleOpacity, { toValue: 0, duration: 550, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.delay(500),
          Animated.parallel([
            Animated.timing(rippleScale, { toValue: 0.6, duration: 0, useNativeDriver: true }),
          ]),
        ])
      );
      tapLoop.start();
      rippleLoop.start();
      return () => { tapLoop.stop(); rippleLoop.stop(); };
    }, []);

    const rotationAnim = useRef<Animated.CompositeAnimation | null>(null);
    const lastZ = useRef<number | null>(null);
    const thrownRef = useRef(false);
    const tapCountRef = useRef(0);

    const startVibrationLoop = useCallback(() => {
      if (Platform.OS === 'web') return;
      Vibration.vibrate([0, 200, 0], true);
    }, []);

    const stopVibrationLoop = useCallback(() => {
      Vibration.cancel();
    }, []);

    const chargeSoundRef = useRef<AudioPlayer | null>(null);
    const spinSound1Ref = useRef<AudioPlayer | null>(null);
    const spinSound2Ref = useRef<AudioPlayer | null>(null);
    const spinLoopActiveRef = useRef(false);
    const spinLoopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const readySoundRef = useRef<AudioPlayer | null>(null);
    const throw1SoundRef = useRef<AudioPlayer | null>(null);
    const throw2SoundRef = useRef<AudioPlayer | null>(null);

    // Keep soundEnabled ref in sync
    useEffect(() => {
      soundEnabledRef.current = soundEnabled;
    }, [soundEnabled]);

    // Load all sounds on mount
    useEffect(() => {
      let mounted = true;
      const loadSounds = async () => {
        await setAudioModeAsync({ playsInSilentMode: true });
        if (!mounted) return;
        chargeSoundRef.current = createAudioPlayer(Sounds.rasengan.charge);
        spinSound1Ref.current = createAudioPlayer(Sounds.rasengan.spin);
        spinSound2Ref.current = createAudioPlayer(Sounds.rasengan.spin);
        readySoundRef.current = createAudioPlayer(Sounds.rasengan.ready);
        throw1SoundRef.current = createAudioPlayer(Sounds.rasengan.throw1);
        throw2SoundRef.current = createAudioPlayer(Sounds.rasengan.throw2);
      };
      loadSounds();
      return () => {
        mounted = false;
        chargeSoundRef.current?.remove();
        spinSound1Ref.current?.remove();
        spinSound2Ref.current?.remove();
        readySoundRef.current?.remove();
        throw1SoundRef.current?.remove();
        throw2SoundRef.current?.remove();
        stopVibrationLoop();
      };
    }, []);

    const playSound = useCallback(async (sound: AudioPlayer | null) => {
      if (!soundEnabledRef.current || !sound) return;
      try { await sound.seekTo(0); sound.play(); } catch { }
    }, []);

    const stopSound = useCallback(async (sound: AudioPlayer | null) => {
      if (!sound) return;
      try { sound.pause(); } catch { }
    }, []);

    const SPIN_OVERLAP_MS = 600;

    const cleanup = useCallback(() => {
      stopVibrationLoop();
      spinLoopActiveRef.current = false;
      if (spinLoopTimeoutRef.current !== null) {
        clearTimeout(spinLoopTimeoutRef.current);
        spinLoopTimeoutRef.current = null;
      }
      try { spinSound1Ref.current?.pause(); } catch { }
      try { spinSound2Ref.current?.pause(); } catch { }
      try { chargeSoundRef.current?.pause(); } catch { }
      try { readySoundRef.current?.pause(); } catch { }
      try { throw1SoundRef.current?.pause(); } catch { }
      try { throw2SoundRef.current?.pause(); } catch { }
    }, [stopVibrationLoop]);

    useImperativeHandle(ref, () => ({ cleanup }), [cleanup]);

    const stopSpinLoop = useCallback(async () => {
      spinLoopActiveRef.current = false;
      if (spinLoopTimeoutRef.current !== null) {
        clearTimeout(spinLoopTimeoutRef.current);
        spinLoopTimeoutRef.current = null;
      }
      try { spinSound1Ref.current?.pause(); } catch { }
      try { spinSound2Ref.current?.pause(); } catch { }
    }, []);

    const startSpinLoop = useCallback(async () => {
      if (!soundEnabledRef.current) return;
      spinLoopActiveRef.current = true;

      const scheduleNext = async (current: AudioPlayer | null, next: AudioPlayer | null) => {
        if (!spinLoopActiveRef.current || !current) return;
        try {
          await current.seekTo(0);
          current.play();
          const durationMs = current.duration > 0 ? current.duration * 1000 : 3000;
          const delay = Math.max(0, durationMs - SPIN_OVERLAP_MS);
          spinLoopTimeoutRef.current = setTimeout(() => {
            scheduleNext(next, current);
          }, delay);
        } catch { }
      };

      scheduleNext(spinSound1Ref.current, spinSound2Ref.current);
    }, []);

    // Continuous clockwise rotation — always running so native driver stays in sync
    useEffect(() => {
      rotation.setValue(0);
      rotationAnim.current = Animated.loop(
        Animated.timing(rotation, {
          toValue: -1,
          duration: 200,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      rotationAnim.current.start();
      return () => rotationAnim.current?.stop();
    }, []);

    // Accelerometer: detect quick -z → +z throw gesture
    useEffect(() => {
      Accelerometer.setUpdateInterval(60);
      const sub = Accelerometer.addListener(({ z }) => {
        if (thrownRef.current) return;
        if (tapCountRef.current < 5) return;

        if (lastZ.current !== null) {
          const delta = z - lastZ.current;
          if (delta > 2.0) {
            triggerThrow();
          }
        }
        lastZ.current = z;
      });
      return () => sub.remove();
    }, []);

    const triggerThrow = useCallback(() => {
      if (thrownRef.current) return;
      thrownRef.current = true;

      stopSpinLoop();
      stopVibrationLoop();
      playSound(throw1SoundRef.current);
      playSound(throw2SoundRef.current);

      Animated.spring(animScale, {
        toValue: 3.0,
        damping: 6,
        stiffness: 80,
        useNativeDriver: true,
      }).start();

      setTimeout(() => {
        Animated.timing(animOpacity, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }).start(() => {
          // Reset state — image stays mounted to keep native driver in sync
          setTapCount(0);
          thrownRef.current = false;
          tapCountRef.current = 0;
          animScale.setValue(0);
          animOpacity.setValue(0);
          lastZ.current = null;
          stopVibrationLoop();
          hintOpacity.setValue(1);
          onPowerReset?.();
        });
      }, RESET_AFTER_MS);
    }, [animScale, animOpacity, stopSound, playSound, stopVibrationLoop, stopSpinLoop]);

    const handleTap = useCallback(() => {
      if (thrownRef.current) return;

      const prev = tapCountRef.current;
      if (prev >= 5) return;
      const next = prev + 1;
      tapCountRef.current = next;
      setTapCount(next);

      // Every tap: charge sound
      playSound(chargeSoundRef.current);

      const stage = STAGES[next - 1];
      Animated.parallel([
        Animated.spring(animScale, {
          toValue: stage.scale,
          damping: 8,
          stiffness: 100,
          useNativeDriver: true,
        }),
        Animated.timing(animOpacity, {
          toValue: stage.opacity,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();

      // First tap: power appears — start spin loop, hide title, fade hint
      if (next === 1) {
        startSpinLoop();
        onPowerStart?.();
        Animated.timing(hintOpacity, { toValue: 0, duration: 300, useNativeDriver: true }).start();
      }

      // Fifth tap: power complete — stop spin, play ready, start vibration
      if (next === 5) {
        playSound(readySoundRef.current);
        startVibrationLoop();
      }
    }, [animScale, animOpacity, playSound, stopSound, startSpinLoop, stopSpinLoop]);

    const rotate = rotation.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '360deg'],
    });

    const imageSource = RASENGAN_IMG;

    // Always render the image (never unmount) so the native driver loop stays attached.
    // Visibility is controlled by animOpacity and animScale.
    return (
      <Pressable style={styles.container} onPress={handleTap}>
        <Animated.Image
          source={imageSource}
          style={[
            styles.image,
            {
              opacity: animOpacity,
              transform: [{ scale: animScale }, { rotate }],
            },
          ]}
          resizeMode="contain"
        />
        <Animated.View style={[styles.hint, { opacity: hintOpacity }]} pointerEvents="none">
          <Animated.View style={[
            styles.ripple,
            { transform: [{ scale: rippleScale }], opacity: rippleOpacity },
          ]} />
          <Animated.Text style={[
            styles.handIcon,
            { transform: [{ translateY: handTranslateY }, { scale: handScale }] },
          ]}>👆</Animated.Text>
          <Text style={styles.hintText}>{t(lang).simulation.tapToStart}</Text>
        </Animated.View>
      </Pressable>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    width: SCREEN_W,
    height: SCREEN_W,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: SCREEN_W,
    height: SCREEN_W,
  },
  hint: {
    position: 'absolute',
    bottom: SCREEN_W * 0.08,
    alignSelf: 'center',
    alignItems: 'center',
    gap: 6,
  },
  ripple: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.25)',
    top: 2,
  },
  handIcon: {
    fontSize: 38,
  },
  hintText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 3,
    color: 'rgba(255,255,255,0.55)',
  },
});
