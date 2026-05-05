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
const BLOW_THRESHOLD = 0.15;
const MIC_INTERVAL_MS = 80;
const MIC_START_DELAY_MS = 3000;

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

    // JS-thread animated values for container position + rotation
    const containerX = useRef(new Animated.Value(SCREEN_W / 2)).current;
    const containerY = useRef(new Animated.Value(SCREEN_H / 2)).current;
    const rotationValue = useRef(new Animated.Value(0)).current;

    // Native-driver animated values
    const blowIntensity = useRef(new Animated.Value(0)).current;
    const touchOpacity = useRef(new Animated.Value(0)).current;
    const glowScale = useRef(new Animated.Value(1)).current;

    // State refs
    const isTouchingRef = useRef(false);
    const isBlowingRef = useRef(false);
    const touchOriginRef = useRef({ x: 0, y: 0 });
    const lowPassRef = useRef(0);
    const readyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const meterIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const blowAnimRef = useRef<Animated.CompositeAnimation | null>(null);
    const glowLoopRef = useRef<Animated.CompositeAnimation | null>(null);

    // Sound
    const readySoundRef = useRef<AudioPlayer | null>(null);
    const throwSoundRef = useRef<AudioPlayer | null>(null);
    const throwLoopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const throwLoopActiveRef = useRef(false);

    // Mic recorder
    const audioRecorder = useAudioRecorder(RecordingPresets.LOW_QUALITY);

    useEffect(() => {
      soundEnabledRef.current = soundEnabled;
    }, [soundEnabled]);

    // Load sounds on mount
    useEffect(() => {
      let mounted = true;
      const load = async () => {
        await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
        if (!mounted) return;
        readySoundRef.current = createAudioPlayer(Sounds.katon.ready, { keepAudioSessionActive: true });
        throwSoundRef.current = createAudioPlayer(Sounds.katon.throw, { keepAudioSessionActive: true });
      };
      load();
      return () => {
        mounted = false;
        readySoundRef.current?.remove();
        throwSoundRef.current?.remove();
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
      try { await sound.seekTo(0); sound.play(); } catch { }
    }, []);

    const stopSound = useCallback((sound: AudioPlayer | null) => {
      if (!sound) return;
      try { sound.pause(); } catch { }
    }, []);

    const startThrowLoop = useCallback(() => {
      if (throwLoopActiveRef.current) return;
      throwLoopActiveRef.current = true;

      const playNext = async () => {
        if (!throwLoopActiveRef.current) return;
        if (!soundEnabledRef.current || !throwSoundRef.current) {
          throwLoopTimeoutRef.current = setTimeout(playNext, 800);
          return;
        }
        try {
          await throwSoundRef.current.seekTo(0);
          throwSoundRef.current.play();
          throwLoopTimeoutRef.current = setTimeout(playNext, 800);
        } catch {
          throwLoopTimeoutRef.current = setTimeout(playNext, 800);
        }
      };
      playNext();
    }, []);

    const stopThrowLoop = useCallback(() => {
      throwLoopActiveRef.current = false;
      if (throwLoopTimeoutRef.current !== null) {
        clearTimeout(throwLoopTimeoutRef.current);
        throwLoopTimeoutRef.current = null;
      }
      stopSound(throwSoundRef.current);
    }, [stopSound]);

    const startMic = useCallback(async () => {
      if (!isTouchingRef.current) return;
      try {
        // Ensure the pre-charge sound cannot deactivate the audio session while recording starts.
        stopSound(readySoundRef.current);
        const { granted } = await requestRecordingPermissionsAsync();
        console.log('Mic permission granted:', granted);
        if (!granted || !isTouchingRef.current) return;
        await audioRecorder.prepareToRecordAsync({ ...RecordingPresets.LOW_QUALITY, isMeteringEnabled: true });
        audioRecorder.record();
        console.log('Mic recording started');
        meterIntervalRef.current = setInterval(() => {
          if (!isTouchingRef.current) return;
          const status = audioRecorder.getStatus();
          if (!status.isRecording) {
            console.log('Mic recorder stopped unexpectedly; attempting to resume');
            try { audioRecorder.record(); } catch (resumeError) { console.log('Mic resume failed:', resumeError); }
            return;
          }
          const metering = (status as { metering?: number }).metering;
          if (metering !== undefined && metering !== null) {
            const linear = Math.pow(10, 0.05 * metering);
            lowPassRef.current = BLOW_ALPHA * linear + (1 - BLOW_ALPHA) * lowPassRef.current;
            console.log('Metering:', metering.toFixed(1), 'Linear:', linear.toFixed(3), 'Low-pass:', lowPassRef.current.toFixed(3));
            if (lowPassRef.current > BLOW_THRESHOLD) {
              blowAnimRef.current?.stop();
              blowAnimRef.current = Animated.timing(blowIntensity, {
                toValue: 1,
                duration: 100,
                useNativeDriver: true,
              });
              blowAnimRef.current.start();

              if (!isBlowingRef.current) {
                isBlowingRef.current = true;
                startThrowLoop();
              }
            } else {
              blowAnimRef.current?.stop();
              blowAnimRef.current = Animated.timing(blowIntensity, {
                toValue: 0,
                duration: 500,
                easing: Easing.out(Easing.quad),
                useNativeDriver: true,
              });
              blowAnimRef.current.start();

              if (isBlowingRef.current) {
                isBlowingRef.current = false;
                stopThrowLoop();
              }
            }
          }
        }, MIC_INTERVAL_MS);
      } catch (error) {
        console.log('Error starting mic:', error);
      }
    }, [audioRecorder, blowIntensity, startThrowLoop, stopSound, stopThrowLoop]);

    const stopMic = useCallback(() => {
      if (meterIntervalRef.current !== null) {
        clearInterval(meterIntervalRef.current);
        meterIntervalRef.current = null;
      }
      try { audioRecorder.stop(); } catch { }
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
      stopThrowLoop();
      stopSound(readySoundRef.current);
      stopGlowLoop();

      blowAnimRef.current?.stop();
      Animated.parallel([
        Animated.timing(blowIntensity, { toValue: 0, duration: 300, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(touchOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();

      onPowerReset?.();
    }, [blowIntensity, touchOpacity, stopMic, stopThrowLoop, stopSound, stopGlowLoop, onPowerReset]);

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
          rotationValue.setValue(0);
          isTouchingRef.current = true;

          Animated.timing(touchOpacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }).start();

          startGlowLoop();
          playSound(readySoundRef.current);

          readyTimerRef.current = setTimeout(() => {
            startMic();
          }, MIC_START_DELAY_MS);

          onPowerStart?.();
        },

        onPanResponderMove: (evt, gestureState) => {
          const x = gestureState.moveX || evt.nativeEvent.locationX || touchOriginRef.current.x;
          const y = gestureState.moveY || evt.nativeEvent.locationY || touchOriginRef.current.y;
          containerX.setValue(x);
          containerY.setValue(y);

          const dx = x - touchOriginRef.current.x;
          const dy = y - touchOriginRef.current.y;
          const mag = Math.sqrt(dx * dx + dy * dy);
          if (mag > 20) {
            const angle = (Math.atan2(dx, -dy) * 180) / Math.PI;
            rotationValue.setValue(angle);
          }
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
              transform: [
                {
                  rotate: rotationValue.interpolate({
                    inputRange: [-180, 180],
                    outputRange: ['-180deg', '180deg'],
                  }),
                },
              ],
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
