import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";

// Initialise with English bundled statically.
// Additional locales are loaded on demand via loadLocale() below.
// Adding a new language only requires dropping src/locales/<code>.json
// and calling loadLocale("<code>") — no code changes here.
i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
  },
  lng: "en",
  fallbackLng: "en",
  interpolation: {
    escapeValue: false, // React already escapes
  },
  returnNull: false,
});

// Keep track of which locales have been loaded.
const loaded = new Set<string>(["en"]);

/**
 * Dynamically import a locale JSON and register it with i18next.
 * Adding a new language only needs a src/locales/<code>.json file.
 */
export async function loadLocale(code: string): Promise<void> {
  if (loaded.has(code)) return;
  const mod = await import(`./locales/${code}.json`);
  i18n.addResourceBundle(code, "translation", mod.default, true, true);
  loaded.add(code);
}

/**
 * Switch the active language, loading the locale first if needed.
 */
export async function changeLanguage(code: string): Promise<void> {
  await loadLocale(code);
  await i18n.changeLanguage(code);
}

export default i18n;
