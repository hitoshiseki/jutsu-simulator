import React, { useEffect, useRef, useImperativeHandle, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Animated,
  Easing,
  PanResponder,
  Dimensions,
} from 'react-native';
import {
  useSharedValue,
  withTiming,
  cancelAnimation,
  Easing as ReaEasing,
} from 'react-native-reanimated';
import {
  createAudioPlayer,
  setAudioModeAsync,
  requestRecordingPermissionsAsync,
  useAudioRecorder,
  RecordingPresets,
  type AudioPlayer,
} from 'expo-audio';
import { useSoundContext } from '@/context/SoundContext';
import { Sounds } from '@/assets/sounds';
import KatonFlameParticles from '@/animations/KatonFlameParticles';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const BLOW_ALPHA = 0.1;
const BLOW_DB_FLOOR = -30;
const BLOW_DB_CEIL = -5;
const BLOW_ON_THRESHOLD = 0.35;
const BLOW_OFF_THRESHOLD = 0.2;
const MIC_INTERVAL_MS = 80;
const MIC_START_DELAY_MS = 1200;
const READY_TO_MIC_GAP_MS = 120;

const PLAYBACK_AUDIO_MODE = {
  playsInSilentMode: true,
  allowsRecording: false,
  interruptionMode: 'doNotMix' as const,
};

const RECORDING_AUDIO_MODE = {
  playsInSilentMode: true,
  allowsRecording: true,
  interruptionMode: 'doNotMix' as const,
};

function clamp01 (value: number): number {
  return Math.max(0, Math.min(1, value));
}

export interface KatonAnimationRef {
  cleanup: () => void;
}

type Props = {
  onPowerStart?: () => void;
  onPowerReset?: () => void;
  lang?: 'en' | 'pt';
};

const GlowRing: React.FC<{ touchOpacity: Animated.Value; glowScale: Animated.Value }> = ({
  touchOpacity,
  glowScale,
}) => (
  <Animated.View
    style={[
      styles.glowRing,
      {
        opacity: touchOpacity,
        transform: [{ scale: glowScale }],
      },
    ]}
    pointerEvents="none"
  />
);

export const KatonAnimation = React.forwardRef<KatonAnimationRef, Props>(
  function KatonAnimation ({ onPowerStart, onPowerReset }, ref) {
    const { soundEnabled } = useSoundContext();
    const soundEnabledRef = useRef(soundEnabled);

    // JS-thread animated values for container position
    const containerX = useRef(new Animated.Value(SCREEN_W / 2)).current;
    const containerY = useRef(new Animated.Value(SCREEN_H / 2)).current;

    // blowIntensity lives on UI thread (Reanimated) so Skia worklets can read it
    const blowIntensity = useSharedValue(0);
    // Native-driver animated values
    const touchOpacity = useRef(new Animated.Value(0)).current;
    const glowScale = useRef(new Animated.Value(1)).current;

    // State refs
    const isTouchingRef = useRef(false);
    const isBlowingRef = useRef(false);
    const touchOriginRef = useRef({ x: 0, y: 0 });
    const lowPassRef = useRef(0);
    const micActiveRef = useRef(false);
    const micWarmupRef = useRef(0);
    const readyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const meterIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const glowLoopRef = useRef<Animated.CompositeAnimation | null>(null);

    // Sound
    const readySoundRef = useRef<AudioPlayer | null>(null);

    // Mic recorder
    const audioRecorder = useAudioRecorder(RecordingPresets.LOW_QUALITY);

    useEffect(() => {
      soundEnabledRef.current = soundEnabled;
    }, [soundEnabled]);

    // Load sounds on mount
    useEffect(() => {
      let mounted = true;
      const load = async () => {
        try {
          await setAudioModeAsync(PLAYBACK_AUDIO_MODE);
        } catch {
          // Keep going so players still initialize even if audio mode setup fails transiently.
        }
        if (!mounted) return;
        readySoundRef.current = createAudioPlayer(Sounds.fireBreath.ready, { keepAudioSessionActive: true });
      };
      load();
      return () => {
        mounted = false;
        readySoundRef.current?.remove();
      };
    }, []);

    // Standby glow pulse loop (runs only when touching)
    const startGlowLoop = useCallback(() => {
      glowLoopRef.current?.stop();
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(glowScale, { toValue: 1.15, duration: 400, easing: Easing.out(Easing.sin), useNativeDriver: true }),
          Animated.timing(glowScale, { toValue: 0.9, duration: 500, useNativeDriver: true }),
        ])
      );
      glowLoopRef.current = loop;
      loop.start();
    }, []);

    const stopGlowLoop = useCallback(() => {
      glowLoopRef.current?.stop();
      glowLoopRef.current = null;
    }, []);

    const playSound = useCallback(async (sound: AudioPlayer | null) => {
      if (!soundEnabledRef.current || !sound) return;
      try { await sound.seekTo(0); } catch { }
      try { sound.play(); } catch { }
    }, []);

    const stopSound = useCallback((sound: AudioPlayer | null) => {
      if (!sound) return;
      try { sound.pause(); } catch { }
    }, []);

    const startMic = useCallback(async () => {
      if (!isTouchingRef.current || micActiveRef.current) return;
      try {
        const { granted } = await requestRecordingPermissionsAsync();
        console.log('Mic permission granted:', granted);
        if (!granted || !isTouchingRef.current) return;
        await setAudioModeAsync(RECORDING_AUDIO_MODE);
        await audioRecorder.prepareToRecordAsync({ ...RecordingPresets.LOW_QUALITY, isMeteringEnabled: true });
        audioRecorder.record();
        micActiveRef.current = true;
        micWarmupRef.current = 0;
        lowPassRef.current = 0;
        console.log('Mic recording started');
        meterIntervalRef.current = setInterval(() => {
          if (!isTouchingRef.current) return;
          // Skip the first ~640ms of samples to let the readySound echo fade
          if (micWarmupRef.current < 8) {
            micWarmupRef.current++;
            return;
          }
          const status = audioRecorder.getStatus();
          if (!status.isRecording) {
            console.log('Mic recorder not recording; waiting next interval');
            return;
          }
          const metering = (status as { metering?: number }).metering;
          if (metering !== undefined && metering !== null) {
            const normalized = clamp01((metering - BLOW_DB_FLOOR) / (BLOW_DB_CEIL - BLOW_DB_FLOOR));
            lowPassRef.current = BLOW_ALPHA * normalized + (1 - BLOW_ALPHA) * lowPassRef.current;
            console.log('Metering dB:', metering.toFixed(1), 'Norm:', normalized.toFixed(3), 'Low-pass:', lowPassRef.current.toFixed(3));

            cancelAnimation(blowIntensity);
            blowIntensity.value = withTiming(lowPassRef.current, { duration: 100 });

            if (lowPassRef.current > BLOW_ON_THRESHOLD) {
              cancelAnimation(blowIntensity);
              blowIntensity.value = withTiming(1, { duration: 100 });

              if (!isBlowingRef.current) {
                isBlowingRef.current = true;
              }
            } else if (lowPassRef.current < BLOW_OFF_THRESHOLD) {
              cancelAnimation(blowIntensity);
              blowIntensity.value = withTiming(0, {
                duration: 500,
                easing: ReaEasing.out(ReaEasing.quad),
              });

              if (isBlowingRef.current) {
                isBlowingRef.current = false;
              }
            }
          }
        }, MIC_INTERVAL_MS);
      } catch (error) {
        micActiveRef.current = false;
        setAudioModeAsync(PLAYBACK_AUDIO_MODE).catch(() => undefined);
        console.log('Error starting mic:', error);
      }
    }, [audioRecorder]);

    const stopMic = useCallback(() => {
      if (meterIntervalRef.current !== null) {
        clearInterval(meterIntervalRef.current);
        meterIntervalRef.current = null;
      }
      try { audioRecorder.stop(); } catch { }
      setAudioModeAsync(PLAYBACK_AUDIO_MODE).catch(() => undefined);
      micActiveRef.current = false;
      lowPassRef.current = 0;
    }, [audioRecorder]);

    const resetTouch = useCallback(() => {
      isTouchingRef.current = false;
      isBlowingRef.current = false;

      if (readyTimerRef.current !== null) {
        clearTimeout(readyTimerRef.current);
        readyTimerRef.current = null;
      }
      stopMic();
      stopSound(readySoundRef.current);
      stopGlowLoop();

      cancelAnimation(blowIntensity);
      blowIntensity.value = withTiming(0, { duration: 300 });
      Animated.timing(touchOpacity, { toValue: 0, duration: 300, useNativeDriver: true }).start();

      onPowerReset?.();
    }, [blowIntensity, touchOpacity, stopMic, stopSound, stopGlowLoop, onPowerReset]);

    useImperativeHandle(ref, () => ({
      cleanup: resetTouch,
    }));

    const panResponder = useRef(
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,

        onPanResponderGrant: (evt, gestureState) => {
          const x = gestureState.x0 || evt.nativeEvent.locationX || SCREEN_W / 2;
          const y = gestureState.y0 || evt.nativeEvent.locationY || SCREEN_H / 2;
          touchOriginRef.current = { x, y };
          containerX.setValue(x);
          containerY.setValue(y);
          isTouchingRef.current = true;

          Animated.timing(touchOpacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }).start();

          startGlowLoop();
          playSound(readySoundRef.current);

          const readyDurationMs = Math.max(0, Math.round((readySoundRef.current?.duration ?? 0) * 1000));
          const micDelay = Math.max(MIC_START_DELAY_MS, readyDurationMs + READY_TO_MIC_GAP_MS);

          readyTimerRef.current = setTimeout(() => {
            startMic();
          }, micDelay);

          onPowerStart?.();
        },

        onPanResponderMove: (evt, gestureState) => {
          const x = gestureState.moveX || evt.nativeEvent.locationX || touchOriginRef.current.x;
          const y = gestureState.moveY || evt.nativeEvent.locationY || touchOriginRef.current.y;
          containerX.setValue(x);
          containerY.setValue(y);

        },

        onPanResponderRelease: resetTouch,
        onPanResponderTerminate: resetTouch,
      })
    ).current;

    return (
      <View style={styles.fullScreen} {...panResponder.panHandlers}>
        <Animated.View
          style={[
            styles.container,
            {
              left: containerX,
              top: containerY,
            },
          ]}
          pointerEvents="none"
        >
          {/* Standby glow ring */}
          <GlowRing touchOpacity={touchOpacity} glowScale={glowScale} />

          {/* Standby glow core */}
          <Animated.View
            style={[styles.glowCore, { opacity: touchOpacity }]}
            pointerEvents="none"
          />

          <KatonFlameParticles
            blowIntensity={blowIntensity}
          />
        </Animated.View>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  fullScreen: {
    ...StyleSheet.absoluteFillObject,
  },
  container: {
    position: 'absolute',
    width: 0,
    height: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowRing: {
    position: 'absolute',
    left: -30,
    top: -30,
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: 'rgba(255, 100, 0, 0.6)',
    backgroundColor: 'transparent',
  },
  glowCore: {
    position: 'absolute',
    left: -14,
    top: -14,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 80, 0, 0.8)',
    shadowColor: '#FF4400',
    shadowRadius: 12,
    shadowOpacity: 1,
  },
});
