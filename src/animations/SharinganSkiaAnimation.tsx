import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing as RNEasing,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Canvas,
  Circle,
  Group,
  Path as SkPath,
  PathOp,
  RadialGradient,
  Skia,
  vec,
} from '@shopify/react-native-skia';
import {
  Easing,
  cancelAnimation,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useHaptics } from '@/hooks/useHaptics';
import { t } from '@/i18n/translations';

// =============================================================================
// CONSTANTS
// =============================================================================

const SIZE = 280;
const SVG_VIEWBOX = 894;
const SVG_INNER_UNITS = SVG_VIEWBOX * 10;
const SCALE = SIZE / SVG_INNER_UNITS;
const CENTER = SIZE / 2;

const ROTATION_PERIOD_MS = 6000;

const TWO_PI = Math.PI * 2;
const DEG120 = TWO_PI / 3;
const DEG240 = (TWO_PI * 2) / 3;

// Tomoe geometry — designed as classic "comma" (head dominant, curling tail)
const TOMOE_HEAD_R = SIZE * 0.085;
const TOMOE_ORBIT = SIZE * 0.24;
const TOMOE_TIP_X = -SIZE * 0.085;
const TOMOE_TIP_Y = -SIZE * 0.06;

// Colors — palette from reference webp
const COLOR_SCLERA = '#f1e4d0';
const COLOR_IRIS_OUTER = '#7a0a0a';
const COLOR_IRIS_INNER = '#c50000';
const COLOR_IRIS_HIGHLIGHT = '#ff2222';
const COLOR_LINEART = '#050505';
const COLOR_PUPIL = '#000000';
const COLOR_PUPIL_INNER_GLOW = 'rgba(255,30,0,0.3)';
const COLOR_SPECULAR = 'rgba(255,255,255,0.16)';

// =============================================================================
// SVG PATH DATA (verbatim do reference/Sharingan-PNG-Pic.svg)
// =============================================================================

const SVG_PATH_OUTER_RING =
  'M4140 8929 c-1303 -104 -2481 -750 -3250 -1784 -486 -652 -766 -1368' +
  ' -867 -2210 -25 -212 -25 -718 0 -930 101 -842 381 -1558 867 -2210 495 -666' +
  ' 1171 -1181 1950 -1487 1644 -647 3528 -255 4781 992 734 731 1169 1639 1296' +
  ' 2705 25 212 25 718 0 930 -101 842 -381 1558 -867 2210 -136 183 -260 327' +
  ' -429 495 -843 839 -1986 1307 -3175 1299 -111 -1 -248 -6 -306 -10z m800 -324' +
  ' c1144 -140 2161 -720 2842 -1621 966 -1279 1115 -2987 385 -4408 -210 -408' +
  ' -432 -712 -761 -1042 -333 -332 -646 -560 -1056 -768 -823 -418 -1749 -551' +
  ' -2650 -380 -1288 244 -2379 1070 -2956 2238 -218 440 -349 883 -411 1386 -22' +
  ' 180 -25 704 -5 875 77 660 269 1229 596 1762 675 1103 1852 1841 3126 1962 63' +
  ' 6 133 13 155 15 100 10 608 -3 735 -19z';

const SVG_PATH_PUPIL =
  'M4295 5353 c-345 -74 -617 -347 -690 -693 -19 -91 -19 -279 0 -369' +
  ' 88 -419 446 -711 871 -711 235 0 434 79 606 239 129 121 220 278 265 457 25' +
  ' 102 22 313 -6 419 -79 295 -293 530 -571 627 -142 49 -333 62 -475 31z';

// =============================================================================
// TOMOE PATH BUILDER — refinado para parecer vírgula clássica
// =============================================================================
//
// Comma anatomy (local coords, -Y = outward):
//   - head: large solid ball at (0, -ORBIT)
//   - tail: closed bezier teardrop curling from head toward eye center,
//           swept to the left → CCW pinwheel when 3 copies placed at 0/120/240°
//
// LIMITAÇÃO DOCUMENTADA:
// O Path 2 do SVG original combina íris+tomoes num único path filled, então
// não dá pra separar geometricamente. Tomoes são reconstruídas em Skia para
// permitir rotação isolada. Anel externo + pupila do SVG ficam estáticos com
// geometria byte-a-byte do original.
function buildTomoePath(): ReturnType<typeof Skia.Path.Make> {
  const H = TOMOE_HEAD_R;
  const O = TOMOE_ORBIT;

  const head = Skia.Path.Make();
  head.addCircle(0, -O, H);

  const tail = Skia.Path.Make();
  // Start: inside head's "inner-left" (lado virado ao centro)
  tail.moveTo(-H * 0.3, -O + H * 0.5);
  // Outer arc: bulge left then sweep down/inward to tip near pupil
  tail.cubicTo(
    -H * 1.9, -O + H * 0.2,
    -H * 1.7, -O + H * 1.8,
    TOMOE_TIP_X, TOMOE_TIP_Y,
  );
  // Inner arc: from tip back into head's right side (curva interna mais apertada)
  tail.cubicTo(
    H * 0.25, -O + H * 1.3,
    H * 0.45, -O + H * 0.9,
    H * 0.3, -O + H * 0.45,
  );
  tail.close();

  return Skia.Path.MakeFromOp(head, tail, PathOp.Union) ?? head;
}

// =============================================================================
// MANGEKYOU BLADES
// =============================================================================

type MangekyouType = 'sasuke' | 'itachi' | 'madara' | 'obito';

const BLADES: Record<MangekyouType, string> = {
  sasuke: 'M 0,-24 C -5,-36 -10,-53 -3,-64 C 0,-70 5,-68 8,-60 C 12,-50 8,-34 0,-24 Z',
  itachi: 'M -6,-20 Q -28,-27 -26,-52 Q -14,-70 0,-67 Q 14,-70 26,-52 Q 28,-27 6,-20 Z',
  madara: 'M 0,-24 C -14,-34 -24,-58 -12,-70 C -5,-76 6,-70 10,-58 C 16,-44 8,-32 0,-24 Z',
  obito: 'M 0,-18 C -36,-24 -60,-34 -62,-57 C -58,-70 -34,-62 -12,-46 C -2,-36 2,-24 0,-18 Z',
};

const ACCENT: Record<MangekyouType, string> = {
  sasuke: '#FF5500',
  itachi: '#FF1111',
  madara: '#CC00EE',
  obito: '#FF3300',
};

const PUPIL_R = SIZE * 0.085;
const IRIS_R = CENTER * 0.92;
const OUTER_DOT_R = IRIS_R - 22;

// Phases: 0=1-tomoe | 1=3-tomoe | 2=selector | 3=active-mangekyou
type Phase = 0 | 1 | 2 | 3;

// =============================================================================
// RIPPLE RING (outer pulse)
// =============================================================================

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
            easing: RNEasing.out(RNEasing.cubic),
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
  }, [delay, opacity, scale]);

  return (
    <Animated.View
      style={[
        styles.ripple,
        { width: size, height: size, borderRadius: size / 2, opacity, transform: [{ scale }] },
      ]}
    />
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

type Props = { lang?: 'en' | 'pt' };

export const SharinganSkiaAnimation: React.FC<Props> = ({ lang = 'en' }) => {
  const [phase, setPhase] = useState<Phase>(0);
  const [mngType, setMngType] = useState<MangekyouType>('sasuke');
  const haptics = useHaptics();
  const strings = t(lang);

  // Static Skia paths — build once
  const outerRing = useMemo(() => {
    const p = Skia.Path.MakeFromSVGString(SVG_PATH_OUTER_RING);
    if (!p) throw new Error('Failed to parse Sharingan outer ring path');
    return p;
  }, []);

  const pupilLineart = useMemo(() => {
    const p = Skia.Path.MakeFromSVGString(SVG_PATH_PUPIL);
    if (!p) throw new Error('Failed to parse Sharingan pupil path');
    return p;
  }, []);

  const tomoePath = useMemo(() => buildTomoePath(), []);

  // Reanimated shared values
  const rotation = useSharedValue(0);
  const pupilScale = useSharedValue(1);
  const tomoe1Op = useSharedValue(1);
  const tomoe2Op = useSharedValue(0);
  const tomoe3Op = useSharedValue(0);
  const mngOp = useSharedValue(0);

  // RN Animated for outer glow (uses opacity prop, not Skia)
  const outerGlowOp = useRef(new Animated.Value(0.5)).current;

  // SVG → Skia transform (replicates translate(0,8940) scale(0.1,-0.1))
  const svgTransform = useMemo(
    () => [
      { translateY: SIZE },
      { scaleX: SCALE * 10 },
      { scaleY: -SCALE * 10 },
    ],
    [],
  );

  // UI-thread transforms
  const tomoeTransform = useDerivedValue(() => [
    { translateX: CENTER },
    { translateY: CENTER },
    { rotate: rotation.value },
  ]);

  const pupilTransform = useDerivedValue(() => [
    { translateX: CENTER },
    { translateY: CENTER },
    { scale: pupilScale.value },
  ]);

  const mngTransform = useMemo(
    () => [{ translateX: CENTER }, { translateY: CENTER }],
    [],
  );

  // Kick off perpetual animations
  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(TWO_PI, { duration: ROTATION_PERIOD_MS, easing: Easing.linear }),
      -1,
      false,
    );
    pupilScale.value = withRepeat(
      withSequence(
        withTiming(1.12, { duration: 800 }),
        withTiming(0.9, { duration: 800 }),
      ),
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
  }, [outerGlowOp, pupilScale, rotation]);

  const onPress = useCallback(() => {
    setPhase((prev) => {
      if (prev === 2) return prev; // selector active — ignore background tap

      if (prev === 3) {
        // Mangekyou → reset to single-tomoe
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
  }, [haptics, mngOp, tomoe1Op, tomoe2Op, tomoe3Op]);

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
    [haptics, mngOp, tomoe1Op, tomoe2Op, tomoe3Op],
  );

  const blade = BLADES[mngType];
  const accent = ACCENT[mngType];

  const hintText =
    phase === 2
      ? lang === 'pt' ? 'ESCOLHA SEU MANGEKYOU' : 'CHOOSE YOUR MANGEKYOU'
      : phase === 3
        ? `${mngType.toUpperCase()} MANGEKYOU`
        : strings.simulation.tapToStart;

  return (
    <Pressable onPress={onPress} style={styles.pressable}>
      <View style={styles.eyeArea}>
        {/* Outer glow (CSS-style, behind canvas) */}
        <Animated.View style={[styles.outerGlow, { opacity: outerGlowOp }]} />

        <RippleRing size={SIZE + 80} delay={0} />
        <RippleRing size={SIZE + 80} delay={600} />
        <RippleRing size={SIZE + 80} delay={1200} />

        <Canvas style={styles.canvas}>
          {/* ── Static eye base ───────────────────────────────────────────── */}
          <Circle cx={CENTER} cy={CENTER} r={CENTER - 1} color={COLOR_SCLERA} />

          {/* Iris radial gradient */}
          <Circle cx={CENTER} cy={CENTER} r={IRIS_R}>
            <RadialGradient
              c={vec(CENTER, CENTER)}
              r={IRIS_R}
              colors={[COLOR_IRIS_HIGHLIGHT, COLOR_IRIS_INNER, COLOR_IRIS_OUTER]}
              positions={[0, 0.55, 1]}
            />
          </Circle>

          {/* SVG line-art: outer ring */}
          <Group transform={svgTransform}>
            <SkPath path={outerRing} color={COLOR_LINEART} />
          </Group>

          {/* ── Rotating tomoes (única parte animada continuamente) ────────── */}
          <Group transform={tomoeTransform}>
            <Group opacity={tomoe1Op}>
              <SkPath path={tomoePath} color={COLOR_LINEART} />
            </Group>
            <Group transform={[{ rotate: DEG120 }]} opacity={tomoe2Op}>
              <SkPath path={tomoePath} color={COLOR_LINEART} />
            </Group>
            <Group transform={[{ rotate: DEG240 }]} opacity={tomoe3Op}>
              <SkPath path={tomoePath} color={COLOR_LINEART} />
            </Group>
          </Group>

          {/* ── Mangekyou pattern (phase 3) ────────────────────────────────── */}
          <Group transform={mngTransform} opacity={mngOp}>
            <Circle r={PUPIL_R + 5} style="stroke" strokeWidth={2} color={accent} />
            <Circle r={IRIS_R - 8} style="stroke" strokeWidth={1.5} color={accent} opacity={0.3} />
            <SkPath path={blade} color={COLOR_LINEART} />
            <Group transform={[{ rotate: DEG120 }]}>
              <SkPath path={blade} color={COLOR_LINEART} />
            </Group>
            <Group transform={[{ rotate: DEG240 }]}>
              <SkPath path={blade} color={COLOR_LINEART} />
            </Group>
            {mngType === 'madara' && (
              <>
                <Circle cx={0} cy={-OUTER_DOT_R} r={7} color={COLOR_LINEART} />
                <Circle
                  cx={OUTER_DOT_R * Math.sin(DEG120)}
                  cy={-OUTER_DOT_R * Math.cos(DEG120)}
                  r={7}
                  color={COLOR_LINEART}
                />
                <Circle
                  cx={OUTER_DOT_R * Math.sin(DEG240)}
                  cy={-OUTER_DOT_R * Math.cos(DEG240)}
                  r={7}
                  color={COLOR_LINEART}
                />
              </>
            )}
          </Group>

          {/* ── Pulsing pupil ──────────────────────────────────────────────── */}
          <Group transform={pupilTransform}>
            <Circle r={PUPIL_R} color={COLOR_PUPIL} />
            <Circle r={PUPIL_R * 0.42} color={COLOR_PUPIL_INNER_GLOW} />
          </Group>

          {/* SVG line-art: pupil contour (sobre o disco pulsante) */}
          <Group transform={svgTransform}>
            <SkPath path={pupilLineart} color={COLOR_PUPIL} />
          </Group>

          {/* Specular highlight (static) */}
          <Circle cx={CENTER * 0.76} cy={CENTER * 0.57} r={13} color={COLOR_SPECULAR} />
        </Canvas>

        <Text style={styles.hintText}>{hintText}</Text>
      </View>

      {/* Mangekyou selector (phase 2) */}
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

export default SharinganSkiaAnimation;

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  pressable: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyeArea: {
    width: SIZE + 120,
    height: SIZE + 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  canvas: {
    width: SIZE,
    height: SIZE,
  },
  outerGlow: {
    position: 'absolute',
    width: SIZE + 60,
    height: SIZE + 60,
    borderRadius: (SIZE + 60) / 2,
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
    maxWidth: SIZE + 60,
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
