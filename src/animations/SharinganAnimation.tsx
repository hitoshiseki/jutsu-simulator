import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Animated,
  Easing,
  Pressable,
  Text,
  TouchableOpacity,
} from 'react-native';
import {
  Canvas,
  Circle,
  Path as SkPath,
  Group,
  Skia,
  PathOp,
} from '@shopify/react-native-skia';
import {
  useSharedValue,
  withRepeat,
  withTiming,
  withSequence,
  useDerivedValue,
  cancelAnimation,
  Easing as REasing,
} from 'react-native-reanimated';
import { useHaptics } from '@/hooks/useHaptics';
import { t } from '@/i18n/translations';

// ─── Layout constants ─────────────────────────────────────────────────────────
const EYE = 220;
const C = EYE / 2;
const SCLERA_R = C - 2;
const IRIS_R = C * 0.74;      // 81.4 px
const PUPIL_R = C * 0.28;     // 30.8 px

const DEG120 = (Math.PI * 2) / 3;
const DEG240 = (Math.PI * 4) / 3;

// ─── Tomoe geometry ───────────────────────────────────────────────────────────
//
// Orientation: head (round ball) sits at INNER orbit — close to pupil.
//              tail extends OUTWARD toward iris edge, tapering to a point.
//
// In local coords (center = eye center, -Y = outward):
//   head circle : center (0, -INNER_R), radius HEAD_R
//   tail        : asymmetric teardrop from head top to TIP_Y
//                 curves to the LEFT → counterclockwise pinwheel appearance
//
// PathOp.Union joins them into a single smooth comma / tomoe shape.

const INNER_R = 48;   // head centre — 48 px from eye centre
const HEAD_R = 16;   // head ball radius (dominant round "gota")
const TIP_X = -16;   // tail tip ball — offset left for CCW hook
const TIP_Y = -76;
const TIP_R = 3.5;   // small rounded tip (NOT pointed)

// Body bezier: starts inside upper-left of head, sweeps out to tip area,
// returns inside upper-right of head → wedge that bridges head and tip.
// Union(head, body, tip) yields a proper tomoe with TWO rounded ends.
const BODY_SVG =
  `M -10,-58` +
  ` C -24,-64 -24,-74 ${TIP_X},${TIP_Y}` + // outer arc to tip
  ` C -10,-72 -2,-64 6,-56` +              // inner arc back into head
  ' Z';

function buildTomoePath () {
  const head = Skia.Path.Make();
  head.addCircle(0, -INNER_R, HEAD_R);

  const tip = Skia.Path.Make();
  tip.addCircle(TIP_X, TIP_Y, TIP_R);

  const body = Skia.Path.MakeFromSVGString(BODY_SVG);
  if (!body) return head;

  const headPlusBody = Skia.Path.MakeFromOp(head, body, PathOp.Union) ?? head;
  return Skia.Path.MakeFromOp(headPlusBody, tip, PathOp.Union) ?? headPlusBody;
}

// ─── Mangekyou types ──────────────────────────────────────────────────────────
type MangekyouType = 'sasuke' | 'itachi' | 'madara' | 'obito';
// Phases: 0=1-tomoe | 1=3-tomoe | 2=selector | 3=active-mangekyou
type Phase = 0 | 1 | 2 | 3;

// One blade per variant (at 12-o'clock, pointing toward -Y, centered at 0,0).
// Three blades at 0°/120°/240° form the full pattern.
const BLADES: Record<MangekyouType, string> = {
  // Sasuke: narrow curved blade, pointed tip
  sasuke: 'M 0,-24 C -5,-36 -10,-53 -3,-64 C 0,-70 5,-68 8,-60 C 12,-50 8,-34 0,-24 Z',
  // Itachi: wide fan / petal
  itachi: 'M -6,-20 Q -28,-27 -26,-52 Q -14,-70 0,-67 Q 14,-70 26,-52 Q 28,-27 6,-20 Z',
  // Madara: hooked blade (also has 3 extra outer circles added below)
  madara: 'M 0,-24 C -14,-34 -24,-58 -12,-70 C -5,-76 6,-70 10,-58 C 16,-44 8,-32 0,-24 Z',
  // Obito: wide asymmetric pinwheel sweep
  obito: 'M 0,-18 C -36,-24 -60,-34 -62,-57 C -58,-70 -34,-62 -12,-46 C -2,-36 2,-24 0,-18 Z',
};

// Accent ring colors per mangekyou type
const ACCENT: Record<MangekyouType, string> = {
  sasuke: '#FF5500',
  itachi: '#FF1111',
  madara: '#CC00EE',
  obito: '#FF3300',
};

// ─── Colors ───────────────────────────────────────────────────────────────────
const DARK = '#080000';
const SCLERA_C = '#CC0000';
const IRIS_C = '#7A0000';
const IRIS_RING = '#FF2200';

// ─── RippleRing ───────────────────────────────────────────────────────────────
const RippleRing: React.FC<{ size: number; delay: number }> = ({ size, delay }) => {
  const scale = useRef(new Animated.Value(0.6)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.loop(
        Animated.parallel([
          Animated.timing(scale, {
            toValue: 1.5,
            duration: 1800,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(opacity, { toValue: 0.5, duration: 200, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 0, duration: 1600, useNativeDriver: true }),
          ]),
        ]),
      ).start();
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

// ─── Main component ───────────────────────────────────────────────────────────
type Props = { lang?: 'en' | 'pt' };

export const SharinganAnimation: React.FC<Props> = ({ lang = 'en' }) => {
  const [phase, setPhase] = useState<Phase>(0);
  const [mngType, setMngType] = useState<MangekyouType>('sasuke');
  const haptics = useHaptics();
  const strings = t(lang);

  // Build the tomoe path once (union of two circles = comma shape)
  const tomoePath = useMemo(() => buildTomoePath(), []);

  // Reanimated values
  const rotation = useSharedValue(0);
  const pupilScale = useSharedValue(1);
  const tomoe1Op = useSharedValue(1);
  const tomoe2Op = useSharedValue(0);
  const tomoe3Op = useSharedValue(0);
  const mngOp = useSharedValue(0);

  // RN Animated (outer glow)
  const outerGlowOp = useRef(new Animated.Value(0.5)).current;

  // Derived transforms for Skia canvas
  const tomoeTransform = useDerivedValue(() => [
    { translateX: C },
    { translateY: C },
    { rotate: rotation.value },
  ]);

  const pupilTransform = useDerivedValue(() => [
    { translateX: C },
    { translateY: C },
    { scale: pupilScale.value },
  ]);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(Math.PI * 2, { duration: 3000, easing: REasing.linear }),
      -1,
      false,
    );
    pupilScale.value = withRepeat(
      withSequence(withTiming(1.12, { duration: 800 }), withTiming(0.9, { duration: 800 })),
      -1,
    );
    Animated.loop(
      Animated.sequence([
        Animated.timing(outerGlowOp, { toValue: 0.8, duration: 900, useNativeDriver: true }),
        Animated.timing(outerGlowOp, { toValue: 0.3, duration: 900, useNativeDriver: true }),
      ]),
    ).start();
    return () => {
      cancelAnimation(rotation);
      cancelAnimation(pupilScale);
    };
  }, []);

  const onPress = useCallback(() => {
    setPhase((prev) => {
      if (prev === 2) return prev; // selector active — ignore background tap

      if (prev === 3) {
        tomoe1Op.value = withTiming(1, { duration: 240 });
        tomoe2Op.value = withTiming(0, { duration: 240 });
        tomoe3Op.value = withTiming(0, { duration: 240 });
        mngOp.value = withTiming(0, { duration: 240 });
        haptics.impactLight();
        return 0;
      }

      const next = (prev + 1) as Phase;

      if (next === 1) {
        tomoe2Op.value = withTiming(1, { duration: 300 });
        tomoe3Op.value = withTiming(1, { duration: 300 });
        haptics.impactMedium();
      }
      if (next === 2) {
        haptics.impactHeavy();
      }

      return next;
    });
  }, [haptics, tomoe1Op, tomoe2Op, tomoe3Op, mngOp]);

  const selectMangekyou = useCallback(
    (type: MangekyouType) => {
      setMngType(type);
      setPhase(3);
      tomoe1Op.value = withTiming(0, { duration: 260 });
      tomoe2Op.value = withTiming(0, { duration: 260 });
      tomoe3Op.value = withTiming(0, { duration: 260 });
      mngOp.value = withTiming(1, { duration: 420 });
      haptics.impactHeavy();
    },
    [haptics, tomoe1Op, tomoe2Op, tomoe3Op, mngOp],
  );

  const blade = BLADES[mngType];
  const accent = ACCENT[mngType];
  const outerCircleR = IRIS_R - 22;

  const hintText =
    phase === 2
      ? lang === 'pt'
        ? 'ESCOLHA SEU MANGEKYOU'
        : 'CHOOSE YOUR MANGEKYOU'
      : phase === 3
        ? `${mngType.toUpperCase()} MANGEKYOU`
        : strings.simulation.tapToStart;

  return (
    <Pressable onPress={onPress} style={styles.pressable}>
      <View style={styles.eyeArea}>
        {/* Outer glow */}
        <Animated.View style={[styles.outerGlow, { opacity: outerGlowOp }]} />

        <RippleRing size={EYE + 80} delay={0} />
        <RippleRing size={EYE + 80} delay={600} />
        <RippleRing size={EYE + 80} delay={1200} />

        <Canvas style={styles.canvas}>
          {/* Sclera */}
          <Circle cx={C} cy={C} r={SCLERA_R} color={SCLERA_C} />

          {/* Iris fill + border ring */}
          <Circle cx={C} cy={C} r={IRIS_R} color={IRIS_C} />
          <Circle cx={C} cy={C} r={IRIS_R} style="stroke" strokeWidth={3} color={IRIS_RING} />

          {/* ── Rotating tomoe group (centered at eye center) ──────────────── */}
          <Group transform={tomoeTransform}>
            {/* Tomoe 1 — 0° */}
            <Group opacity={tomoe1Op}>
              <SkPath path={tomoePath} color={DARK} />
            </Group>

            {/* Tomoe 2 — 120° */}
            <Group transform={[{ rotate: DEG120 }]} opacity={tomoe2Op}>
              <SkPath path={tomoePath} color={DARK} />
            </Group>

            {/* Tomoe 3 — 240° */}
            <Group transform={[{ rotate: DEG240 }]} opacity={tomoe3Op}>
              <SkPath path={tomoePath} color={DARK} />
            </Group>
          </Group>

          {/* ── Mangekyou pattern ─────────────────────────────────────────── */}
          <Group transform={[{ translateX: C }, { translateY: C }]} opacity={mngOp}>
            {/* Accent rings */}
            <Circle r={PUPIL_R + 5} style="stroke" strokeWidth={2} color={accent} />
            <Circle r={IRIS_R - 8} style="stroke" strokeWidth={1.5} color={accent} opacity={0.3} />

            {/* 3 blades at 0° / 120° / 240° */}
            <SkPath path={blade} color={DARK} />
            <Group transform={[{ rotate: DEG120 }]}>
              <SkPath path={blade} color={DARK} />
            </Group>
            <Group transform={[{ rotate: DEG240 }]}>
              <SkPath path={blade} color={DARK} />
            </Group>

            {/* Madara extra: 3 outer dots between blades */}
            {mngType === 'madara' && (
              <>
                <Circle cx={0} cy={-outerCircleR} r={7} color={DARK} />
                <Circle
                  cx={outerCircleR * Math.sin(DEG120)}
                  cy={-outerCircleR * Math.cos(DEG120)}
                  r={7}
                  color={DARK}
                />
                <Circle
                  cx={outerCircleR * Math.sin(DEG240)}
                  cy={-outerCircleR * Math.cos(DEG240)}
                  r={7}
                  color={DARK}
                />
              </>
            )}
          </Group>

          {/* ── Pulsing pupil ─────────────────────────────────────────────── */}
          <Group transform={pupilTransform}>
            <Circle r={PUPIL_R} color="#060000" />
            <Circle r={PUPIL_R * 0.42} color="rgba(255,30,0,0.3)" />
          </Group>

          {/* Specular highlight */}
          <Circle cx={C * 0.76} cy={C * 0.57} r={13} color="rgba(255,255,255,0.16)" />
        </Canvas>

        <Text style={styles.hintText}>{hintText}</Text>
      </View>

      {/* ── Mangekyou selector (phase 2 only) ─────────────────────────────── */}
      {phase === 2 && (
        <View style={styles.selector}>
          {(['sasuke', 'itachi', 'madara', 'obito'] as MangekyouType[]).map((type) => (
            <TouchableOpacity
              key={type}
              style={[styles.selectorBtn, { borderColor: ACCENT[type] }]}
              onPress={() => selectMangekyou(type)}
            >
              <Text style={[styles.selectorLabel, { color: ACCENT[type] }]}>
                {type.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </Pressable>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  pressable: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyeArea: {
    width: EYE + 120,
    height: EYE + 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  canvas: {
    width: EYE,
    height: EYE,
  },
  outerGlow: {
    position: 'absolute',
    width: EYE + 60,
    height: EYE + 60,
    borderRadius: (EYE + 60) / 2,
    backgroundColor: 'rgba(255, 0, 0, 0.15)',
  },
  ripple: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: 'rgba(255, 50, 0, 0.6)',
  },
  hintText: {
    position: 'absolute',
    bottom: 8,
    fontSize: 10,
    letterSpacing: 2,
    color: 'rgba(255,255,255,0.75)',
    textTransform: 'uppercase',
  },
  selector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginTop: 4,
    maxWidth: EYE + 60,
  },
  selectorBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    minWidth: 110,
    alignItems: 'center',
  },
  selectorLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
});
