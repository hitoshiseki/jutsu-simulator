import React, { useEffect, useMemo } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

type Props = {
    blowIntensity: Animated.Value;
};

type FlameParticle = {
    layer: 'core' | 'mid' | 'smoke';
    riseMax: number;
    coneAngle: number;
    sideSign: number;
    duration: number;
    delay: number;
    widthPx: number;
    color: string;
    progress: Animated.Value;
};

const CORE_COUNT = 20;
const MID_COUNT = 50;
const SMOKE_COUNT = 30;

const AVG_CORE_DURATION = 600;
const AVG_MID_DURATION = 750;
const AVG_SMOKE_DURATION = 950;

const CORE_PALETTE = ['#FFFFFF', '#FFFDE0', '#FFF176', '#FFE033'];
const MID_PALETTE = ['#FF8C00', '#FF5500', '#FF3300', '#FF6A00', '#FFAA00'];
const SMOKE_PALETTE = ['#CC1100', '#8E1B00', '#4A0A00', '#2B0A00'];

const rand = (min: number, max: number) => min + Math.random() * (max - min);

const createParticles = (): FlameParticle[] => {
    const particles: FlameParticle[] = [];

    for (let i = 0; i < CORE_COUNT; i++) {
        particles.push({
            layer: 'core',
            riseMax: rand(400, 600),
            coneAngle: rand(0.03, 0.07),
            sideSign: i % 2 === 0 ? 1 : -1,
            duration: rand(500, 700),
            delay: (i / CORE_COUNT) * AVG_CORE_DURATION,
            widthPx: rand(4, 8),
            color: CORE_PALETTE[i % CORE_PALETTE.length],
            progress: new Animated.Value(0),
        });
    }

    for (let i = 0; i < MID_COUNT; i++) {
        particles.push({
            layer: 'mid',
            riseMax: rand(250, 480),
            coneAngle: rand(0.07, 0.16),
            sideSign: i % 2 === 0 ? 1 : -1,
            duration: rand(600, 900),
            delay: (i / MID_COUNT) * AVG_MID_DURATION,
            widthPx: rand(8, 18),
            color: MID_PALETTE[i % MID_PALETTE.length],
            progress: new Animated.Value(0),
        });
    }

    for (let i = 0; i < SMOKE_COUNT; i++) {
        particles.push({
            layer: 'smoke',
            riseMax: rand(150, 320),
            coneAngle: rand(0.12, 0.22),
            sideSign: i % 2 === 0 ? 1 : -1,
            duration: rand(800, 1100),
            delay: (i / SMOKE_COUNT) * AVG_SMOKE_DURATION,
            widthPx: rand(14, 28),
            color: SMOKE_PALETTE[i % SMOKE_PALETTE.length],
            progress: new Animated.Value(0),
        });
    }

    return particles;
};

const KatonFlameParticles: React.FC<Props> = ({ blowIntensity }) => {
    const particles = useMemo(createParticles, []);

    useEffect(() => {
        const loops = particles.map((p) => {
            const loop = Animated.loop(
                Animated.sequence([
                    Animated.timing(p.progress, { toValue: 0, duration: 0, useNativeDriver: true }),
                    Animated.delay(p.delay),
                    Animated.timing(p.progress, {
                        toValue: 1,
                        duration: p.duration,
                        easing: Easing.bezier(0.25, 0.1, 0.7, 1.0),
                        useNativeDriver: true,
                    }),
                ])
            );
            loop.start();
            return loop;
        });

        return () => { loops.forEach((l) => l.stop()); };
    }, [particles]);

    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {/* Outer nozzle cone */}
            <Animated.View
                style={[
                    styles.nozzleCone,
                    {
                        opacity: blowIntensity.interpolate({
                            inputRange: [0, 0.2, 1],
                            outputRange: [0, 0.4, 0.85],
                        }),
                        transform: [
                            {
                                scaleX: blowIntensity.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [0.5, 1.2],
                                }),
                            },
                            {
                                scaleY: blowIntensity.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [0.6, 1.4],
                                }),
                            },
                        ],
                    },
                ]}
                pointerEvents="none"
            />

            {/* White-hot tip */}
            <Animated.View
                style={[
                    styles.nozzleTip,
                    {
                        opacity: blowIntensity.interpolate({
                            inputRange: [0, 0.15, 1],
                            outputRange: [0, 0.7, 1],
                        }),
                    },
                ]}
                pointerEvents="none"
            />

            {particles.map((p, index) => {
                const rise = p.riseMax;
                const cone = p.coneAngle;
                const sign = p.sideSign;

                const alphaOverLife =
                    p.layer === 'core'
                        ? p.progress.interpolate({
                              inputRange: [0, 0.05, 0.4, 0.85, 1],
                              outputRange: [0, 0.9, 1.0, 0.7, 0],
                          })
                        : p.layer === 'mid'
                        ? p.progress.interpolate({
                              inputRange: [0, 0.1, 0.45, 0.8, 1],
                              outputRange: [0, 0.6, 0.95, 0.5, 0],
                          })
                        : p.progress.interpolate({
                              inputRange: [0, 0.15, 0.5, 0.75, 1],
                              outputRange: [0, 0.35, 0.65, 0.3, 0],
                          });

                const effectiveOpacity = Animated.multiply(blowIntensity, alphaOverLife);

                // Monotonic forward travel — no bounce
                const translateY = p.progress.interpolate({
                    inputRange: [0, 0.08, 0.5, 1.0],
                    outputRange: [0, -rise * 0.15, -rise * 0.75, -rise],
                });

                // Cone spread proportional to Y traveled — no oscillation
                const translateX = p.progress.interpolate({
                    inputRange: [0, 0.08, 0.5, 1.0],
                    outputRange: [
                        0,
                        Math.tan(cone) * rise * 0.15 * sign,
                        Math.tan(cone) * rise * 0.75 * sign,
                        Math.tan(cone) * rise * sign,
                    ],
                });

                // Elongated oval: tall thin streak on launch → flat smoke puff at end
                const scaleX = p.progress.interpolate({
                    inputRange: [0, 0.15, 0.6, 1],
                    outputRange: [0, 0.3, 0.6, 0.45],
                });
                const scaleY = p.progress.interpolate({
                    inputRange: [0, 0.1, 0.55, 1],
                    outputRange: [0, 2.8, 1.8, 0.6],
                });

                const w = p.widthPx;

                return (
                    <Animated.View
                        key={index}
                        style={[
                            styles.particle,
                            {
                                width: w,
                                height: w,
                                left: -w / 2,
                                top: -w / 2,
                                borderRadius: w,
                                backgroundColor: p.color,
                                opacity: effectiveOpacity,
                                transform: [
                                    { translateX },
                                    { translateY },
                                    { scaleX },
                                    { scaleY },
                                ],
                            },
                        ]}
                        pointerEvents="none"
                    />
                );
            })}
        </View>
    );
};

const styles = StyleSheet.create({
    nozzleCone: {
        position: 'absolute',
        left: -6,
        top: -60,
        width: 12,
        height: 60,
        borderRadius: 6,
        backgroundColor: 'rgba(255, 180, 50, 0.6)',
    },
    nozzleTip: {
        position: 'absolute',
        left: -3,
        top: -18,
        width: 6,
        height: 18,
        borderRadius: 4,
        backgroundColor: 'rgba(255, 255, 220, 0.95)',
    },
    particle: {
        position: 'absolute',
    },
});

export default KatonFlameParticles;
