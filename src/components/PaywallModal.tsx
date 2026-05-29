import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    Animated,
    Easing,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    View,
    ActivityIndicator,
} from 'react-native';
import { COLORS } from '@/theme/colors';
import { JutsuId } from '@/types';
import { useLanguageContext } from '@/context/LanguageContext';
import {
    useMonetization,
    SHINOBI_PACK_PRODUCT_ID,
    NO_ADS_PRODUCT_ID,
} from '@/context/MonetizationContext';
import { t } from '@/i18n/translations';

interface PaywallModalProps {
    visible: boolean;
    jutsuId: JutsuId | null;
    onClose: () => void;
    onUnlocked: () => void;
}

export const PaywallModal: React.FC<PaywallModalProps> = ({ visible, jutsuId, onClose, onUnlocked }) => {
    const { language } = useLanguageContext();
    const { offering, hasNoAds, showRewardedAd, purchaseProduct, restorePurchases } = useMonetization();
    const [busy, setBusy] = useState<'ad' | 'noAds' | 'pack' | 'restore' | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [info, setInfo] = useState<string | null>(null);

    const strings = t(language ?? 'en').paywall;

    const sheetScale = useRef(new Animated.Value(0.9)).current;
    const sheetOpacity = useRef(new Animated.Value(0)).current;
    const orbPulse = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            sheetScale.setValue(0.9);
            sheetOpacity.setValue(0);
            Animated.parallel([
                Animated.spring(sheetScale, {
                    toValue: 1,
                    useNativeDriver: true,
                    friction: 7,
                    tension: 80,
                }),
                Animated.timing(sheetOpacity, {
                    toValue: 1,
                    duration: 220,
                    useNativeDriver: true,
                }),
            ]).start();

            const loop = Animated.loop(
                Animated.sequence([
                    Animated.timing(orbPulse, {
                        toValue: 1,
                        duration: 1600,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(orbPulse, {
                        toValue: 0,
                        duration: 1600,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                ]),
            );
            loop.start();
            return () => loop.stop();
        }
    }, [visible, sheetScale, sheetOpacity, orbPulse]);

    const prices = useMemo(() => {
        const findPrice = (id: string, fallback: string) =>
            offering?.availablePackages.find((p) => p.product.identifier === id)
                ?.product.priceString ?? fallback;
        return {
            pack: findPrice(SHINOBI_PACK_PRODUCT_ID, '$9.99'),
            noAds: findPrice(NO_ADS_PRODUCT_ID, '$2.99'),
        };
    }, [offering]);

    const handleAd = async () => {
        if (!jutsuId) return;
        setBusy('ad');
        setError(null);
        const ok = await showRewardedAd(jutsuId);
        setBusy(null);
        if (ok) onUnlocked();
        else setError(strings.adFailed);
    };

    const handleNoAds = async () => {
        setBusy('noAds');
        setError(null);
        const ok = await purchaseProduct(NO_ADS_PRODUCT_ID);
        setBusy(null);
        if (!ok) setError(strings.purchaseFailed);
    };

    const handlePack = async () => {
        setBusy('pack');
        setError(null);
        const ok = await purchaseProduct(SHINOBI_PACK_PRODUCT_ID);
        setBusy(null);
        if (ok) onUnlocked();
        else setError(strings.purchaseFailed);
    };

    const handleRestore = async () => {
        setBusy('restore');
        setError(null);
        setInfo(null);
        const result = await restorePurchases();
        setBusy(null);
        if (result.restored) {
            setInfo(strings.restoreSuccess);
            if (jutsuId && (result.isPremium || result.unlockedCount > 0)) {
                onUnlocked();
            }
        } else {
            setInfo(strings.restoreNothing);
        }
    };

    const orbScale = orbPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] });
    const orbOpacity = orbPulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.65] });

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <Pressable style={styles.backdrop} onPress={busy ? undefined : onClose}>
                <Animated.View
                    style={[
                        styles.sheet,
                        { opacity: sheetOpacity, transform: [{ scale: sheetScale }] },
                    ]}
                    onStartShouldSetResponder={() => true}
                >
                    <View style={styles.orbWrap} pointerEvents="none">
                        <Animated.View
                            style={[
                                styles.orbGlowOuter,
                                { opacity: orbOpacity, transform: [{ scale: orbScale }] },
                            ]}
                        />
                        <View style={styles.orbGlowInner} />
                        <View style={styles.orbCore}>
                            <Text style={styles.orbIcon}>🔥</Text>
                        </View>
                    </View>

                    <Text style={styles.title}>{strings.unlockTitle}</Text>
                    <Text style={styles.subtitle}>{strings.unlockSubtitle}</Text>

                    <View style={styles.divider} />

                    <Pressable
                        style={({ pressed }) => [
                            styles.button,
                            styles.buttonAd,
                            pressed && styles.pressed,
                        ]}
                        onPress={handleAd}
                        disabled={busy !== null}
                    >
                        {busy === 'ad' ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <View style={styles.rowContent}>
                                <View style={styles.iconBubble}>
                                    <Text style={styles.iconBubbleText}>▶</Text>
                                </View>
                                <View style={styles.rowText}>
                                    <Text style={styles.buttonText}>{strings.watchAd}</Text>
                                    <Text style={styles.buttonSubText}>{strings.adFreeLabel}</Text>
                                </View>
                            </View>
                        )}
                    </Pressable>

                    {!hasNoAds && (
                        <Pressable
                            style={({ pressed }) => [
                                styles.button,
                                styles.buttonNoAds,
                                pressed && styles.pressed,
                            ]}
                            onPress={handleNoAds}
                            disabled={busy !== null}
                        >
                            {busy === 'noAds' ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <View style={styles.rowContent}>
                                    <View style={[styles.iconBubble, styles.iconBubbleNoAds]}>
                                        <Text style={styles.iconBubbleText}>🚫</Text>
                                    </View>
                                    <View style={styles.rowText}>
                                        <Text style={styles.buttonText}>{strings.removeAds}</Text>
                                        <Text style={styles.buttonSubText}>{strings.removeAdsDesc}</Text>
                                    </View>
                                    <Text style={styles.priceTag}>{prices.noAds}</Text>
                                </View>
                            )}
                        </Pressable>
                    )}

                    <Pressable
                        style={({ pressed }) => [
                            styles.button,
                            styles.buttonPack,
                            pressed && styles.pressed,
                        ]}
                        onPress={handlePack}
                        disabled={busy !== null}
                    >
                        <View style={styles.ribbon}>
                            <Text style={styles.ribbonText}>★ {strings.bestValue} ★</Text>
                        </View>
                        {busy === 'pack' ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <View style={styles.rowContent}>
                                <View style={[styles.iconBubble, styles.iconBubblePack]}>
                                    <Text style={styles.iconBubbleText}>🥷</Text>
                                </View>
                                <View style={styles.rowText}>
                                    <Text style={[styles.buttonText, styles.buttonTextPack]}>
                                        {strings.shinobiPack}
                                    </Text>
                                    <Text style={styles.packDesc}>{strings.shinobiPackDesc}</Text>
                                </View>
                                <Text style={[styles.priceTag, styles.priceTagPack]}>{prices.pack}</Text>
                            </View>
                        )}
                    </Pressable>

                    {error && <Text style={styles.error}>{error}</Text>}
                    {info && <Text style={styles.info}>{info}</Text>}

                    <View style={styles.footer}>
                        <Pressable onPress={handleRestore} disabled={busy !== null} hitSlop={8}>
                            <Text style={styles.restore}>
                                {busy === 'restore' ? '...' : strings.restorePurchases}
                            </Text>
                        </Pressable>
                        <Text style={styles.footerDot}>·</Text>
                        <Pressable onPress={onClose} disabled={busy !== null} hitSlop={8}>
                            <Text style={styles.close}>{strings.close}</Text>
                        </Pressable>
                    </View>
                </Animated.View>
            </Pressable>
        </Modal>
    );
};

const PACK_COLOR = '#7A4DFF';
const PACK_COLOR_DARK = '#4A26B8';

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.78)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    sheet: {
        width: '100%',
        maxWidth: 400,
        backgroundColor: '#1F1B3A',
        borderRadius: 24,
        paddingHorizontal: 22,
        paddingTop: 56,
        paddingBottom: 18,
        gap: 12,
        borderWidth: 2,
        borderColor: '#5A3FCC',
        shadowColor: PACK_COLOR,
        shadowOpacity: 0.7,
        shadowRadius: 40,
        shadowOffset: { width: 0, height: 12 },
        elevation: 24,
    },
    orbWrap: {
        position: 'absolute',
        top: -42,
        alignSelf: 'center',
        left: 0,
        right: 0,
        height: 84,
        alignItems: 'center',
        justifyContent: 'center',
    },
    orbGlowOuter: {
        position: 'absolute',
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: PACK_COLOR,
        opacity: 0.4,
    },
    orbGlowInner: {
        position: 'absolute',
        width: 92,
        height: 92,
        borderRadius: 46,
        backgroundColor: '#9B6CFF',
        opacity: 0.55,
    },
    orbCore: {
        width: 68,
        height: 68,
        borderRadius: 34,
        backgroundColor: '#1A0F3A',
        borderWidth: 2,
        borderColor: PACK_COLOR,
        alignItems: 'center',
        justifyContent: 'center',
    },
    orbIcon: {
        fontSize: 32,
    },
    title: {
        fontSize: 24,
        fontWeight: '900',
        color: COLORS.text.primary,
        textAlign: 'center',
        letterSpacing: 0.5,
    },
    subtitle: {
        fontSize: 13,
        color: COLORS.text.secondary,
        textAlign: 'center',
        marginBottom: 4,
        lineHeight: 18,
    },
    divider: {
        height: 1,
        backgroundColor: '#5A3FCC',
        marginVertical: 4,
        opacity: 0.4,
    },
    button: {
        paddingVertical: 14,
        paddingHorizontal: 14,
        borderRadius: 14,
        justifyContent: 'center',
        minHeight: 64,
    },
    pressed: {
        opacity: 0.85,
        transform: [{ scale: 0.985 }],
    },
    buttonAd: {
        backgroundColor: '#2D2A55',
        borderWidth: 1.5,
        borderColor: '#4A4480',
    },
    buttonNoAds: {
        backgroundColor: '#3D3470',
        borderWidth: 1.5,
        borderColor: '#5E52A8',
    },
    buttonPack: {
        backgroundColor: PACK_COLOR,
        borderWidth: 1,
        borderColor: '#9B6CFF',
        shadowColor: PACK_COLOR,
        shadowOpacity: 0.55,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 6 },
        elevation: 8,
        marginTop: 6,
    },
    rowContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    iconBubble: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.08)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconBubbleNoAds: {
        backgroundColor: 'rgba(255,255,255,0.12)',
    },
    iconBubblePack: {
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    iconBubbleText: {
        fontSize: 18,
        color: '#FFF',
    },
    rowText: {
        flex: 1,
        gap: 2,
    },
    buttonText: {
        color: '#FFF',
        fontSize: 15,
        fontWeight: '800',
        letterSpacing: 0.3,
    },
    buttonTextPack: {
        fontSize: 16,
    },
    buttonSubText: {
        color: 'rgba(255,255,255,0.65)',
        fontSize: 11,
        fontWeight: '600',
    },
    packDesc: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.9)',
        fontWeight: '500',
    },
    priceTag: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '800',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
        backgroundColor: 'rgba(0,0,0,0.25)',
        overflow: 'hidden',
    },
    priceTagPack: {
        backgroundColor: PACK_COLOR_DARK,
        color: '#FFD700',
    },
    ribbon: {
        position: 'absolute',
        top: -10,
        right: 12,
        backgroundColor: '#FFD700',
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 8,
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
        elevation: 4,
    },
    ribbonText: {
        fontSize: 9,
        color: '#1A0F3A',
        fontWeight: '900',
        letterSpacing: 1.2,
    },
    error: {
        color: '#FF6B6B',
        fontSize: 12,
        textAlign: 'center',
        marginTop: 4,
    },
    info: {
        color: '#7CE3A5',
        fontSize: 12,
        textAlign: 'center',
        marginTop: 4,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 10,
        marginTop: 10,
    },
    footerDot: {
        color: COLORS.text.muted,
        fontSize: 14,
    },
    restore: {
        fontSize: 12,
        color: COLORS.text.secondary,
        textDecorationLine: 'underline',
    },
    close: {
        fontSize: 12,
        color: COLORS.text.primary,
    },
});
