import React, { useEffect, useRef, useCallback, useImperativeHandle } from 'react';
import { StyleSheet, Animated, View, Text, Image, Dimensions, Platform, Vibration } from 'react-native';
import { Accelerometer } from 'expo-sensors';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { useSoundContext } from '@/context/SoundContext';
import { Images } from '@/assets/images';
import { Sounds } from '@/assets/sounds';
import { t } from '@/i18n/translations';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const CHIDORI_IMG = Images.lightningPalm;

const RESET_AFTER_MS = 3000;
// ~12fps flicker — fast enough to look like electricity
const FRAME_MS = 80;

// 4-frame flip cycle: original → flip H → flip H+V → flip V
const FRAMES = [
  { scaleX: 1, scaleY: 1 },
  { scaleX: -1, scaleY: 1 },
  { scaleX: -1, scaleY: -1 },
  { scaleX: 1, scaleY: -1 },
];

export interface ChidoriAnimationRef {
  cleanup: () => void;
}

type Props = {
  onPowerStart?: () => void;
  onPowerReset?: () => void;
  lang?: 'en' | 'pt';
};

export const ChidoriAnimation = React.forwardRef<ChidoriAnimationRef, Props>(
  function ChidoriAnimation ({ onPowerStart, onPowerReset, lang = 'en' }, ref) {
    const { soundEnabled } = useSoundContext();
    const soundEnabledRef = useRef(soundEnabled);

    // Animated values — opacity/scale use native driver; frame flips use JS setValue
    const animScale = useRef(new Animated.Value(0)).current;
    const animOpacity = useRef(new Animated.Value(0)).current;
    const hintOpacity = useRef(new Animated.Value(1)).current;
    const hintShakeX = useRef(new Animated.Value(0)).current;
    // These are only ever updated via setValue (JS thread), so they live in their own Animated.View
    const frameScaleX = useRef(new Animated.Value(1)).current;
    const frameScaleY = useRef(new Animated.Value(1)).current;

    // Hint phone-shake loop
    useEffect(() => {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(hintShakeX, { toValue: -8, duration: 55, useNativeDriver: true }),
          Animated.timing(hintShakeX, { toValue: 8, duration: 55, useNativeDriver: true }),
          Animated.timing(hintShakeX, { toValue: -5, duration: 45, useNativeDriver: true }),
          Animated.timing(hintShakeX, { toValue: 5, duration: 45, useNativeDriver: true }),
          Animated.timing(hintShakeX, { toValue: 0, duration: 35, useNativeDriver: true }),
          Animated.delay(950),
        ])
      );
      loop.start();
      return () => loop.stop();
    }, []);

    const activatedRef = useRef(false);
    const thrownRef = useRef(false);
    const lastXRef = useRef<number | null>(null);
    const shakeCountRef = useRef(0);
    const shakeLastTimeRef = useRef(0);
    const lastZRef = useRef<number | null>(null);
    const frameIndexRef = useRef(0);
    const frameIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const loopSoundRef = useRef<AudioPlayer | null>(null);
    const throwSoundRef = useRef<AudioPlayer | null>(null);
    const loopActiveRef = useRef(false);
    const loopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
      soundEnabledRef.current = soundEnabled;
    }, [soundEnabled]);

    const stopVibrationLoop = useCallback(() => {
      Vibration.cancel();
    }, []);

    const cleanup = useCallback(() => {
      stopVibrationLoop();
      loopActiveRef.current = false;
      if (loopTimeoutRef.current !== null) {
        clearTimeout(loopTimeoutRef.current);
        loopTimeoutRef.current = null;
      }
      if (frameIntervalRef.current !== null) {
        clearInterval(frameIntervalRef.current);
        frameIntervalRef.current = null;
      }
      try { loopSoundRef.current?.pause(); } catch { }
      try { throwSoundRef.current?.pause(); } catch { }
    }, [stopVibrationLoop]);

    useImperativeHandle(ref, () => ({ cleanup }), [cleanup]);

    const startVibrationLoop = useCallback(() => {
      if (Platform.OS === 'web') return;
      Vibration.vibrate([0, 80, 40], true);
    }, []);

    // Load sounds on mount
    useEffect(() => {
      let mounted = true;
      const loadSounds = async () => {
        await setAudioModeAsync({ playsInSilentMode: true });
        if (!mounted) return;
        loopSoundRef.current = createAudioPlayer(Sounds.lightningPalm.loop);
        throwSoundRef.current = createAudioPlayer(Sounds.lightningPalm.throw);
      };
      loadSounds();
      return () => {
        mounted = false;
        loopActiveRef.current = false;
        if (loopTimeoutRef.current !== null) clearTimeout(loopTimeoutRef.current);
        if (frameIntervalRef.current !== null) clearInterval(frameIntervalRef.current);
        loopSoundRef.current?.remove();
        throwSoundRef.current?.remove();
        stopVibrationLoop();
      };
    }, []);

    const stopLoopSound = useCallback(() => {
      loopActiveRef.current = false;
      if (loopTimeoutRef.current !== null) {
        clearTimeout(loopTimeoutRef.current);
        loopTimeoutRef.current = null;
      }
      try { loopSoundRef.current?.pause(); } catch { }
    }, []);

    const startLoopSound = useCallback(() => {
      if (!soundEnabledRef.current) return;
      loopActiveRef.current = true;

      const scheduleNext = async () => {
        if (!loopActiveRef.current || !loopSoundRef.current) return;
        try {
          await loopSoundRef.current.seekTo(0);
          loopSoundRef.current.play();
          const durationMs = loopSoundRef.current.duration > 0
            ? loopSoundRef.current.duration * 1000
            : 2000;
          loopTimeoutRef.current = setTimeout(scheduleNext, durationMs - 50);
        } catch { }
      };

      scheduleNext();
    }, []);

    const stopFrameLoop = useCallback(() => {
      if (frameIntervalRef.current !== null) {
        clearInterval(frameIntervalRef.current);
        frameIntervalRef.current = null;
      }
    }, []);

    const startFrameLoop = useCallback(() => {
      stopFrameLoop();
      frameIndexRef.current = 0;
      frameScaleX.setValue(1);
      frameScaleY.setValue(1);
      frameIntervalRef.current = setInterval(() => {
        frameIndexRef.current = (frameIndexRef.current + 1) % FRAMES.length;
        const frame = FRAMES[frameIndexRef.current];
        frameScaleX.setValue(frame.scaleX);
        frameScaleY.setValue(frame.scaleY);
      }, FRAME_MS);
    }, []);

    const triggerActivation = useCallback(() => {
      if (activatedRef.current) return;
      activatedRef.current = true;

      onPowerStart?.();
      startVibrationLoop();
      startLoopSound();
      startFrameLoop();

      Animated.timing(hintOpacity, { toValue: 0, duration: 300, useNativeDriver: true }).start();
      Animated.parallel([
        Animated.timing(animScale, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.timing(animOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    }, [animScale, animOpacity, hintOpacity, onPowerStart, startVibrationLoop, startLoopSound, startFrameLoop]);

    const triggerThrow = useCallback(() => {
      if (thrownRef.current || !activatedRef.current) return;
      thrownRef.current = true;

      stopLoopSound();
      stopVibrationLoop();

      if (soundEnabledRef.current && throwSoundRef.current) {
        (async () => {
          try {
            await throwSoundRef.current!.seekTo(0);
            throwSoundRef.current!.play();
          } catch { }
        })();
      }

      Animated.timing(animScale, {
        toValue: 3.0,
        duration: 100,
        useNativeDriver: true,
      }).start();

      setTimeout(() => {
        Animated.timing(animOpacity, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }).start(() => {
          activatedRef.current = false;
          thrownRef.current = false;
          stopFrameLoop();
          animScale.setValue(0);
          animOpacity.setValue(0);
          frameScaleX.setValue(1);
          frameScaleY.setValue(1);
          lastXRef.current = null;
          lastZRef.current = null;
          shakeCountRef.current = 0;
          hintOpacity.setValue(1);
          onPowerReset?.();
        });
      }, RESET_AFTER_MS);
    }, [animScale, animOpacity, stopFrameLoop, stopLoopSound, stopVibrationLoop, frameScaleX, frameScaleY, onPowerReset]);

    // Accelerometer: X-axis shake → activate | Z-axis thrust → throw
    useEffect(() => {
      Accelerometer.setUpdateInterval(50);
      const sub = Accelerometer.addListener(({ x, z }) => {
        // --- activation via X shake ---
        if (!activatedRef.current && !thrownRef.current) {
          if (lastXRef.current !== null) {
            const deltaX = Math.abs(x - lastXRef.current);
            if (deltaX > 0.9) {
              const now = Date.now();
              if (now - shakeLastTimeRef.current > 1200) {
                shakeCountRef.current = 0;
              }
              shakeCountRef.current++;
              shakeLastTimeRef.current = now;
              if (shakeCountRef.current >= 4) {
                triggerActivation();
              }
            }
          }
          lastXRef.current = x;
        }

        // --- throw via Z thrust (push phone forward like throwing) ---
        if (activatedRef.current && !thrownRef.current) {
          if (lastZRef.current !== null) {
            const deltaZ = z - lastZRef.current;
            if (deltaZ > 2.0) {
              triggerThrow();
            }
          }
          lastZRef.current = z;
        }
      });
      return () => sub.remove();
    }, [triggerActivation, triggerThrow]);

    return (
      <View style={styles.container}>
        {/*
        Outer Animated.View — opacity + scale use native driver.
        Inner Animated.View — frame flips use setValue (JS thread).
        Kept separate so native driver and JS updates don't conflict.
      */}
        <Animated.View
          style={[
            styles.imageWrapper,
            { opacity: animOpacity, transform: [{ scale: animScale }] },
          ]}
        >
          <Animated.View
            style={{
              width: SCREEN_W,
              height: SCREEN_H,
              transform: [{ scaleX: frameScaleX }, { scaleY: frameScaleY }],
            }}
          >
            <Image source={CHIDORI_IMG} style={styles.image} resizeMode="cover" />
          </Animated.View>
        </Animated.View>

        <Animated.View style={[styles.hint, { opacity: hintOpacity }]} pointerEvents="none">
          <Animated.Text style={[styles.phoneIcon, { transform: [{ translateX: hintShakeX }] }]}>
            📱
          </Animated.Text>
          <Text style={styles.hintText}>{t(lang).simulation.shakeToStart}</Text>
        </Animated.View>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    width: SCREEN_W,
    height: SCREEN_H,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageWrapper: {
    width: SCREEN_W,
    height: SCREEN_H,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: SCREEN_W,
    height: SCREEN_H,
  },
  hint: {
    position: 'absolute',
    alignSelf: 'center',
    alignItems: 'center',
    gap: 6,
  },
  phoneIcon: {
    fontSize: 38,
  },
  hintText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 3,
    color: 'rgba(255,255,255,0.55)',
  },
});


