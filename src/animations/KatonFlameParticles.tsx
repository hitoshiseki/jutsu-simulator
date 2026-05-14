import React, { useMemo } from 'react';
import { StyleSheet, Dimensions } from 'react-native';
import {
  Canvas,
  Atlas,
  Skia,
  TileMode,
  type SkRSXform,
} from '@shopify/react-native-skia';
import {
  useSharedValue,
  useDerivedValue,
  useFrameCallback,
} from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';

type Props = {
  blowIntensity: SharedValue<number>;
};

// [x, y, vx, vy, life, maxLife, type, size]
const STRIDE = 8;
const N_CORE = 80;
const N_MID = 140;
const N_OUTER = 70;
const N_EDGE = 50;
const N = N_CORE + N_MID + N_OUTER + N_EDGE; // 340

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const CANVAS_SIDE_BLEED = Math.max(220, SCREEN_W * 0.35);
const CANVAS_W = SCREEN_W + CANVAS_SIDE_BLEED * 2;
const CANVAS_H = SCREEN_H + 20;
const ORIGIN_X = CANVAS_W / 2;
const ORIGIN_Y = CANVAS_H - 10;
const TEX_SIZE = 64;
const TEX_HALF = TEX_SIZE / 2;

function randRange (min: number, max: number): number {
  'worklet';
  return min + Math.random() * (max - min);
}

function spawnParticle (
  data: Float32Array,
  base: number,
  type: number,
  intensity: number,
): void {
  'worklet';
  // Spawn near the finger point; cone opening is driven by velocity over time.
  const spawnSpread = type === 0 ? 2 : type === 1 ? 4 : type === 2 ? 6 : 8;
  data[base] = randRange(-spawnSpread, spawnSpread);
  data[base + 1] = randRange(-3, 3);

  let vyMin: number, vyMax: number, vxRange: number;
  let sMin: number, sMax: number, mLife: number;

  if (type === 0) {
    vyMin = -1250; vyMax = -900; vxRange = 45; sMin = 3; sMax = 7; mLife = 0.48;
  } else if (type === 1) {
    vyMin = -1050; vyMax = -680; vxRange = 70; sMin = 4; sMax = 9; mLife = 0.70;
  } else if (type === 2) {
    vyMin = -860; vyMax = -480; vxRange = 95; sMin = 5; sMax = 11; mLife = 0.95;
  } else {
    vyMin = -700; vyMax = -320; vxRange = 120; sMin = 6; sMax = 13; mLife = 1.20;
  }

  data[base + 2] = randRange(-vxRange, vxRange);
  data[base + 3] = randRange(vyMin, vyMax) * Math.max(0.3, intensity);
  data[base + 4] = 1.0;
  data[base + 5] = mLife * randRange(0.8, 1.2);
  data[base + 7] = randRange(sMin, sMax);
}

function initParticles (): Float32Array {
  const data = new Float32Array(N * STRIDE);
  for (let i = 0; i < N; i++) {
    const base = i * STRIDE;
    const type =
      i < N_CORE ? 0
        : i < N_CORE + N_MID ? 1
          : i < N_CORE + N_MID + N_OUTER ? 2
            : 3;
    data[base + 4] = 0;
    data[base + 5] = 0.5;
    data[base + 6] = type;
    data[base + 7] = 14;
  }
  return data;
}

const KatonFlameParticles: React.FC<Props> = ({ blowIntensity }) => {
  const particleData = useSharedValue(initParticles());
  const frameTick = useSharedValue(0);

  // Fire-gradient particle texture generated at runtime — no PNG needed
  const particleTexture = useMemo(() => {
    const surface = Skia.Surface.Make(TEX_SIZE, TEX_SIZE);
    if (!surface) return null;
    const canvas = surface.getCanvas();
    const paint = Skia.Paint();
    paint.setAntiAlias(true);
    const shader = Skia.Shader.MakeRadialGradient(
      { x: TEX_HALF, y: TEX_HALF },
      TEX_HALF,
      [
        Skia.Color('white'),          // white-hot core
        Skia.Color('#FFE033'),        // bright yellow
        Skia.Color('#FF6600'),        // orange
        Skia.Color('#CC1100'),        // deep red
        Skia.Color('transparent'),   // soft transparent edge
      ],
      [0.0, 0.18, 0.50, 0.78, 1.0],
      TileMode.Clamp,
    );
    paint.setShader(shader);
    canvas.drawCircle(TEX_HALF, TEX_HALF, TEX_HALF, paint);
    return surface.makeImageSnapshot();
  }, []);

  const sprites = useMemo(
    () => Array.from({ length: N }, () => Skia.XYWHRect(0, 0, TEX_SIZE, TEX_SIZE)),
    [],
  );

  useFrameCallback((info) => {
    const dt = Math.min(info.timeSincePreviousFrame ?? 16, 50) / 1000;
    const intensity = blowIntensity.value;
    const data = particleData.value;

    for (let i = 0; i < N; i++) {
      const b = i * STRIDE;
      const type = data[b + 6];

      if (data[b + 4] <= 0) {
        if (intensity > 0.05) spawnParticle(data, b, type, intensity);
        continue;
      }

      data[b + 4] -= dt / data[b + 5];
      data[b] += data[b + 2] * dt;
      data[b + 1] += data[b + 3] * dt;

      const travelY = Math.max(0, -data[b + 1]);
      const coneFactor = Math.min(1, travelY / (SCREEN_H * 0.65));
      const outwardDir = data[b + 2] >= 0 ? 1 : -1;

      // Expand into a cone as particles move away from the finger.
      data[b + 2] += outwardDir * (180 + type * 40) * coneFactor * dt;
      data[b + 2] += (Math.random() - 0.5) * (22 + type * 4) * dt;

      // Keep a strong vertical jet while slowly losing speed.
      data[b + 3] *= 1 - 0.10 * dt;
    }

    particleData.value = data;
    frameTick.value += 1;
  });

  const atlasTransforms = useDerivedValue(() => {
    frameTick.value;
    const d = particleData.value;
    const transforms: SkRSXform[] = [];
    for (let i = 0; i < N; i++) {
      const b = i * STRIDE;
      if (d[b + 4] <= 0) {
        transforms.push(Skia.RSXform(0, 0, 0, 0));
        continue;
      }
      const px = d[b] + ORIGIN_X;
      const py = d[b + 1] + ORIGIN_Y;
      const travelY = Math.max(0, -d[b + 1]);
      const grow = Math.min(5.5, 0.60 + travelY / (SCREEN_H * 0.22));
      const fillBoost = 1 + Math.min(1.6, travelY / (SCREEN_H * 0.45));
      const life = Math.max(0, d[b + 4]);
      const endShrink = 0.9 + life * 0.1;
      const scale = ((d[b + 7] * 2) / TEX_SIZE) * grow * fillBoost * endShrink;
      transforms.push(
        Skia.RSXform(scale, 0, px - scale * TEX_HALF, py - scale * TEX_HALF),
      );
    }
    return transforms;
  });

  if (!particleTexture) return null;

  return (
    <Canvas style={styles.canvas} pointerEvents="none">
      <Atlas
        image={particleTexture}
        sprites={sprites}
        transforms={atlasTransforms}
        blendMode="screen"
      />
    </Canvas>
  );
};

const styles = StyleSheet.create({
  canvas: {
    position: 'absolute',
    width: CANVAS_W,
    height: CANVAS_H,
    left: -ORIGIN_X,
    top: -(CANVAS_H - 10),
  },
});

export default KatonFlameParticles;
