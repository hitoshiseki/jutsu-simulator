import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Lang } from '@/i18n/translations';

const STORAGE_KEY = 'app_language';

interface LanguageContextValue {
    language: Lang | null;
    isLoaded: boolean;
    setLanguage: (lang: Lang) => void;
}

const LanguageContext = createContext<LanguageContextValue>({
    language: null,
    isLoaded: false,
    setLanguage: () => { },
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [language, setLanguageState] = useState<Lang | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        AsyncStorage.getItem(STORAGE_KEY)
            .then((stored) => {
                if (stored === 'en' || stored === 'pt') {
                    setLanguageState(stored);
                }
            })
            .catch(() => { })
            .finally(() => setIsLoaded(true));
    }, []);

    const setLanguage = useCallback((lang: Lang) => {
        setLanguageState(lang);
        AsyncStorage.setItem(STORAGE_KEY, lang).catch(() => { });
    }, []);

    return (
        <LanguageContext.Provider value={{ language, isLoaded, setLanguage }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguageContext = () => useContext(LanguageContext);
