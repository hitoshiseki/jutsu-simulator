import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import Purchases, { CustomerInfo, PurchasesOffering } from 'react-native-purchases';
import mobileAds, {
    AdEventType,
    InterstitialAd,
    RewardedAd,
    RewardedAdEventType,
    TestIds,
} from 'react-native-google-mobile-ads';
import { JutsuId } from '@/types';

const REVENUECAT_APPLE_KEY = 'appl_PLACEHOLDER';
const REVENUECAT_GOOGLE_KEY = 'goog_PLACEHOLDER';

const PREMIUM_ENTITLEMENT = 'premium';
const NO_ADS_ENTITLEMENT = 'no_ads';
const UNLOCK_ENTITLEMENT_PREFIX = 'unlock_';

export const SHINOBI_PACK_PRODUCT_ID = 'com.hitoshiseki.jutsusimulator.shinobi_pack';
export const NO_ADS_PRODUCT_ID = 'com.hitoshiseki.jutsusimulator.no_ads';

const INTERSTITIAL_UNIT_ID = __DEV__
    ? TestIds.INTERSTITIAL
    : Platform.select({
        ios: 'ca-app-pub-XXXXX/XXXXX',
        android: 'ca-app-pub-XXXXX/XXXXX',
    }) ?? TestIds.INTERSTITIAL;

const REWARDED_UNIT_ID = __DEV__
    ? TestIds.REWARDED
    : Platform.select({
        ios: 'ca-app-pub-XXXXX/XXXXX',
        android: 'ca-app-pub-XXXXX/XXXXX',
    }) ?? TestIds.REWARDED;

const TRIAL_USES_PER_AD = 2;

interface MonetizationContextValue {
    isReady: boolean;
    isPremium: boolean;
    hasNoAds: boolean;
    unlockedJutsus: Set<JutsuId>;
    trialUses: Map<JutsuId, number>;
    offering: PurchasesOffering | null;
    isInterstitialBusy: boolean;
    isJutsuAvailable: (id: JutsuId) => boolean;
    isLocked: (id: JutsuId) => boolean;
    showRewardedAd: (id: JutsuId) => Promise<boolean>;
    showInterstitial: () => Promise<void>;
    purchaseProduct: (productId: string) => Promise<boolean>;
    restorePurchases: () => Promise<void>;
    consumeTrialUse: (id: JutsuId) => void;
}

const noop = async () => false;

const MonetizationContext = createContext<MonetizationContextValue>({
    isReady: false,
    isPremium: false,
    hasNoAds: false,
    unlockedJutsus: new Set(),
    trialUses: new Map(),
    offering: null,
    isInterstitialBusy: false,
    isJutsuAvailable: () => true,
    isLocked: () => false,
    showRewardedAd: noop,
    showInterstitial: async () => { },
    purchaseProduct: noop,
    restorePurchases: async () => { },
    consumeTrialUse: () => { },
});

const FREE_JUTSUS: JutsuId[] = ['spiralOrb', 'lightningPalm'];

function extractEntitlements(info: CustomerInfo): {
    isPremium: boolean;
    hasNoAds: boolean;
    unlocked: Set<JutsuId>;
} {
    const active = info.entitlements.active;
    const isPremium = !!active[PREMIUM_ENTITLEMENT];
    const hasNoAds = isPremium || !!active[NO_ADS_ENTITLEMENT];
    const unlocked = new Set<JutsuId>();
    Object.keys(active).forEach((key) => {
        if (key.startsWith(UNLOCK_ENTITLEMENT_PREFIX)) {
            const id = key.slice(UNLOCK_ENTITLEMENT_PREFIX.length) as JutsuId;
            unlocked.add(id);
        }
    });
    return { isPremium, hasNoAds, unlocked };
}

export const MonetizationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isReady, setIsReady] = useState(false);
    const [isPremium, setIsPremium] = useState(false);
    const [hasNoAds, setHasNoAds] = useState(false);
    const [unlockedJutsus, setUnlockedJutsus] = useState<Set<JutsuId>>(new Set());
    const [trialUses, setTrialUses] = useState<Map<JutsuId, number>>(new Map());
    const [offering, setOffering] = useState<PurchasesOffering | null>(null);
    const [isInterstitialBusy, setIsInterstitialBusy] = useState(false);

    const interstitialCounterRef = useRef(0);

    useEffect(() => {
        let cancelled = false;

        (async () => {
            try {
                await mobileAds().initialize();
            } catch (e) {
                // AdMob init failed — non-fatal
            }

            try {
                const apiKey = Platform.OS === 'ios' ? REVENUECAT_APPLE_KEY : REVENUECAT_GOOGLE_KEY;
                if (!apiKey.includes('PLACEHOLDER')) {
                    Purchases.configure({ apiKey });
                    const info = await Purchases.getCustomerInfo();
                    if (!cancelled) {
                        const { isPremium: prem, hasNoAds: noAds, unlocked } = extractEntitlements(info);
                        setIsPremium(prem);
                        setHasNoAds(noAds);
                        setUnlockedJutsus(unlocked);
                    }
                    try {
                        const offerings = await Purchases.getOfferings();
                        if (!cancelled && offerings.current) {
                            setOffering(offerings.current);
                        }
                    } catch { }
                }
            } catch (e) {
                // RevenueCat init failed — non-fatal, app stays in free tier
            } finally {
                if (!cancelled) setIsReady(true);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        const listener = (info: CustomerInfo) => {
            const { isPremium: prem, hasNoAds: noAds, unlocked } = extractEntitlements(info);
            setIsPremium(prem);
            setHasNoAds(noAds);
            setUnlockedJutsus(unlocked);
        };
        try {
            Purchases.addCustomerInfoUpdateListener(listener);
        } catch { }
        return () => {
            try {
                Purchases.removeCustomerInfoUpdateListener(listener);
            } catch { }
        };
    }, []);

    const isLocked = useCallback(
        (id: JutsuId) => {
            if (FREE_JUTSUS.includes(id)) return false;
            if (isPremium) return false;
            if (unlockedJutsus.has(id)) return false;
            if ((trialUses.get(id) ?? 0) > 0) return false;
            return true;
        },
        [isPremium, unlockedJutsus, trialUses]
    );

    const consumeTrialUse = useCallback((id: JutsuId) => {
        setTrialUses((prev) => {
            const remaining = prev.get(id) ?? 0;
            if (remaining <= 0) return prev;
            const next = new Map(prev);
            const updated = remaining - 1;
            if (updated <= 0) next.delete(id);
            else next.set(id, updated);
            return next;
        });
    }, []);

    const isJutsuAvailable = useCallback((id: JutsuId) => !isLocked(id), [isLocked]);

    const showRewardedAd = useCallback(async (id: JutsuId): Promise<boolean> => {
        return new Promise((resolve) => {
            const ad = RewardedAd.createForAdRequest(REWARDED_UNIT_ID);
            let earned = false;

            const unsubLoaded = ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
                ad.show().catch(() => resolve(false));
            });
            const unsubEarned = ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
                earned = true;
                setTrialUses((prev) => {
                    const next = new Map(prev);
                    next.set(id, TRIAL_USES_PER_AD);
                    return next;
                });
            });
            const unsubClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
                unsubLoaded();
                unsubEarned();
                unsubClosed();
                resolve(earned);
            });
            const unsubError = ad.addAdEventListener(AdEventType.ERROR, () => {
                unsubLoaded();
                unsubEarned();
                unsubClosed();
                unsubError();
                resolve(false);
            });

            ad.load();
        });
    }, []);

    const showInterstitial = useCallback(async (): Promise<void> => {
        if (isPremium || hasNoAds) return;
        interstitialCounterRef.current += 1;
        if (interstitialCounterRef.current % 3 !== 0) return;

        setIsInterstitialBusy(true);
        return new Promise((resolve) => {
            const ad = InterstitialAd.createForAdRequest(INTERSTITIAL_UNIT_ID);
            const finish = () => {
                setIsInterstitialBusy(false);
                resolve();
            };
            const unsubLoaded = ad.addAdEventListener(AdEventType.LOADED, () => {
                ad.show().catch(() => {
                    unsubLoaded();
                    unsubClosed();
                    unsubError();
                    finish();
                });
            });
            const unsubClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
                unsubLoaded();
                unsubClosed();
                unsubError();
                finish();
            });
            const unsubError = ad.addAdEventListener(AdEventType.ERROR, () => {
                unsubLoaded();
                unsubClosed();
                unsubError();
                finish();
            });
            ad.load();
        });
    }, [isPremium, hasNoAds]);

    const purchaseProduct = useCallback(async (productId: string): Promise<boolean> => {
        try {
            if (!offering) return false;
            const pkg = offering.availablePackages.find(
                (p) => p.product.identifier === productId
            );
            if (!pkg) return false;
            const result = await Purchases.purchasePackage(pkg);
            const { isPremium: prem, hasNoAds: noAds, unlocked } = extractEntitlements(result.customerInfo);
            setIsPremium(prem);
            setHasNoAds(noAds);
            setUnlockedJutsus(unlocked);
            return true;
        } catch {
            return false;
        }
    }, [offering]);

    const restorePurchases = useCallback(async (): Promise<void> => {
        try {
            const info = await Purchases.restorePurchases();
            const { isPremium: prem, hasNoAds: noAds, unlocked } = extractEntitlements(info);
            setIsPremium(prem);
            setHasNoAds(noAds);
            setUnlockedJutsus(unlocked);
        } catch { }
    }, []);

    const value = useMemo<MonetizationContextValue>(
        () => ({
            isReady,
            isPremium,
            hasNoAds,
            unlockedJutsus,
            trialUses,
            offering,
            isInterstitialBusy,
            isJutsuAvailable,
            isLocked,
            showRewardedAd,
            showInterstitial,
            purchaseProduct,
            restorePurchases,
            consumeTrialUse,
        }),
        [isReady, isPremium, hasNoAds, unlockedJutsus, trialUses, offering, isInterstitialBusy, isJutsuAvailable, isLocked, showRewardedAd, showInterstitial, purchaseProduct, restorePurchases, consumeTrialUse]
    );

    return <MonetizationContext.Provider value={value}>{children}</MonetizationContext.Provider>;
};

export const useMonetization = () => useContext(MonetizationContext);
