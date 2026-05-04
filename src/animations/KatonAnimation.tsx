import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Animated, Easing } from 'react-native';

interface FireballProps {
  maxSize: number;
  color: string;
  delay: number;
  duration: number;
}

const Fireball: React.FC<FireballProps> = ({ maxSize, color, delay, duration }) => {
  const scale = useRef(new Animated.Value(0.05)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      const anim = Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(scale, { toValue: 0.05, duration: 0, useNativeDriver: true }),
            Animated.timing(scale, { toValue: 1, duration, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.timing(opacity, { toValue: 0.9, duration: duration * 0.2, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 0.5, duration: duration * 0.5, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 0, duration: duration * 0.3, useNativeDriver: true }),
          ]),
        ])
      );
      anim.start();
    }, delay);
    return () => clearTimeout(timer);
  }, [delay, duration]);

  return (
    <Animated.View
      style={[
        styles.fireball,
        {
          width: maxSize,
          height: maxSize,
          borderRadius: maxSize / 2,
          backgroundColor: color,
          opacity,
          transform: [{ scale }],
        },
      ]}
    />
  );
};

interface EmberProps {
  angle: number;
  distance: number;
  delay: number;
  size: number;
}

const Ember: React.FC<EmberProps> = ({ angle, distance, delay, size }) => {
  const progress = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const rad = (angle * Math.PI) / 180;

  useEffect(() => {
    const timer = setTimeout(() => {
      const anim = Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(progress, { toValue: 0, duration: 0, useNativeDriver: true }),
            Animated.timing(progress, { toValue: 1, duration: 1000 + (angle % 600), easing: Easing.out(Easing.quad), useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 0.8, duration: 400, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: true }),
          ]),
        ])
      );
      anim.start();
    }, delay);
    return () => clearTimeout(timer);
  }, [delay]);

  const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(rad) * distance] });
  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(rad) * distance] });

  return (
    <Animated.View
      style={[
        styles.ember,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          opacity,
          transform: [{ translateX }, { translateY }],
        },
      ]}
    />
  );
};

const FlickerOverlay: React.FC = () => {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.15, duration: 80, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 120, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.1, duration: 60, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.flicker, { opacity }]} pointerEvents="none" />
  );
};

const EMBERS: EmberProps[] = Array.from({ length: 24 }, (_, i) => ({
  angle: i * 15,
  distance: 110 + (i % 4) * 25,
  delay: i * 40,
  size: 4 + (i % 3) * 3,
}));

export const KatonAnimation: React.FC = () => {
  const coreScale = useRef(new Animated.Value(1)).current;
  const hazeScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const anim1 = Animated.loop(
      Animated.sequence([
        Animated.timing(coreScale, { toValue: 1.08, duration: 200, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(coreScale, { toValue: 0.95, duration: 300, useNativeDriver: true }),
        Animated.timing(coreScale, { toValue: 1.05, duration: 150, useNativeDriver: true }),
        Animated.timing(coreScale, { toValue: 0.98, duration: 250, useNativeDriver: true }),
      ])
    );
    const anim2 = Animated.loop(
      Animated.sequence([
        Animated.timing(hazeScale, { toValue: 1.12, duration: 600, easing: Easing.out(Easing.sin), useNativeDriver: true }),
        Animated.timing(hazeScale, { toValue: 0.92, duration: 600, useNativeDriver: true }),
      ])
    );
    anim1.start();
    anim2.start();
    return () => { anim1.stop(); anim2.stop(); };
  }, []);

  return (
    <View style={styles.container}>
      <Fireball maxSize={300} color="rgba(180,20,0,0.25)" delay={0} duration={1600} />
      <Fireball maxSize={260} color="rgba(220,60,0,0.35)" delay={200} duration={1400} />
      <Fireball maxSize={220} color="rgba(255,100,0,0.5)" delay={100} duration={1200} />
      <Fireball maxSize={180} color="rgba(255,150,0,0.6)" delay={300} duration={1000} />
      <Fireball maxSize={140} color="rgba(255,200,0,0.7)" delay={150} duration={800} />

      <Animated.View style={[styles.hazeRing, { transform: [{ scale: hazeScale }] }]} />

      <View style={styles.emberContainer}>
        {EMBERS.map((e, i) => (
          <Ember key={i} {...e} />
        ))}
      </View>

      <Animated.View style={[styles.core, { transform: [{ scale: coreScale }] }]}>
        <View style={styles.coreMiddle}>
          <View style={styles.coreCenter} />
        </View>
      </Animated.View>

      <FlickerOverlay />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 320,
    height: 320,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fireball: {
    position: 'absolute',
  },
  hazeRing: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 3,
    borderColor: 'rgba(255, 120, 0, 0.4)',
  },
  emberContainer: {
    position: 'absolute',
    width: 0,
    height: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ember: {
    position: 'absolute',
    backgroundColor: '#FFB300',
  },
  core: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#FF2200',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF6600',
    shadowRadius: 30,
    shadowOpacity: 1,
  },
  coreMiddle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#FF8800',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coreCenter: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFEE00',
  },
  flicker: {
    backgroundColor: '#FF6600',
    borderRadius: 160,
  },
});
