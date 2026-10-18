import { useCallback, useState } from "react";
import { CLINIC_MEMO } from "../config/health";
import { liveItems } from "./demoDayReset";
import { addClinicMemo, fitWithin, readClinicMemos, removeClinicMemo, writeClinicMemos, type MemoPhoto } from "./clinicMemo";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not read the photo"));
    image.src = src;
  });
}

/** Photo file → JPEG data URL no larger than CLINIC_MEMO.maxEdgePx (orientation from EXIF is applied by the browser). */
async function downscaleToJpeg(file: File): Promise<string> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await loadImage(objectUrl);
    const size = fitWithin(image.naturalWidth, image.naturalHeight, CLINIC_MEMO.maxEdgePx);
    const canvas = document.createElement("canvas");
    canvas.width = size.width;
    canvas.height = size.height;
    const context = canvas.getContext("2d");
    if (!context || size.width === 0) throw new Error("Could not draw the photo");
    context.drawImage(image, 0, 0, size.width, size.height);
    return canvas.toDataURL("image/jpeg", CLINIC_MEMO.jpegQuality);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/**
 * The clinic memo photos kept on this phone (localStorage), never uploaded or read. A new photo is added on top;
 * each one can be removed. If storage is full or blocked, the list stays in memory for this session.
 */
export function useClinicMemo() {
  const [photos, setPhotos] = useState<MemoPhoto[]>(() => readClinicMemos(CLINIC_MEMO.storageKey));
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const add = useCallback(async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setFailed(false);
    try {
      const dataUrl = await downscaleToJpeg(file);
      setPhotos((current) => {
        const next = addClinicMemo(current, { id: crypto.randomUUID(), dataUrl, addedAt: new Date().toISOString() });
        writeClinicMemos(CLINIC_MEMO.storageKey, next);
        return next;
      });
    } catch (error) {
      console.warn("Pawtner clinic memo:", error);
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }, []);

  const remove = useCallback((id: string) => {
    setPhotos((current) => {
      const next = removeClinicMemo(current, id);
      writeClinicMemos(CLINIC_MEMO.storageKey, next);
      return next;
    });
  }, []);

  // Photos hidden by Reset to morning stay in storage but are not shown.
  return { photos: liveItems(photos), busy, failed, add, remove };
}
