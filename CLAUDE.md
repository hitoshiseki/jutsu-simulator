# Jutsu Simulator — Agent Instructions

Naruto-themed React Native app (Expo managed) where users simulate ninja techniques with animations, sound, and haptics. Supports English and Portuguese.

## Commands

```bash
expo start          # Start dev server (npm run start)
expo start --ios    # iOS simulator
expo start --android
```

No test suite configured.

## Architecture

```
src/
├── animations/   # One component per jutsu (RasenganAnimation, ChidoriAnimation, …)
├── components/   # Reusable UI (JutsuCard, JutsuTutorial, LanguageToggle, SoundToggle)
├── context/      # LanguageContext, SoundContext (React Context + AsyncStorage)
├── data/         # jutsus.ts — single source of truth for jutsu metadata
├── hooks/        # useHaptics (platform-aware, custom chidoriPulse pattern)
├── i18n/         # translations.ts — use t(language) helper, two locales: 'en' | 'pt'
├── navigation/   # AppNavigator (native-stack: LanguageSelection → Home → JutsuSimulation)
├── screens/      # HomeScreen, JutsuSimulationScreen, LanguageSelectionScreen
├── theme/        # colors.ts — COLORS with per-jutsu palettes
├── types/        # index.ts — JutsuId union, RootStackParamList
```

## Key Conventions

- **Jutsu IDs** are a union type: `'rasengan' | 'chidori' | 'rasenshuriken' | 'sharingan' | 'katon'`. Add new entries to `src/types/index.ts` and `src/data/jutsus.ts` first.
- **All Animated calls must use `useNativeDriver: true`** — the codebase enforces this everywhere for 60fps.
- **Sound pattern**: keep a `soundEnabledRef` in sync with the context boolean, check the ref (not state) inside async callbacks to avoid stale closures.
- **i18n**: access strings via `t(language ?? 'en')` from `src/i18n/translations.ts`. Both `'en'` and `'pt'` keys must always stay in sync.
- **Language preference** is persisted with AsyncStorage (key `'app_language'`); check `isLoaded` from `LanguageContext` before rendering language-dependent UI.
- **Haptics** are no-ops on web — never add platform guards manually; `useHaptics` handles it.
- **Assets**: sound files live in `src/assets/[jutsuId]/soundEffects/`, images in `src/assets/[jutsuId]/images/`.
- **TypeScript strict mode** is on. No `any` unless absolutely necessary.
- **Styles**: inline `StyleSheet.create` at the bottom of each component file; use values from `src/theme/colors.ts`.
- **Imports**: always use the '@/path' convention.

## Adding a New Jutsu — Checklist

1. Add the ID to `JutsuId` in `src/types/index.ts`
2. Add metadata to `src/data/jutsus.ts`
3. Add translation strings under both `'en'` and `'pt'` in `src/i18n/translations.ts`
4. Create `src/animations/<Name>Animation.tsx` (follow existing animation patterns)
5. Create `src/components/<Name>Tutorial.tsx` (follow existing tutorial patterns)
6. Add per-jutsu color palette to `src/theme/colors.ts`
7. Place sound files in `assets/<jutsuId>/soundEffects/`
8. Wire up in `JutsuSimulationScreen`
