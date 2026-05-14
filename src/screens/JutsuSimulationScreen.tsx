import React, { useEffect, useCallback, useRef, useState } from 'react';
import { StyleSheet, Text, View, Pressable, StatusBar, Animated, Easing, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { COLORS } from '@/theme/colors';
import { RootStackParamList, JutsuId } from '@/types';
import { useHaptics } from '@/hooks/useHaptics';
import { SoundToggle } from '@/components/SoundToggle';
import { RasenganTutorial, checkRasenganTutorialSeen } from '@/components/RasenganTutorial';
import { ChidoriTutorial, checkChidoriTutorialSeen } from '@/components/ChidoriTutorial';
import { FuutonRasenshurikenTutorial, checkFuutonRasenshurikenTutorialSeen } from '@/components/FuutonRasenshurikenTutorial';
import { KatonTutorial, checkKatonTutorialSeen } from '@/components/KatonTutorial';
import { RasenganAnimation, type RasenganAnimationRef } from '@/animations/RasenganAnimation';
import { ChidoriAnimation, type ChidoriAnimationRef } from '@/animations/ChidoriAnimation';
import { FuutonRasenshurikenAnimation, type FuutonRasenshurikenAnimationRef } from '@/animations/FuutonRasenshurikenAnimation';
import { SharinganSkiaAnimation } from '@/animations/SharinganSkiaAnimation';
import { KatonAnimation, type KatonAnimationRef } from '@/animations/KatonAnimation';
import { useLanguageContext } from '@/context/LanguageContext';
import { useMonetization } from '@/context/MonetizationContext';
import { t } from '@/i18n/translations';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'JutsuSimulation'>;
  route: RouteProp<RootStackParamList, 'JutsuSimulation'>;
};

const BG_COLORS: Record<JutsuId, string> = {
  spiralOrb: COLORS.jutsu.spiralOrb.background,
  lightningPalm: COLORS.jutsu.lightningPalm.background,
  windShuriken: COLORS.jutsu.windShuriken.background,
  crimsonEye: COLORS.jutsu.crimsonEye.background,
  fireBreath: COLORS.jutsu.fireBreath.background,
};

const JUTSU_COLORS: Record<JutsuId, { primary: string }> = {
  spiralOrb: { primary: COLORS.jutsu.spiralOrb.primary },
  lightningPalm: { primary: COLORS.jutsu.lightningPalm.primary },
  windShuriken: { primary: COLORS.jutsu.windShuriken.primary },
  crimsonEye: { primary: COLORS.jutsu.crimsonEye.primary },
  fireBreath: { primary: COLORS.jutsu.fireBreath.primary },
};

const HAPTIC_FNS: Record<JutsuId, keyof ReturnType<typeof useHaptics>> = {
  spiralOrb: 'impactMedium',
  lightningPalm: 'chidoriPulse',
  windShuriken: 'impactHeavy',
  crimsonEye: 'impactLight',
  fireBreath: 'notificationSuccess',
};

type AnimRef = React.RefObject<RasenganAnimationRef | ChidoriAnimationRef | FuutonRasenshurikenAnimationRef | KatonAnimationRef | null>;

function JutsuAnimationComponent ({ jutsuId, onPowerStart, onPowerReset, animRef, lang }: {
  jutsuId: JutsuId;
  onPowerStart?: () => void;
  onPowerReset?: () => void;
  animRef: AnimRef;
  lang: 'en' | 'pt';
}) {
  switch (jutsuId) {
    case 'spiralOrb': return <RasenganAnimation ref={animRef as React.RefObject<RasenganAnimationRef>} lang={lang} onPowerStart={onPowerStart} onPowerReset={onPowerReset} />;
    case 'lightningPalm': return <ChidoriAnimation ref={animRef as React.RefObject<ChidoriAnimationRef>} lang={lang} onPowerStart={onPowerStart} onPowerReset={onPowerReset} />;
    case 'windShuriken': return <FuutonRasenshurikenAnimation ref={animRef as React.RefObject<FuutonRasenshurikenAnimationRef>} lang={lang} onPowerStart={onPowerStart} onPowerReset={onPowerReset} />;
    case 'crimsonEye': return <SharinganSkiaAnimation lang={lang} />;
    case 'fireBreath': return <KatonAnimation ref={animRef as React.RefObject<KatonAnimationRef>} lang={lang} onPowerStart={onPowerStart} onPowerReset={onPowerReset} />;
  }
}

// Jutsus with custom full-screen interactions (no activate button needed)
const CUSTOM_INTERACTION_JUTSUS: JutsuId[] = ['spiralOrb', 'lightningPalm', 'windShuriken', 'crimsonEye', 'fireBreath'];
// Jutsus with a first-run tutorial
const TUTORIAL_JUTSUS: JutsuId[] = ['spiralOrb', 'lightningPalm', 'windShuriken', 'fireBreath'];

export const JutsuSimulationScreen: React.FC<Props> = ({ navigation, route }) => {
  const { language } = useLanguageContext();
  const { showInterstitial, consumeTrialUse, isInterstitialBusy } = useMonetization();
  const lang: 'en' | 'pt' = language ?? 'en';
  const strings = t(lang).tutorial;

  const { jutsuId } = route.params;
  const haptics = useHaptics();

  const nameOpacity = useRef(new Animated.Value(0)).current;
  const nameTranslateY = useRef(new Animated.Value(-10)).current;
  const activateScale = useRef(new Animated.Value(1)).current;
  const topBarOpacity = useRef(new Animated.Value(1)).current;
  const animRef = useRef<RasenganAnimationRef | ChidoriAnimationRef | FuutonRasenshurikenAnimationRef | KatonAnimationRef | null>(null);

  const [showTutorial, setShowTutorial] = useState(false);

  // Clean up sounds/vibrations/loops before the screen is removed
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', () => {
      animRef.current?.cleanup();
    });
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    consumeTrialUse(jutsuId);
    showInterstitial();
  }, [jutsuId, consumeTrialUse, showInterstitial]);

  // Show tutorial on first entry for supported jutsus
  useEffect(() => {
    if (!TUTORIAL_JUTSUS.includes(jutsuId)) return;
    const check =
      jutsuId === 'spiralOrb' ? checkRasenganTutorialSeen :
        jutsuId === 'lightningPalm' ? checkChidoriTutorialSeen :
          jutsuId === 'windShuriken' ? checkFuutonRasenshurikenTutorialSeen :
            checkKatonTutorialSeen;
    check().then(seen => {
      if (!seen) setShowTutorial(true);
    });
  }, [jutsuId]);

  const handlePowerStart = useCallback(() => {
    Animated.parallel([
      Animated.timing(nameOpacity, { toValue: 0, duration: 300, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(topBarOpacity, { toValue: 0, duration: 300, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();
  }, [nameOpacity, topBarOpacity]);

  const handlePowerReset = useCallback(() => {
    Animated.parallel([
      Animated.timing(nameOpacity, { toValue: 1, duration: 400, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(topBarOpacity, { toValue: 1, duration: 400, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();
  }, [nameOpacity, topBarOpacity]);

  const hasCustomInteraction = CUSTOM_INTERACTION_JUTSUS.includes(jutsuId);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(nameOpacity, { toValue: 1, duration: 500, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(nameTranslateY, { toValue: 0, duration: 500, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();

    const hapticFn = haptics[HAPTIC_FNS[jutsuId]];
    if (typeof hapticFn === 'function') {
      (hapticFn as () => Promise<void>)();
    }
  }, [jutsuId]);

  const handleActivate = useCallback(async () => {
    Animated.sequence([
      Animated.spring(activateScale, { toValue: 0.92, damping: 10, useNativeDriver: true }),
      Animated.spring(activateScale, { toValue: 1, damping: 8, useNativeDriver: true }),
    ]).start();

    const hapticFn = haptics[HAPTIC_FNS[jutsuId]];
    if (typeof hapticFn === 'function') {
      await (hapticFn as () => Promise<void>)();
    }
  }, [jutsuId, haptics]);

  const colors = JUTSU_COLORS[jutsuId];
  const bgColor = BG_COLORS[jutsuId];

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <StatusBar barStyle="light-content" />

      {/* Full-screen animation layer */}
      {!isInterstitialBusy && (
        <View style={styles.animationFill}>
          <JutsuAnimationComponent
            jutsuId={jutsuId}
            animRef={animRef}
            lang={lang}
            onPowerStart={handlePowerStart}
            onPowerReset={handlePowerReset}
          />
        </View>
      )}

      {isInterstitialBusy && (
        <View style={styles.loadingOverlay} pointerEvents="auto">
          <ActivityIndicator size="large" color={JUTSU_COLORS[jutsuId].primary} />
          <Text style={styles.loadingText}>{t(lang).simulation.loadingAd}</Text>
        </View>
      )}

      {/* Floating UI overlay */}
      <SafeAreaView style={styles.overlay} pointerEvents="box-none">
        {/* Top bar */}
        <Animated.View style={[styles.topBar, { opacity: topBarOpacity }]} pointerEvents="box-none">
          <Pressable
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Text style={styles.backLabel}>{strings.back}</Text>
          </Pressable>
          <View style={styles.topBarRight}>
            {TUTORIAL_JUTSUS.includes(jutsuId) && (
              <Pressable onPress={() => setShowTutorial(true)} style={styles.tutorialButton}>
                <Text style={styles.tutorialButtonText}>?</Text>
              </Pressable>
            )}
            <SoundToggle />
          </View>
        </Animated.View>

        {/* Jutsu name — subtle top overlay */}
        <Animated.View
          style={[styles.nameOverlay, { opacity: nameOpacity, transform: [{ translateY: nameTranslateY }] }]}
          pointerEvents="none"
        >
          <Text style={[styles.jutsuName, { color: colors.primary }]}>{t(lang).jutsus[jutsuId].name}</Text>
          <View style={[styles.titleLine, { backgroundColor: colors.primary }]} />
        </Animated.View>

        {/* Activate button — only for jutsus without custom interaction */}
        {!hasCustomInteraction && (
          <View style={styles.bottomOverlay} pointerEvents="box-none">
            <Pressable onPress={handleActivate}>
              <Animated.View
                style={[styles.activateButton, { borderColor: colors.primary, transform: [{ scale: activateScale }] }]}
              >
                <Text style={[styles.activateText, { color: colors.primary }]}>⚡ ACTIVATE</Text>
              </Animated.View>
            </Pressable>
          </View>
        )}
      </SafeAreaView>

      {/* First-time tutorial overlays */}
      {jutsuId === 'spiralOrb' && (
        <RasenganTutorial visible={showTutorial} onDismiss={() => setShowTutorial(false)} />
      )}
      {jutsuId === 'lightningPalm' && (
        <ChidoriTutorial visible={showTutorial} onDismiss={() => setShowTutorial(false)} />
      )}
      {jutsuId === 'windShuriken' && (
        <FuutonRasenshurikenTutorial visible={showTutorial} onDismiss={() => setShowTutorial(false)} />
      )}
      {jutsuId === 'fireBreath' && (
        <KatonTutorial visible={showTutorial} onDismiss={() => setShowTutorial(false)} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  animationFill: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  backArrow: { fontSize: 16, color: '#FFFFFF' },
  backLabel: { fontSize: 12, color: COLORS.text.accent, letterSpacing: 1, fontWeight: '600' },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tutorialButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tutorialButtonText: { fontSize: 16, color: '#FFFFFF', fontWeight: '700', lineHeight: 20 },
  nameOverlay: {
    alignItems: 'center',
    paddingTop: 4,
    gap: 4,
  },
  jutsuName: { fontSize: 28, fontWeight: '800', letterSpacing: 2 },
  jutsuKanji: { fontSize: 16, color: COLORS.text.secondary, letterSpacing: 6 },
  titleLine: { width: 50, height: 2, borderRadius: 1, marginTop: 6, opacity: 0.7 },
  bottomOverlay: {
    position: 'absolute',
    bottom: 48,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  activateButton: {
    paddingHorizontal: 36,
    paddingVertical: 14,
    borderRadius: 30,
    borderWidth: 2,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  activateText: { fontSize: 14, fontWeight: '800', letterSpacing: 3 },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    backgroundColor: 'rgba(0,0,0,0.85)',
    zIndex: 10,
  },
  loadingText: {
    color: COLORS.text.secondary,
    fontSize: 13,
    letterSpacing: 2,
    fontWeight: '600',
  },
});
