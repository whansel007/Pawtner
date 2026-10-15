import { browserStore, readItem, writeItem, type KeyValueStore } from "./localStore.js";

/**
 * Clinic memo photo helpers (pure; no DOM). The photos stay on this phone: no upload, no OCR,
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

/** One clinic memo photo. The list is newest first; each photo can be removed on its own. */
export interface MemoPhoto {
  id: string;
  /** JPEG data URL, already downscaled. */
  dataUrl: string;
  /** ISO time it was added ("" for a photo saved before the list existed). */
  addedAt: string;
}

function toPhoto(value: unknown): MemoPhoto | null {
  if (!value || typeof value !== "object") return null;
  const photo = value as Record<string, unknown>;
  if (typeof photo.id !== "string" || !isImageDataUrl(photo.dataUrl)) return null;
  return { id: photo.id, dataUrl: photo.dataUrl, addedAt: typeof photo.addedAt === "string" ? photo.addedAt : "" };
}

/**
 * Stored photos, newest first, or []. Earlier builds stored one data URL under the same key; that photo
 * becomes the only entry, so nobody loses it.
 */
export function readClinicMemos(key: string, store: KeyValueStore | null = browserStore()): MemoPhoto[] {
  const raw = readItem(key, store);
  if (!raw) return [];
  if (isImageDataUrl(raw)) return [{ id: "memo-earlier", dataUrl: raw, addedAt: "" }];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(toPhoto).filter((photo): photo is MemoPhoto => photo !== null) : [];
  } catch {
    return [];
  }
}

/** True when stored; false (full or blocked storage) means the caller keeps them in memory for this session. */
export function writeClinicMemos(key: string, photos: MemoPhoto[], store: KeyValueStore | null = browserStore()): boolean {
  return writeItem(key, JSON.stringify(photos), store);
}

/** A new photo goes on top; earlier ones stay. */
export function addClinicMemo(photos: MemoPhoto[], photo: MemoPhoto): MemoPhoto[] {
  return [photo, ...photos];
}

export function removeClinicMemo(photos: MemoPhoto[], id: string): MemoPhoto[] {
  return photos.filter((photo) => photo.id !== id);
}
