import type { ExpoConfig } from 'expo/config';

const env = process.env;

const ADMOB_IOS_APP_ID =
  env.ADMOB_IOS_APP_ID ?? 'ca-app-pub-3940256099942544~1458002511';
const ADMOB_ANDROID_APP_ID =
  env.ADMOB_ANDROID_APP_ID ?? 'ca-app-pub-3940256099942544~3347511713';

const config: ExpoConfig = {
  name: 'Jutsu Simulator',
  slug: 'jutsu-simulator',
  scheme: 'jutsusimulator',
  version: '4.0.0',
  orientation: 'portrait',
  icon: './assets/jutsu-logo.png',
  userInterfaceStyle: 'dark',
  newArchEnabled: true,
  updates: {
    url: 'https://u.expo.dev/b2247610-103f-4c59-9564-fedca3b410e0',
  },
  runtimeVersion: {
    policy: 'appVersion',
  },
  ios: {
    supportsTablet: false,
    infoPlist: {
      UIBackgroundModes: [],
      ITSAppUsesNonExemptEncryption: false,
      NSMotionUsageDescription:
        'Used to detect when you shake your device to trigger a technique.',
    },
    privacyManifests: {
      // App serves personalized ads via AdMob and requests ATT, so the app
      // DOES track. Declare it honestly to match the App Privacy questionnaire.
      NSPrivacyTracking: true,
      NSPrivacyTrackingDomains: [
        'googleads.g.doubleclick.net',
        'google.com',
        'googleadservices.com',
        'googlesyndication.com',
        'app-measurement.com',
      ],
      NSPrivacyCollectedDataTypes: [
        {
          // Advertising identifier (IDFA) used by AdMob for tracking.
          NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypeDeviceID',
          NSPrivacyCollectedDataTypeLinked: false,
          NSPrivacyCollectedDataTypeTracking: true,
          NSPrivacyCollectedDataTypePurposes: [
            'NSPrivacyCollectedDataTypePurposeThirdPartyAdvertising',
          ],
        },
        {
          // Coarse product-interaction / crash-free usage data for ad delivery.
          NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypeProductInteraction',
          NSPrivacyCollectedDataTypeLinked: false,
          NSPrivacyCollectedDataTypeTracking: true,
          NSPrivacyCollectedDataTypePurposes: [
            'NSPrivacyCollectedDataTypePurposeThirdPartyAdvertising',
          ],
        },
      ],
    },
    bundleIdentifier: 'com.hitoshi.NarutoJutsusOnHand',
    appleTeamId: '958ZAK3Q3A',
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/jutsu-logo.png',
      backgroundColor: '#08080F',
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    versionCode: 1,
    permissions: [
      'android.permission.RECORD_AUDIO',
      'android.permission.MODIFY_AUDIO_SETTINGS',
    ],
    package: 'com.hitoshi.NarutoJutsusOnHand',
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: [
    [
      'expo-splash-screen',
      {
        image: './assets/jutsu-logo.png',
        imageWidth: 220,
        resizeMode: 'contain',
        backgroundColor: '#08080F',
      },
    ],
    [
      'expo-audio',
      {
        microphonePermission:
          'Used to detect when you blow into the microphone to ignite the fire technique.',
      },
    ],
    [
      'react-native-google-mobile-ads',
      {
        androidAppId: ADMOB_ANDROID_APP_ID,
        iosAppId: ADMOB_IOS_APP_ID,
        userTrackingUsageDescription:
          'This identifier will be used to deliver personalized ads to you.',
      },
    ],
    [
      'expo-tracking-transparency',
      {
        userTrackingPermission:
          'This identifier will be used to deliver personalized ads to you.',
      },
    ],
  ],
  extra: {
    eas: {
      projectId: 'b2247610-103f-4c59-9564-fedca3b410e0',
    },
    revenueCatAppleKey: env.REVENUECAT_APPLE_KEY ?? 'appl_PLACEHOLDER',
    revenueCatGoogleKey: env.REVENUECAT_GOOGLE_KEY ?? 'goog_PLACEHOLDER',
    admobInterstitialIosUnitId:
      env.ADMOB_INTERSTITIAL_IOS_UNIT_ID ?? 'ca-app-pub-XXXXX/XXXXX',
    admobInterstitialAndroidUnitId:
      env.ADMOB_INTERSTITIAL_ANDROID_UNIT_ID ?? 'ca-app-pub-XXXXX/XXXXX',
    admobRewardedIosUnitId:
      env.ADMOB_REWARDED_IOS_UNIT_ID ?? 'ca-app-pub-XXXXX/XXXXX',
    admobRewardedAndroidUnitId:
      env.ADMOB_REWARDED_ANDROID_UNIT_ID ?? 'ca-app-pub-XXXXX/XXXXX',
  },
};

export default config;
