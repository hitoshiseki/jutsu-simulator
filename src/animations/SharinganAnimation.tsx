import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Animated, Easing } from 'react-native';

const EYE_SIZE = 200;
const TOMOE_ORBIT = 62;
const TOMOE_SIZE = 22;

function usePulse(value: Animated.Value, min: number, max: number, duration: number) {
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(value, { toValue: max, duration, useNativeDriver: true }),
        Animated.timing(value, { toValue: min, duration, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);
}

interface TomoeProps {
  baseAngle: number;
  orbitValue: Animated.Value;
}

const Tomoe: React.FC<TomoeProps> = ({ baseAngle, orbitValue }) => {
  const rotate = orbitValue.interpolate({
    inputRange: [0, 1],
    outputRange: [`${baseAngle}deg`, `${baseAngle + 360}deg`],
  });

  return (
    <Animated.View style={[styles.tomoeOrbit, { transform: [{ rotate }, { translateX: TOMOE_ORBIT }] }]}>
      <View style={styles.tomoeHead} />
      <View style={styles.tomeeTail} />
    </Animated.View>
  );
};

interface RippleProps {
  size: number;
  delay: number;
}

const RippleRing: React.FC<RippleProps> = ({ size, delay }) => {
  const scale = useRef(new Animated.Value(0.6)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      const anim = Animated.loop(
        Animated.parallel([
          Animated.timing(scale, { toValue: 1.5, duration: 1800, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
          Animated.sequence([
            Animated.timing(opacity, { toValue: 0.5, duration: 200, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 0, duration: 1600, useNativeDriver: true }),
          ]),
        ])
      );
      anim.start();
    }, delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <Animated.View
      style={[
        styles.ripple,
        { width: size, height: size, borderRadius: size / 2, opacity, transform: [{ scale }] },
      ]}
    />
  );
};

export const SharinganAnimation: React.FC = () => {
  const tomoeOrbit = useRef(new Animated.Value(0)).current;
  const eyeScale = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0.5)).current;
  const pupilScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const spin = Animated.loop(
      Animated.timing(tomoeOrbit, { toValue: 1, duration: 3000, easing: Easing.linear, useNativeDriver: true })
    );
    spin.start();
    return () => spin.stop();
  }, []);

  usePulse(eyeScale, 0.97, 1.04, 1200);
  usePulse(glowOpacity, 0.3, 0.8, 900);
  usePulse(pupilScale, 0.9, 1.1, 800);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.outerGlow, { opacity: glowOpacity }]} />

      <RippleRing size={EYE_SIZE + 80} delay={0} />
      <RippleRing size={EYE_SIZE + 80} delay={600} />
      <RippleRing size={EYE_SIZE + 80} delay={1200} />

      <Animated.View style={[styles.eye, { transform: [{ scale: eyeScale }] }]}>
        <View style={styles.sclera} />
        <View style={styles.iris} />

        {/* Tomoe orbit layer */}
        <View style={styles.tomoeContainer}>
          <Tomoe baseAngle={0} orbitValue={tomoeOrbit} />
          <Tomoe baseAngle={120} orbitValue={tomoeOrbit} />
          <Tomoe baseAngle={240} orbitValue={tomoeOrbit} />
        </View>

        <Animated.View style={[styles.pupil, { transform: [{ scale: pupilScale }] }]}>
          <View style={styles.pupilInner} />
        </Animated.View>

        <View style={styles.highlight} />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: EYE_SIZE + 120,
    height: EYE_SIZE + 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerGlow: {
    position: 'absolute',
    width: EYE_SIZE + 60,
    height: EYE_SIZE + 60,
    borderRadius: (EYE_SIZE + 60) / 2,
    backgroundColor: 'rgba(255, 0, 0, 0.15)',
  },
  ripple: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: 'rgba(255, 50, 0, 0.6)',
  },
  eye: {
    width: EYE_SIZE,
    height: EYE_SIZE,
    borderRadius: EYE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF0000',
    shadowRadius: 35,
    shadowOpacity: 0.9,
  },
  sclera: {
    position: 'absolute',
    width: EYE_SIZE,
    height: EYE_SIZE,
    borderRadius: EYE_SIZE / 2,
    backgroundColor: '#CC0000',
  },
  iris: {
    position: 'absolute',
    width: EYE_SIZE * 0.78,
    height: EYE_SIZE * 0.78,
    borderRadius: (EYE_SIZE * 0.78) / 2,
    backgroundColor: '#880000',
    borderWidth: 3,
    borderColor: '#FF2200',
  },
  tomoeContainer: {
    position: 'absolute',
    width: 0,
    height: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tomoeOrbit: {
    position: 'absolute',
    width: 0,
    height: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tomoeHead: {
    width: TOMOE_SIZE,
    height: TOMOE_SIZE,
    borderRadius: TOMOE_SIZE / 2,
    backgroundColor: '#0A0000',
  },
  tomeeTail: {
    position: 'absolute',
    bottom: -8,
    width: 10,
    height: 18,
    borderRadius: 5,
    backgroundColor: '#0A0000',
    transform: [{ rotate: '20deg' }],
  },
  pupil: {
    width: EYE_SIZE * 0.32,
    height: EYE_SIZE * 0.32,
    borderRadius: (EYE_SIZE * 0.32) / 2,
    backgroundColor: '#050000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pupilInner: {
    width: '45%',
    height: '45%',
    borderRadius: 999,
    backgroundColor: 'rgba(255, 30, 0, 0.3)',
  },
  highlight: {
    position: 'absolute',
    top: EYE_SIZE * 0.18,
    left: EYE_SIZE * 0.28,
    width: 28,
    height: 18,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    transform: [{ rotate: '-25deg' }],
  },
});
