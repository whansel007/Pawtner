import { browserStore, readItem, writeItem, type KeyValueStore } from "./localStore.js";

/**
 * Clinic memo photo helpers (pure; no DOM). The photo stays on this phone: no upload, no OCR,
 * no interpretation. Downscaling itself happens in useClinicMemo (needs a canvas).
 */

/** Size that fits inside `maxEdge` on the longest side, keeping the aspect ratio; never upscales. */
export function fitWithin(width: number, height: number, maxEdge: number): { width: number; height: number } {
  if (!(width > 0) || !(height > 0)) return { width: 0, height: 0 };
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

/** Only image data URLs are accepted back from storage. */
export function isImageDataUrl(value: unknown): value is string {
  return typeof value === "string" && value.startsWith("data:image/");
}

export function readClinicMemo(key: string, store: KeyValueStore | null = browserStore()): string | null {
  const value = readItem(key, store);
  return isImageDataUrl(value) ? value : null;
}

/** True when stored; false (full or blocked storage) means the caller keeps it in memory for this session. */
export function writeClinicMemo(key: string, dataUrl: string, store: KeyValueStore | null = browserStore()): boolean {
  return writeItem(key, dataUrl, store);
}
