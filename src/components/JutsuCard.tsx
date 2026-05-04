import React, { useEffect, useRef, useCallback } from 'react';
import { StyleSheet, Text, View, Pressable, Dimensions, Animated } from 'react-native';
import { COLORS } from '@/theme/colors';
import { Jutsu, JutsuId } from '@/types';
import { Images } from '@/assets/images';
import { SharinganAnimation } from '@/animations/SharinganAnimation';
import { KatonAnimation } from '@/animations/KatonAnimation';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_MARGIN = 12;
const CARD_SIZE = (SCREEN_WIDTH - CARD_MARGIN * 3) / 2;
const PREVIEW_SIZE = 80;

const JUTSU_PREVIEW_IMAGE: Partial<Record<JutsuId, number>> = {
  rasengan: Images.rasengan,
  chidori: Images.chidori,
  fuutonRasenshuriken: Images.fuutonRasenshuriken,
};

const ANIMATION_NATURAL_SIZE: Partial<Record<JutsuId, number>> = {
  sharingan: 320,
  katon: 320,
};

const JUTSU_COLORS: Record<JutsuId, { primary: string; glow: string }> = {
  rasengan: { primary: COLORS.jutsu.rasengan.primary, glow: COLORS.jutsu.rasengan.glow },
  chidori: { primary: COLORS.jutsu.chidori.primary, glow: COLORS.jutsu.chidori.glow },
  fuutonRasenshuriken: { primary: COLORS.jutsu.fuutonRasenshuriken.primary, glow: COLORS.jutsu.fuutonRasenshuriken.glow },
  sharingan: { primary: COLORS.jutsu.sharingan.primary, glow: COLORS.jutsu.sharingan.glow },
  katon: { primary: COLORS.jutsu.katon.primary, glow: COLORS.jutsu.katon.glow },
};

interface JutsuCardProps {
  jutsu: Jutsu;
  onPress: (id: JutsuId) => void;
  fullWidth?: boolean;
}

export const JutsuCard: React.FC<JutsuCardProps> = ({ jutsu, onPress, fullWidth = false }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0.3)).current;

  const colors = JUTSU_COLORS[jutsu.id];

  const handlePressIn = useCallback(() => {
    Animated.spring(scale, { toValue: 0.94, damping: 12, useNativeDriver: true }).start();
  }, []);

  const handlePressOut = useCallback(() => {
    Animated.spring(scale, { toValue: 1, damping: 10, useNativeDriver: true }).start();
  }, []);

  const cardWidth = fullWidth ? SCREEN_WIDTH - CARD_MARGIN * 2 : CARD_SIZE;

  return (
    <Pressable
      onPress={() => onPress(jutsu.id)}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={{ width: cardWidth, margin: CARD_MARGIN / 2 }}
    >
      <Animated.View style={[styles.card, { width: cardWidth, transform: [{ scale }] }]}>
        <Animated.View
          style={[styles.glow, { backgroundColor: colors.glow, opacity: glowOpacity }]}
        />
        <View style={[styles.border, { borderColor: colors.primary }]} />

        <View style={styles.content}>
          <View style={styles.previewCircle}>
            {(() => {
              const previewImage = JUTSU_PREVIEW_IMAGE[jutsu.id];
              if (previewImage !== undefined) {
                return (
                  <Animated.Image
                    source={previewImage}
                    style={styles.previewImage}
                    resizeMode="cover"
                  />
                );
              }
              const natural = ANIMATION_NATURAL_SIZE[jutsu.id] ?? 300;
              const margin = (PREVIEW_SIZE - natural) / 2;
              const AnimComp =

                jutsu.id === 'sharingan' ? SharinganAnimation :
                  KatonAnimation;
              return (
                <View style={{ marginTop: margin, marginLeft: margin }} pointerEvents="none">
                  <AnimComp />
                </View>
              );
            })()}
          </View>
          <Text style={[styles.name, { color: colors.primary }]}>{jutsu.name?.toUpperCase()}</Text>
          <Text style={styles.kanji}>{jutsu.kanji}</Text>
          <Text style={styles.rank}>{jutsu.rank}</Text>
          <Text style={styles.user} numberOfLines={1}>{jutsu.user}</Text>
        </View>

        <View style={[styles.cornerTL, { backgroundColor: colors.primary }]} />
        <View style={[styles.cornerBR, { backgroundColor: colors.primary }]} />
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    height: CARD_SIZE * 1.05,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  glow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
  },
  border: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
    borderWidth: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    gap: 4,
  },
  previewCircle: {
    width: PREVIEW_SIZE,
    height: PREVIEW_SIZE,
    borderRadius: PREVIEW_SIZE / 2,
    overflow: 'hidden',
    marginBottom: 6,
  },
  previewImage: {
    width: PREVIEW_SIZE,
    height: PREVIEW_SIZE,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  kanji: {
    fontSize: 13,
    color: COLORS.text.secondary,
    letterSpacing: 2,
  },
  rank: {
    fontSize: 10,
    color: COLORS.text.muted,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  user: {
    fontSize: 10,
    color: COLORS.text.muted,
    marginTop: 2,
  },
  cornerTL: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 14,
    height: 3,
    borderBottomRightRadius: 3,
  },
  cornerBR: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 3,
    borderTopLeftRadius: 3,
  },
});
