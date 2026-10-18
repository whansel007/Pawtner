import en from "../locales/en.json" with { type: "json" };

/**
 * Fallback demo names, used only when there is no data yet (offline, mock data, or before the API answers).
 * The ONLY place a person or pet name lives: en.json "demoNames". On screen, names come from data
 * (the API's senior.name, dog.name, caregiver.name); an accounts database only has to supply those.
 * Read straight from the locale file (not i18n.t) because mocks are built at import time, also in unit tests.
 */
export const DEMO_NAMES: Readonly<{ senior: string; dog: string; caretaker: string; updatesOnlyCaretaker: string }> = en.demoNames;
