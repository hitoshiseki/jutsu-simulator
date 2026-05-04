import React, { useCallback, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, ScrollView, StatusBar, ImageBackground, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { COLORS } from '@/theme/colors';
import { JUTSUS } from '@/data/jutsus';
import { JutsuId, RootStackParamList } from '@/types';
import { JutsuCard } from '@/components/JutsuCard';
import { SoundToggle } from '@/components/SoundToggle';
import { useLanguageContext } from '@/context/LanguageContext';
import { t } from '@/i18n/translations';
import { LanguageToggle } from '@/components/LanguageToggle';
import { Images } from '@/assets/images';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Home'>;
};

export const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const { language } = useLanguageContext();
  const lang = language ?? 'en';
  const strings = t(lang);

  const titleGlow = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(titleGlow, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(titleGlow, { toValue: 0, duration: 400, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  const titleScale = titleGlow.interpolate({ inputRange: [0, 1], outputRange: [1, 1.03] });

  const handleJutsuPress = useCallback(
    (id: JutsuId) => {
      navigation.navigate('JutsuSimulation', { jutsuId: id });
    },
    [navigation]
  );

  const gridJutsus = JUTSUS.slice(0, 4);
  const lastJutsu = JUTSUS[4];

  return (
    <ImageBackground source={Images.background} style={styles.bg} resizeMode="cover">
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Animated.Text style={[styles.headerTitle, { transform: [{ scale: titleScale }] }]}>JUTSU SIMULATOR</Animated.Text>
            <Text style={styles.headerSubtitle}>{strings.home.subtitle}</Text>
          </View>

          {/* Decorative row */}
          <View style={styles.decorRow}>
            <Text style={styles.decorText}>━━━ 木ノ葉隠れの里 ━━━</Text>
          </View>

          {/* 2-column grid */}
          <View style={styles.grid}>
            {gridJutsus.map((jutsu) => (
              <JutsuCard key={jutsu.id} jutsu={jutsu} onPress={handleJutsuPress} />
            ))}
          </View>

          {/* Last card full-width */}
          {lastJutsu && (
            <View style={styles.fullWidthRow}>
              <JutsuCard jutsu={lastJutsu} onPress={handleJutsuPress} fullWidth />
            </View>
          )}

          {/* Footer */}
          <View style={styles.footer}>
            <View style={styles.footerControls}>
              <SoundToggle />
              <LanguageToggle onPress={() => navigation.navigate('LanguageSelection')} />
            </View>
            <Text style={styles.footerText}>{strings.home.footerHint}</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  bg: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    paddingTop: 28,
    paddingBottom: 6,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 44,
    color: COLORS.text.primary,
    fontFamily: 'Knewave_400Regular',
    marginTop: 4,
    paddingHorizontal: 2,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.text.secondary,
    fontFamily: 'Knewave_400Regular',
    letterSpacing: 5,
    marginTop: 4,
    textTransform: 'uppercase',
  },
  divider: {
    width: 60,
    height: 2,
    backgroundColor: COLORS.text.accent,
    marginTop: 16,
    borderRadius: 1,
    opacity: 0.6,
  },
  decorRow: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  decorText: {
    fontSize: 11,
    color: COLORS.text.primary,
    letterSpacing: 2,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 6,
    justifyContent: 'center',
  },
  fullWidthRow: {
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  footer: {
    alignItems: 'center',
    paddingTop: 24,
    gap: 12,
  },
  footerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  footerText: {
    fontSize: 11,
    color: COLORS.text.muted,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
});
