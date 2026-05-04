export type Lang = 'en' | 'pt';

export const TRANSLATIONS = {
    en: {
        home: {
            subtitle: 'Choose your technique',
            footerHint: 'Tap a jutsu to activate',
            changeLanguage: 'EN',
        },
        sound: {
            on: 'SOUND ON',
            off: 'SOUND OFF',
        },
        tutorial: {
            header: 'TUTORIAL',
            howToUse: 'HOW TO USE',
            skip: 'SKIP',
            back: '←  BACK',
            next: 'NEXT  →',
            ready: "⚡  I'M READY",
        },
        simulation: {
            tapToStart: 'TAP TO START',
            shakeToStart: 'SHAKE TO START',
        },
        languageSelection: {
            kanji: '言語',
            title: 'SELECT LANGUAGE',
            subtitle: 'Choose your preferred language',
            confirm: 'CONFIRM',
            en: 'English',
            pt: 'Português',
            change: 'CHANGE LANGUAGE',
        },
    },
    pt: {
        home: {
            subtitle: 'Escolha sua técnica',
            footerHint: 'Toque em um jutsu para ativar',
            changeLanguage: 'PT',
        },
        sound: {
            on: 'SOM LIGADO',
            off: 'SOM DESLIGADO',
        },
        tutorial: {
            header: 'TUTORIAL',
            howToUse: 'COMO USAR',
            skip: 'PULAR',
            back: '←  VOLTAR',
            next: 'PRÓXIMO  →',
            ready: '⚡  ESTOU PRONTO',
        },
        simulation: {
            tapToStart: 'TOQUE PARA COMEÇAR',
            shakeToStart: 'AGITE PARA COMEÇAR',
        },
        languageSelection: {
            kanji: '言語',
            title: 'SELECIONAR IDIOMA',
            subtitle: 'Escolha seu idioma preferido',
            confirm: 'CONFIRMAR',
            en: 'English',
            pt: 'Português',
            change: 'ALTERAR IDIOMA',
        },
    },
} as const;

export const t = (lang: Lang) => TRANSLATIONS[lang];
