import React, { useEffect, useMemo } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

type Props = {
    blowIntensity: Animated.Value;
};

type FlameParticle = {
    spread: number;
    rise: number;
    duration: number;
    delay: number;
    sizeStart: number;
    sizeEnd: number;
    driftA: number;
    driftB: number;
    color: string;
    progress: Animated.Value;
};

const PARTICLE_COUNT = 120;
const FLAME_PALETTE = ['#2B0A00', '#8E1B00', '#D73600', '#FF5A00', '#FF8A00', '#FFC247'];

const randomBetween = (min: number, max: number) => min + Math.random() * (max - min);

const createParticles = (): FlameParticle[] => {
    return Array.from({ length: PARTICLE_COUNT }, (_, i) => {
        const edgeBias = (i % 3) - 1;
        return {
            spread: randomBetween(-34, 34) + edgeBias * 5,
            rise: randomBetween(160, 320),
            duration: randomBetween(780, 1220),
            delay: randomBetween(0, 720),
            sizeStart: randomBetween(6, 14),
            sizeEnd: randomBetween(18, 42),
            driftA: randomBetween(6, 24) * (i % 2 === 0 ? 1 : -1),
            driftB: randomBetween(4, 18) * (i % 3 === 0 ? -1 : 1),
            color: FLAME_PALETTE[i % FLAME_PALETTE.length],
            progress: new Animated.Value(0),
        };
    });
};

const KatonFlameParticles: React.FC<Props> = ({ blowIntensity }) => {
    const particles = useMemo(createParticles, []);

    useEffect(() => {
        const loops = particles.map((particle) => {
            const loop = Animated.loop(
                Animated.sequence([
                    Animated.timing(particle.progress, { toValue: 0, duration: 0, useNativeDriver: true }),
                    Animated.delay(particle.delay),
                    Animated.timing(particle.progress, {
                        toValue: 1,
                        duration: particle.duration,
                        easing: Easing.out(Easing.cubic),
                        useNativeDriver: true,
                    }),
                ])
            );
            loop.start();
            return loop;
        });

        return () => {
            loops.forEach((loop) => loop.stop());
        };
    }, [particles]);

    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <Animated.View
                style={[
                    styles.coreFlame,
                    {
                        opacity: Animated.multiply(
                            blowIntensity,
                            blowIntensity.interpolate({
                                inputRange: [0, 0.25, 1],
                                outputRange: [0, 0.5, 0.95],
                            })
                        ),
                        transform: [
                            {
                                scaleY: blowIntensity.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [0.8, 1.35],
                                }),
                            },
                            {
                                scaleX: blowIntensity.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [0.75, 1.05],
                                }),
                            },
                        ],
                    },
                ]}
            />

            <Animated.View
                style={[
                    styles.innerCore,
                    {
                        opacity: blowIntensity.interpolate({
                            inputRange: [0, 0.2, 1],
                            outputRange: [0, 0.6, 1],
                        }),
                        transform: [
                            {
                                scaleY: blowIntensity.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [0.6, 1.25],
                                }),
                            },
                        ],
                    },
                ]}
            />

            {particles.map((particle, index) => {
                const alphaOverLife = particle.progress.interpolate({
                    inputRange: [0, 0.12, 0.45, 0.82, 1],
                    outputRange: [0, 0.5, 1, 0.55, 0],
                });

                const effectiveOpacity = Animated.multiply(blowIntensity, alphaOverLife);

                const turbulenceA = particle.progress.interpolate({
                    inputRange: [0, 0.2, 0.5, 0.8, 1],
                    outputRange: [0, particle.driftA, -particle.driftA * 0.7, particle.driftA * 0.35, 0],
                });

                const turbulenceB = particle.progress.interpolate({
                    inputRange: [0, 0.3, 0.65, 1],
                    outputRange: [0, particle.driftB, -particle.driftB, 0],
                });

                const growthScale = particle.progress.interpolate({
                    inputRange: [0, 0.25, 0.7, 1],
                    outputRange: [
                        particle.sizeStart / particle.sizeEnd,
                        0.7,
                        1,
                        0.75,
                    ],
                });

                const anisotropicScaleX = particle.progress.interpolate({
                    inputRange: [0, 0.35, 1],
                    outputRange: [0.55, 1, 0.82],
                });

                const anisotropicScaleY = particle.progress.interpolate({
                    inputRange: [0, 0.2, 0.65, 1],
                    outputRange: [0.4, 1.05, 1.35, 0.75],
                });

                const scaleX = Animated.multiply(growthScale, anisotropicScaleX);
                const scaleY = Animated.multiply(growthScale, anisotropicScaleY);

                return (
                    <Animated.View
                        key={index}
                        style={[
                            styles.particle,
                            {
                                width: particle.sizeEnd,
                                height: particle.sizeEnd,
                                left: particle.spread - particle.sizeEnd / 2,
                                top: -particle.sizeEnd / 2,
                                borderRadius: particle.sizeEnd,
                                backgroundColor: particle.color,
                                opacity: effectiveOpacity,
                                transform: [
                                    {
                                        translateX: Animated.add(turbulenceA, turbulenceB),
                                    },
                                    {
                                        translateY: particle.progress.interpolate({
                                            inputRange: [0, 0.25, 0.65, 1],
                                            outputRange: [0, -particle.rise * 0.4, -particle.rise, -particle.rise * 0.78],
                                        }),
                                    },
                                    {
                                        scaleX,
                                    },
                                    {
                                        scaleY,
                                    },
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
    coreFlame: {
        position: 'absolute',
        left: -22,
        top: -54,
        width: 44,
        height: 86,
        borderRadius: 28,
        backgroundColor: 'rgba(255, 92, 0, 0.45)',
        shadowColor: '#FF4A00',
        shadowRadius: 26,
        shadowOpacity: 0.95,
    },
    innerCore: {
        position: 'absolute',
        left: -11,
        top: -38,
        width: 22,
        height: 58,
        borderRadius: 14,
        backgroundColor: 'rgba(255, 184, 88, 0.8)',
        shadowColor: '#FFC675',
        shadowRadius: 14,
        shadowOpacity: 0.9,
    },
    particle: {
        position: 'absolute',
    },
});

export default KatonFlameParticles;