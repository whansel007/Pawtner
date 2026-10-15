/**
 * Small wrapper around localStorage. Storage can be blocked or full (private mode, quota), so every access
 * is wrapped and callers get a plain result instead of an exception. Pure enough for unit tests: pass any
 * object with the same three methods.
 */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** The browser's localStorage, or null when there is none or it is blocked. */
export function browserStore(): KeyValueStore | null {
  try {
    return (globalThis as { localStorage?: KeyValueStore }).localStorage ?? null;
  } catch {
    return null;
  }
}

export function readItem(key: string, store: KeyValueStore | null = browserStore()): string | null {
  if (!store) return null;
  try {
    return store.getItem(key);
  } catch {
    return null;
  }
}

/** True when the value was stored. */
export function writeItem(key: string, value: string, store: KeyValueStore | null = browserStore()): boolean {
  if (!store) return false;
  try {
    store.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function removeItem(key: string, store: KeyValueStore | null = browserStore()): void {
  if (!store) return;
  try {
    store.removeItem(key);
  } catch {
    // Storage blocked: nothing to remove.
  }
}
