# Jutsu Simulator — Project Architecture Document

## Introduction

This document captures the **current state** of the Jutsu Simulator codebase: a Naruto-themed React Native (Expo managed) app where users simulate ninja techniques with animations, sound, haptics, and motion sensors. It is written as a practical reference for AI agents and developers working on enhancements — documenting what **exists**, including conventions, monetization wiring, and known drift.

### Document Scope

Comprehensive documentation of the entire app (no PRD scope provided).

### Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-05-29 | 1.0 | Initial project analysis | Orion (aiox-master) |

---

## Quick Reference — Key Files and Entry Points

| Concern | File |
|---------|------|
| Native entry | [index.ts](../index.ts) → `registerRootComponent(App)` |
| Root component / provider tree | [App.tsx](../App.tsx) |
| Expo config (dynamic) | [app.config.ts](../app.config.ts) |
| Navigation | [src/navigation/AppNavigator.tsx](../src/navigation/AppNavigator.tsx) |
| Jutsu metadata (source of truth) | [src/data/jutsus.ts](../src/data/jutsus.ts) |
| Type unions | [src/types/index.ts](../src/types/index.ts) |
| i18n strings (en/pt) | [src/i18n/translations.ts](../src/i18n/translations.ts) |
| Theme / palettes | [src/theme/colors.ts](../src/theme/colors.ts) |
| Monetization (ads + IAP) | [src/context/MonetizationContext.tsx](../src/context/MonetizationContext.tsx) |
| Simulation screen (dispatcher) | [src/screens/JutsuSimulationScreen.tsx](../src/screens/JutsuSimulationScreen.tsx) |
| Build profiles | [eas.json](../eas.json) |
| Env template | [.env.example](../.env.example) |
| Agent conventions | [CLAUDE.md](../CLAUDE.md) |

---

## High Level Architecture

### Technical Summary

Single-screen-stack Expo app (New Architecture enabled). Three React Context providers wrap a native-stack navigator with three screens. Each jutsu has a dedicated full-screen animation component driven by `Animated` (native driver) and, for one technique, Skia. Monetization (AdMob + RevenueCat) gates non-free jutsus. No backend — all state is local (in-memory + AsyncStorage for language).

### Actual Tech Stack (from package.json)

| Category | Technology | Version | Notes |
|----------|------------|---------|-------|
| Runtime | React Native | 0.81.5 | New Arch (`newArchEnabled: true`) |
| Framework | Expo (managed) | ~54.0.33 | Dev client used (`expo-dev-client`) |
| Language | TypeScript | ~5.9.2 | `strict: true` |
| UI lib | React | 19.1.0 | |
| Navigation | @react-navigation/native + native-stack | 7.x | ⚠️ legacy `react-navigation@^5.0.0` also present in deps — unused, candidate for removal |
| Graphics | @shopify/react-native-skia | 2.2.12 | Pinned; patched (see patches/) |
| Animation | react-native-reanimated | ~4.1.1 | + `react-native-worklets` 0.8.3 |
| Gestures | react-native-gesture-handler | ~2.28.0 | |
| Audio | expo-audio | ~1.1.1 | |
| Haptics | expo-haptics | ~15.0.8 | web no-op via `useHaptics` |
| Sensors | expo-sensors | ~15.0.8 | shake-to-start interactions |
| Ads | react-native-google-mobile-ads | ^16.3.3 | interstitial + rewarded |
| IAP | react-native-purchases (RevenueCat) | ^10.1.1 | |
| Storage | @react-native-async-storage/async-storage | ^1.23.1 | language pref only |
| Fonts | @expo-google-fonts/knewave | ^0.4.1 | `Knewave_400Regular` |
| OTA | expo-updates | ~29.0.17 | EAS Update configured |

### Version Drift (gotcha)

- `package.json` `version` = **1.0.0**, but `app.config.ts` `version` = **4.0.0**. The store/runtime version is driven by `app.config.ts`. `package.json` version is stale and unused.
- EAS uses `appVersionSource: "remote"` — version/build numbers are managed on EAS servers, not solely from config.

### Repository Structure Reality Check

- Type: Polyrepo (single app).
- Package Manager: npm (`package-lock.json` present).
- Native: `ios/` and `android/` directories are committed (prebuilt — not pure managed). `expo run:ios/android` scripts present.
- Heavy non-app tooling at root: `.aiox-core/`, `.claude/`, `.github/agents/`, plus `.codex/`, `.cursor/`, `.gemini/`, `.kimi/`, `.antigravity/`. These are AI-agent framework artifacts, **not** app code.

---

## Source Tree and Module Organization

```text
jutsu-simulator/
├── App.tsx                  # Provider tree + font gate
├── index.ts                 # registerRootComponent
├── app.config.ts            # Expo dynamic config (ads, IAP keys, splash)
├── eas.json                 # Build/submit profiles
├── babel.config.js          # reanimated plugin + '@'→'./src' alias
├── tsconfig.json            # strict + '@/*' paths
├── patches/                 # patch-package: @shopify/react-native-skia
├── credentials/             # App Store API key (.p8) — sensitive
├── android/ ios/            # committed native projects (prebuild output)
├── assets/                  # app icons, splash, favicon, logo
└── src/
    ├── animations/          # one component per jutsu (see mapping below)
    ├── components/          # JutsuCard, tutorials, PaywallModal, toggles
    ├── context/             # Language, Sound, Monetization providers
    ├── data/                # jutsus.ts — jutsu list + getJutsu()
    ├── hooks/               # useHaptics (platform-aware)
    ├── i18n/                # translations.ts — t(lang) helper
    ├── navigation/          # AppNavigator (native-stack)
    ├── screens/             # Home, JutsuSimulation, LanguageSelection
    ├── theme/               # colors.ts — COLORS + per-jutsu palettes
    └── types/               # index.ts — JutsuId union, RootStackParamList
```

### Provider Tree (App.tsx)

Order matters; nesting is:

```
GestureHandlerRootView
└── SafeAreaProvider
    └── LanguageProvider
        └── SoundProvider
            └── MonetizationProvider
                └── AppNavigator
```

Fonts gate render: `App` returns `null` until `Knewave_400Regular` loads.

### Navigation

`AppNavigator` waits for `LanguageContext.isLoaded`, showing an `ActivityIndicator` first. Initial route = `Home` if a language is persisted, else `LanguageSelection`. Headers hidden globally; fade animations.

Routes: `LanguageSelection` → `Home` → `JutsuSimulation { jutsuId }`.

---

## The Jutsu System (core domain)

### IDs are copyright-neutral — and diverge from CLAUDE.md ⚠️

`JutsuId` (in [src/types/index.ts](../src/types/index.ts)) is currently:

```ts
'spiralOrb' | 'lightningPalm' | 'windShuriken' | 'crimsonEye' | 'fireBreath'
```

**CLAUDE.md is out of date** — it still documents the old IDs (`'rasengan' | 'chidori' | 'rasenshuriken' | 'sharingan' | 'katon'`). The IDs were renamed to neutral names (likely to avoid trademark issues), but the **animation/tutorial component files were NOT renamed**. Mapping:

| JutsuId | Display (en) | Rank | Animation component | Tutorial |
|---------|--------------|------|---------------------|----------|
| `spiralOrb` | Spiral Orb | A-Rank | `RasenganAnimation` | `RasenganTutorial` |
| `lightningPalm` | Lightning Palm | A-Rank | `ChidoriAnimation` | `ChidoriTutorial` |
| `windShuriken` | Wind Shuriken | S-Rank (locked) | `FuutonRasenshurikenAnimation` | `FuutonRasenshurikenTutorial` |
| `crimsonEye` | Crimson Eye | Bloodline | `SharinganSkiaAnimation` | — (no tutorial) |
| `fireBreath` | Fire Breath | C-Rank (locked) | `KatonAnimation` (+ `KatonFlameParticles`) | `KatonTutorial` |

When adding/reading jutsu code: **the `id` is neutral, the component name is the old Naruto name.** Don't assume they match.

### crimsonEye is hidden on Home

[HomeScreen.tsx](../src/screens/HomeScreen.tsx) filters it out: `JUTSUS.filter((j) => j.id !== 'crimsonEye')`. It still exists in data, types, colors, and i18n, and is reachable via the `SharinganSkiaAnimation`, but is not surfaced in the grid. Treat it as effectively disabled in UI.

### JutsuSimulationScreen — the dispatcher

This screen is the central switch for per-jutsu behavior. Several parallel `Record<JutsuId, …>` maps must stay in sync:

- `BG_COLORS`, `JUTSU_COLORS` — pull from `COLORS.jutsu[id]`.
- `HAPTIC_FNS` — maps each id to a `useHaptics` method name.
- `JutsuAnimationComponent` — `switch (jutsuId)` returning the right animation, forwarding a `ref` (with `cleanup()` + power callbacks).
- `CUSTOM_INTERACTION_JUTSUS` — all five; these hide the generic ACTIVATE button (each animation owns its own gesture/sensor interaction).
- `TUTORIAL_JUTSUS` — `spiralOrb`, `lightningPalm`, `windShuriken`, `fireBreath` (not `crimsonEye`).

Animation refs expose `cleanup()`, called on `navigation` `beforeRemove` to stop sounds/loops/vibration.

---

## Monetization (MonetizationContext)

The most complex module. Lives in [src/context/MonetizationContext.tsx](../src/context/MonetizationContext.tsx). Combines **AdMob** (ads) and **RevenueCat** (IAP entitlements). Designed for **graceful degradation** — if either SDK fails to init, the app stays in free tier and never crashes (all init wrapped in try/catch, errors swallowed intentionally).

### Free vs locked

- `FREE_JUTSUS = ['spiralOrb', 'lightningPalm']` — always unlocked.
- `defaultLocked: true` in data for `windShuriken` and `fireBreath`.
- `isLocked(id)` returns false if: free, premium, RevenueCat-unlocked, or has a remaining trial use.

### Entitlements (RevenueCat)

- `premium` — unlocks everything + removes ads.
- `no_ads` — removes ads only.
- `unlock_<jutsuId>` prefix — per-jutsu unlocks, parsed into a `Set<JutsuId>`.
- Product IDs: `SHINOBI_PACK_PRODUCT_ID`, `NO_ADS_PRODUCT_ID` (constants exported).

### Ads (AdMob)

- **Interstitial:** shown via `showInterstitial()`; internal counter shows an ad only every **3rd** call, and never for premium/no_ads users. Sets `isInterstitialBusy` while loading (sim screen shows a loading overlay and suppresses the animation meanwhile).
- **Rewarded:** `showRewardedAd(id)` grants `TRIAL_USES_PER_AD = 2` trial uses of a locked jutsu on `EARNED_REWARD`.
- **Test IDs auto-selected** in `__DEV__` or when unit IDs are placeholders (`includes('XXXXX')`).

### Key/config resolution

Keys read from `Constants.expoConfig.extra` (populated by `app.config.ts` from env vars). Placeholder detection: RevenueCat skipped if key `includes('PLACEHOLDER')`; AdMob falls back to Google test units. iOS requests ATT (`requestTrackingPermissionsAsync`) and AdMob consent form before init.

---

## State, i18n, and Conventions

### Contexts

| Context | State | Persistence |
|---------|-------|-------------|
| `LanguageContext` | `language: 'en'｜'pt'｜null`, `isLoaded` | AsyncStorage key `app_language` |
| `SoundContext` | `soundEnabled` (default true), `toggleSound` | **in-memory only** (not persisted) |
| `MonetizationContext` | entitlements, trial uses, offering, busy flags | RevenueCat server (no local persist) |

Note: trial uses (`Map<JutsuId, number>`) are in-memory — reset on app restart.

### i18n

- `t(lang)` returns the locale tree from `TRANSLATIONS` (`en` / `pt`). Both locales **must stay in sync**.
- Access pattern in screens: `const lang = language ?? 'en'; t(lang).<section>`.
- Jutsu display names/descriptions live under `t(lang).jutsus[jutsuId]`.

### Imports & aliases

`@/` → `src/`. Enforced in **two** places that must agree:
- `tsconfig.json` `paths`
- `babel.config.js` `module-resolver` alias

Always import via `@/...`.

### Animation rule

All `Animated` calls use `useNativeDriver: true` throughout (enforced convention for 60fps). The `crimsonEye` technique uses Skia instead of `Animated`.

### Haptics

`useHaptics()` returns `impactLight/Medium/Heavy`, `notificationSuccess`, and a custom `chidoriPulse` (5× heavy impacts at 80ms). All are **web no-ops** (`Platform.OS === 'web'` guard inside the hook — never guard at call sites).

### Styling

`StyleSheet.create` at the bottom of each component file; colors come from `COLORS` in [src/theme/colors.ts](../src/theme/colors.ts). Background `#08080F` is hardcoded in a few places (navigator `contentStyle`, splash, adaptive icon) in addition to `COLORS.background`.

### Assets layout

Per-jutsu assets under `src/assets/<jutsuId-ish>/{images,soundEffects}/` — folders use the **old** Naruto names (`rasengan`, `chidori`, `fuutonRasenshuriken`, `katon`) plus shared `backgrounds/`. Barrels: `src/assets/images/index.ts`, `src/assets/sounds/index.ts`.

---

## Build, Config, and Deployment

### Scripts (package.json)

```bash
npm run start      # expo start
npm run ios        # expo run:ios   (native build)
npm run android    # expo run:android
npm run web        # expo start --web
npm run dev        # expo start --dev-client
```

No `lint`, `typecheck`, `test`, or `build` scripts exist despite CLAUDE.md/AIOX rules referencing them. **No test suite is configured.**

### EAS (eas.json)

Profiles: `development-device`, `development` (sim), `preview`, `production`. All inject the same env vars (RevenueCat + AdMob IDs). Production: `channel: production`, `autoIncrement: true`. Submit configured for both stores (iOS via ASC API key in `credentials/`, Android internal track).

### Environment variables

App-relevant vars (see `.env.example`): `REVENUECAT_APPLE_KEY`, `REVENUECAT_GOOGLE_KEY`, `ADMOB_*_APP_ID`, `ADMOB_INTERSTITIAL_*_UNIT_ID`, `ADMOB_REWARDED_*_UNIT_ID`. Consumed in `app.config.ts` → `extra` → read at runtime via `expo-constants`. The remaining vars in `.env.example` (DeepSeek, OpenRouter, Supabase, etc.) belong to the **AIOX agent framework**, not the app.

### Native specifics (app.config.ts)

- `bundleIdentifier` / `package`: `com.hitoshi.NarutoJutsusOnHand`.
- Android permissions: `RECORD_AUDIO`, `MODIFY_AUDIO_SETTINGS` (microphone used to detect blowing for the Katon/`fireBreath` flame).
- Plugins: splash screen, `expo-audio` (mic permission string), `react-native-google-mobile-ads`, `expo-tracking-transparency`.
- EAS Update URL + `runtimeVersion.policy: appVersion`.

### Patches

`patch-package` patches `@shopify/react-native-skia@2.2.12`. Skia is **pinned** (exact version) — upgrading requires re-checking the patch.

---

## Technical Debt and Known Issues

1. **CLAUDE.md is stale** — documents old jutsu IDs (`rasengan`, etc.) and a non-existent test/lint workflow. The "Adding a New Jutsu" checklist references the old naming.
2. **ID ↔ component name mismatch** — neutral IDs, Naruto-named components/asset folders. Highest source of confusion for new contributors.
3. **Version drift** — `package.json` 1.0.0 vs `app.config.ts` 4.0.0.
4. **Unused dependency** — `react-navigation@^5.0.0` alongside v7 packages.
5. **`crimsonEye` hidden** but fully wired — dead-ish UI path.
6. **No tests, no lint, no typecheck scripts** — quality gates referenced by tooling don't exist in `package.json`.
7. **Sound preference not persisted** — resets each launch (unlike language).
8. **Swallowed errors** — monetization init deliberately ignores errors (intentional for resilience, but makes debugging ad/IAP issues harder; no logging).
9. **Sensitive files committed** — `credentials/AuthKey_*.p8` and `.env` are in the repo root (`.env` should be gitignored; verify before sharing).

---

## Adding a New Jutsu — Actual Checklist

Reflects current (neutral-ID) reality, superseding CLAUDE.md:

1. Add neutral ID to `JutsuId` in [src/types/index.ts](../src/types/index.ts).
2. Add entry to `JUTSUS` in [src/data/jutsus.ts](../src/data/jutsus.ts) (`rank`, `emoji`, optional `defaultLocked`).
3. Add `en` + `pt` strings under `jutsus.<id>` in [src/i18n/translations.ts](../src/i18n/translations.ts).
4. Add palette to `COLORS.jutsu.<id>` in [src/theme/colors.ts](../src/theme/colors.ts).
5. Create the animation component in `src/animations/` (expose a ref with `cleanup()` + `onPowerStart/onPowerReset`).
6. (Optional) Create a tutorial in `src/components/` with a `check<Name>TutorialSeen` helper.
7. Wire **all** `Record<JutsuId, …>` maps in [JutsuSimulationScreen.tsx](../src/screens/JutsuSimulationScreen.tsx): `BG_COLORS`, `JUTSU_COLORS`, `HAPTIC_FNS`, the `switch` in `JutsuAnimationComponent`, and the `CUSTOM_INTERACTION_JUTSUS` / `TUTORIAL_JUTSUS` arrays.
8. Place assets under `src/assets/<folder>/{images,soundEffects}/` and export via the asset barrels.
9. If it should be paid: add to `defaultLocked` and configure the matching RevenueCat `unlock_<id>` entitlement; otherwise add to `FREE_JUTSUS` in [MonetizationContext.tsx](../src/context/MonetizationContext.tsx).

> TypeScript's exhaustive `Record<JutsuId, …>` checks will fail to compile if you miss a map — lean on `tsc` (note: no `typecheck` script; run `npx tsc --noEmit`).

---

## Appendix — Useful Commands

```bash
npx expo start --dev-client    # run on a dev build
npx tsc --noEmit               # type-check (no script exists)
npx patch-package              # re-apply patches (runs on postinstall if configured)
eas build --profile preview    # internal distribution build
eas build --profile production
eas submit --profile production
```
