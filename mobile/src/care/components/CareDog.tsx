import { useTranslation } from "react-i18next";
import type { DogMood } from "../../../../shared/contract";
import { DOG_BASE_IMAGE, DOG_IMAGE_BY_MOOD } from "../../config/scene";
import { useImageWithFallback } from "../../lib/useImageAvailable";

/** Our knitted dog from the scene config (mood art when it exists, base art otherwise).
 *  Pass `alt` to override the personal name in the alt text (used on the public landing,
 *  which must not leak dog or senior names). */
export function CareDog({ name, mood, size = "large", alt }: { name?: string; mood: DogMood; size?: "large" | "small"; alt?: string }) {
  const { t } = useTranslation();
  const image = useImageWithFallback(DOG_IMAGE_BY_MOOD[mood], DOG_BASE_IMAGE);
  if (!image.available) return null;
  return (
    <img
      className={`care-dog care-dog--${size}`}
      src={image.src}
      onError={image.onError}
      alt={alt ?? (name !== undefined ? t("care.web.dogAlt", { name }) : t("care.web.landing.dogAlt"))}
      width={1000}
      height={1300}
    />
  );
}
