# App Store Readiness — Gap Analysis

**Date:** 2026-05-29
**App:** Jutsu Simulator (`com.hitoshi.NarutoJutsusOnHand`), version 4.0.0
**ASC App ID:** 439199247 (app already exists in App Store Connect)

Status legend: 🔴 blocker · 🟡 needs attention · 🟢 ready

---

## Progress (2026-05-29)

Blocker pass completed in-code:

| # | Item | Status | Remaining (user action) |
|---|------|--------|--------------------------|
| 1 | `.env` secret | ✅ untracked (`git rm --cached`) | **Rotate RevenueCat key** (it's in git history) + scrub history if repo shared |
| 2 | Test AdMob ID | ✅ now from env via config | Set real env vars at EAS build; verify ID in generated plist |
| 3 | SKAdNetwork | ✅ auto-injected by ads plugin on prebuild | Verify after EAS build |
| 4 | Privacy manifest | ✅ `ios.privacyManifests` added (tracking=true + data types) | Mirror answers in ASC App Privacy form |
| 5 | IP / de-theme | ⚠️ code + docs de-themed; mic dialog fixed | **Replace any copyrighted audio/images with original assets**; decide on bundle id |
| 6 | Encryption key | ✅ already in config (`ITSAppUsesNonExemptEncryption`) | — |
| 9 | Motion string | ✅ specific string added | — |

Stale committed `ios/`/`android/` were **deleted** — `app.config.ts` is now the single source of truth; EAS prebuilds at build time.

---

## Summary

The build pipeline is mostly in place (EAS profiles, signing key, app exists in ASC). But there are **hard blockers** before a submittable build: a committed secret with a live key, a prebuilt `ios/` folder that ships **test** AdMob IDs and is missing **SKAdNetwork**, and a **privacy manifest that contradicts the app's actual tracking/ads behavior**. There is also a serious **IP/trademark risk** (Naruto theme) that is the single most likely cause of rejection.

---

## 🔴 Blockers

### 1. Live secret committed to git
- `.env` is tracked in git **HEAD** (despite being in `.gitignore`) and contains a real RevenueCat key (`appl_EMhmpDacifhWrbocYGxwUUZltYQ`) and real AdMob IDs.
- **Action:**
  1. `git rm --cached .env` and commit.
  2. **Rotate the RevenueCat public SDK key** (it is now public in history).
  3. Scrub history if the repo is/was shared (`git filter-repo` or BFG).
- Not an Apple gate per se, but a security must-fix before any public release/push.

### 2. Native `ios/` ships TEST AdMob App ID
- `ios/JutsuSimulator/Info.plist` → `GADApplicationIdentifier` = `ca-app-pub-3940256099942544~1458002511` (Google's **test** ID), not the real `ca-app-pub-7839851188748928~4532032712`.
- Cause: `ios/` was prebuilt before real env was set; `app.config.ts` falls back to the test ID when env is empty.
- **Consequence:** production build serves test ads (no revenue) or mismatched config → review risk.
- **Action:** regenerate native project with real env: `npx expo prebuild --clean` with env loaded, **or** delete `ios/`+`android/` and let EAS prebuild (EAS profiles already inject env). Verify the real ID lands in the plist.

### 3. Missing SKAdNetwork identifiers
- `Info.plist` has **0** `SKAdNetworkIdentifier` entries. AdMob requires the SKAdNetwork list (iOS 14+ ad attribution). The `react-native-google-mobile-ads` config plugin injects these — they're absent because the committed `ios/` is stale.
- **Action:** fixed by the prebuild in #2. Verify `SKAdNetworkItems` array exists afterward.

### 4. Privacy manifest contradicts actual behavior
- `ios/JutsuSimulator/PrivacyInfo.xcprivacy` declares `NSPrivacyTracking = false` and **empty** `NSPrivacyCollectedDataTypes`.
- Reality: app runs AdMob + requests ATT + serves **personalized ads** → it **does** track and collect device identifiers/usage.
- **Consequence:** inconsistent privacy declaration → App Review rejection / "Privacy Nutrition Label" mismatch.
- **Action:** set `NSPrivacyTracking = true`, add `NSPrivacyTrackingDomains` (AdMob/Google domains), and declare collected data types (Device ID, Advertising Data, Usage Data) per AdMob's published privacy guidance. Mirror in the ASC **App Privacy** questionnaire.

### 5. IP / trademark risk (highest rejection likelihood)
- App is "Naruto-themed": bundle id `...NarutoJutsusOnHand`, README/CLAUDE describe it as Naruto, asset folders named `rasengan`/`chidori`/`katon`, techniques mirror copyrighted jutsu.
- Jutsu **IDs** were neutralized (`spiralOrb`, etc.) and display names changed (`Spiral Orb`), but theme, sounds, and imagery remain derivative.
- **Consequence:** App Store Guideline 5.2 (Intellectual Property) — likely rejection or post-launch takedown by Nintendo/TV Tokyo. This is the biggest single risk.
- **Action (decision needed):** either (a) obtain license, or (b) fully de-theme — remove Naruto references from name, bundle id metadata, assets, descriptions. Confirm no copyrighted audio is used.

---

## 🟡 Needs attention

### 6. Export compliance key missing from native plist
- `app.config.ts` sets `ITSAppUsesNonExemptEncryption: false`, but the committed `Info.plist` lacks it. Prebuild (#2) will add it. Otherwise you'll be asked the encryption question on every submit.

### 7. Privacy Policy URL + Support URL
- No privacy policy in the repo. **Mandatory** in ASC for apps that serve ads / use ATT.
- **Action:** publish a privacy policy (cover AdMob, RevenueCat, ATT) and a support page; enter both URLs in ASC.

### 8. In-App Purchase products in ASC
- Code expects products `com.hitoshi.NarutoJutsusOnHand.shinobi_pack` and `...no_ads`, plus RevenueCat entitlements `premium`, `no_ads`, `unlock_<jutsuId>`.
- **Action:** create these IAPs in ASC (with localized name/price/review screenshot), map them in RevenueCat, and submit the IAPs **with** the build (first-time IAPs review alongside the app).

### 9. Generic motion permission string
- `NSMotionUsageDescription` = "Allow $(PRODUCT_NAME) to access your device motion" (default). Apple prefers a specific reason.
- **Action:** add a purpose string (shake-to-activate jutsu) via `app.config.ts` `ios.infoPlist`.

### 10. Store listing assets
- Required and not in repo: localized description, keywords, screenshots (6.7" + 6.5" iPhone, and iPad only if `supportsTablet` — currently `false`, so iPhone-only is fine), age rating questionnaire, category.
- App contains cartoon-style combat/fire → answer age-rating accordingly.

---

## 🟢 Looks ready

- App icon: `assets/icon.png` 1024×1024, **no alpha** ✅
- Splash, adaptive icon present ✅
- EAS profiles (dev/preview/production) with env injection ✅
- `eas submit` configured: ASC API key (`credentials/AuthKey_*.p8`), `ascAppId`, team id ✅
- `.p8` and `credentials/` correctly gitignored (only `.env` slipped through) ✅
- ATT flow implemented (`requestTrackingPermissionsAsync` + usage string) ✅
- AdMob consent (UMP) flow implemented ✅
- Microphone + Tracking usage strings present ✅
- No account system → Apple's account-deletion requirement N/A ✅
- Monetization degrades gracefully if SDKs fail ✅

---

## Recommended order of work

1. **Decide IP strategy** (#5) — blocks everything; may change name/bundle/assets.
2. Remove + rotate `.env` secret (#1).
3. Regenerate native projects with real env (#2, #3, #6) via `expo prebuild --clean` or EAS-managed prebuild.
4. Fix `PrivacyInfo.xcprivacy` to match reality (#4).
5. Publish privacy policy + support URL (#7).
6. Create IAPs in ASC + RevenueCat mapping (#8).
7. Tighten motion permission string (#9).
8. Produce store listing assets (#10).
9. `eas build --profile production` → `eas submit --profile production`.

> Note: since `ios/`/`android/` are committed, EAS uses them as-is. Either keep them and re-prebuild after fixes, or remove them and let EAS prebuild from `app.config.ts` (cleaner — config becomes the single source of truth).
