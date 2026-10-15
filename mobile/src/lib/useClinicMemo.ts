import { useCallback, useState } from "react";
import { CLINIC_MEMO } from "../config/health";
import { fitWithin, readClinicMemo, writeClinicMemo } from "./clinicMemo";

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
 * The clinic memo photo: one picture kept on this phone (localStorage), never uploaded or read.
 * If storage is full or blocked, the photo stays in memory for this session.
 */
export function useClinicMemo() {
  const [photo, setPhoto] = useState<string | null>(() => readClinicMemo(CLINIC_MEMO.storageKey));
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const choose = useCallback(async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setFailed(false);
    try {
      const dataUrl = await downscaleToJpeg(file);
      writeClinicMemo(CLINIC_MEMO.storageKey, dataUrl);
      setPhoto(dataUrl);
    } catch (error) {
      console.warn("Pawtner clinic memo:", error);
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }, []);

  return { photo, busy, failed, choose };
}
