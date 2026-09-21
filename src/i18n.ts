import i18n, { type BackendModule } from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { LANG_STORAGE_KEY, SUPPORTED_LANGS } from './lib/languages';
import en from './locales/en.json';

type Translation = typeof en;

// One JSON file per language under src/locales; only English (the fallback)
// is bundled eagerly, the others load when first switched to.
const localeLoaders = import.meta.glob<{ default: Translation }>('./locales/*.json');

const lazyBackend: BackendModule = {
    type: 'backend',
    init() {},
    read(language, _namespace, callback) {
        const load = localeLoaders[`./locales/${language}.json`];
        if (!load) {
            callback(new Error(`No translations for ${language}`), null);
            return;
        }
        load().then(
            (mod) => callback(null, mod.default),
            (err) => callback(err, null),
        );
    },
};

i18n
    .use(lazyBackend)
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources: { en: { translation: en } },
        partialBundledLanguages: true,
        fallbackLng: 'en',
        supportedLngs: SUPPORTED_LANGS,
        nonExplicitSupportedLngs: true,
        load: 'languageOnly',
        detection: {
            order: ['localStorage', 'navigator'],
            caches: ['localStorage'],
            lookupLocalStorage: LANG_STORAGE_KEY,
        },
        interpolation: {
            escapeValue: false
        }
    });

i18n.on('languageChanged', (lng) => {
    document.documentElement.lang = lng.split('-')[0];
});

export default i18n;
