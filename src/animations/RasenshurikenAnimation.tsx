import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Animated, Easing } from 'react-native';

const BLADE_SIZE = 80;
const BLADE_OFFSET = 55;

function useLoop(
  value: Animated.Value,
  toValue: number,
  duration: number,
  easing: typeof Easing.linear = Easing.linear
) {
  useEffect(() => {
    const anim = Animated.loop(
      Animated.timing(value, { toValue, duration, easing, useNativeDriver: true })
    );
    anim.start();
    return () => anim.stop();
  }, []);
}

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

interface EnergyRingProps {
  size: number;
  color: string;
  duration: number;
  reverse?: boolean;
}

const EnergyRing: React.FC<EnergyRingProps> = ({ size, color, duration, reverse = false }) => {
  const rotation = useRef(new Animated.Value(0)).current;
  useLoop(rotation, 1, duration);

  const rotate = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: reverse ? ['0deg', '-360deg'] : ['0deg', '360deg'],
  });

  return (
    <Animated.View
      style={[
        styles.ring,
        { width: size, height: size, borderRadius: size / 2, borderColor: color, transform: [{ rotate }] },
      ]}
    />
  );
};

interface WindParticleProps {
  orbitRadius: number;
  color: string;
  duration: number;
  initialAngle: number;
  size: number;
}

const WindParticle: React.FC<WindParticleProps> = ({ orbitRadius, color, duration, initialAngle, size }) => {
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.timing(rotation, { toValue: 1, duration, easing: Easing.linear, useNativeDriver: true })
    );
    anim.start();
    return () => anim.stop();
  }, []);

  const rotate = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: [`${initialAngle}deg`, `${initialAngle + 360}deg`],
  });

  return (
    <Animated.View style={[styles.particleWrapper, { transform: [{ rotate }, { translateX: orbitRadius }] }]}>
      <View style={[styles.windParticle, { width: size, height: size / 3, backgroundColor: color }]} />
    </Animated.View>
  );
};

export const RasenshurikenAnimation: React.FC = () => {
  const mainRotation = useRef(new Animated.Value(0)).current;
  const outerScale = useRef(new Animated.Value(0.9)).current;
  const glowOpacity = useRef(new Animated.Value(0.5)).current;

  useLoop(mainRotation, 1, 1200, Easing.linear);
  usePulse(outerScale, 0.9, 1.1, 600);
  usePulse(glowOpacity, 0.4, 0.9, 400);

  const spin = mainRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const windParticles = [
    { orbitRadius: 125, color: '#BB44FF', duration: 700, initialAngle: 0, size: 18 },
    { orbitRadius: 125, color: '#FF88FF', duration: 700, initialAngle: 60, size: 12 },
    { orbitRadius: 125, color: '#BB44FF', duration: 700, initialAngle: 120, size: 16 },
    { orbitRadius: 125, color: '#FF88FF', duration: 700, initialAngle: 180, size: 10 },
    { orbitRadius: 125, color: '#BB44FF', duration: 700, initialAngle: 240, size: 15 },
    { orbitRadius: 125, color: '#FF88FF', duration: 700, initialAngle: 300, size: 12 },
    { orbitRadius: 95, color: '#FFFFFF', duration: 1000, initialAngle: 30, size: 8 },
    { orbitRadius: 95, color: '#BB44FF', duration: 1000, initialAngle: 150, size: 10 },
    { orbitRadius: 95, color: '#FFFFFF', duration: 1000, initialAngle: 270, size: 8 },
  ];

  return (
    <View style={styles.container}>
      <EnergyRing size={255} color="rgba(136,68,170,0.3)" duration={3000} />
      <EnergyRing size={215} color="rgba(187,68,255,0.5)" duration={2000} reverse />
      <EnergyRing size={175} color="rgba(187,68,255,0.7)" duration={1400} />

      <View style={styles.particleContainer}>
        {windParticles.map((p, i) => (
          <WindParticle key={i} {...p} />
        ))}
      </View>

      {/* 4 blades spinning */}
      <Animated.View style={[styles.shurikenContainer, { transform: [{ rotate: spin }, { scale: outerScale }] }]}>
        {[0, 90, 180, 270].map((angle, i) => (
          <View key={i} style={[styles.bladeWrapper, { transform: [{ rotate: `${angle}deg` }, { translateX: BLADE_OFFSET }] }]}>
            <View style={[styles.blade, { backgroundColor: i % 2 === 0 ? '#BB44FF' : '#9933CC' }]} />
          </View>
        ))}
      </Animated.View>

      <Animated.View style={[styles.core, { opacity: glowOpacity }]}>
        <View style={styles.coreInner} />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 300,
    height: 300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    borderWidth: 3,
    borderStyle: 'dashed',
  },
  particleContainer: {
    position: 'absolute',
    width: 0,
    height: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  particleWrapper: {
    position: 'absolute',
    width: 0,
    height: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  windParticle: {
    borderRadius: 2,
  },
  shurikenContainer: {
    position: 'absolute',
    width: 0,
    height: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bladeWrapper: {
    position: 'absolute',
    width: 0,
    height: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blade: {
    width: BLADE_SIZE,
    height: BLADE_SIZE * 0.4,
    borderRadius: 6,
    transform: [{ rotate: '45deg' }],
  },
  core: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#1A0030',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#BB44FF',
    shadowRadius: 25,
    shadowOpacity: 1,
  },
  coreInner: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    backgroundColor: '#BB44FF',
  },
});
