import { useTranslation } from "react-i18next";
import type { DogMood } from "../../../../shared/contract";
import { DOG_BASE_IMAGE, DOG_IMAGE_BY_MOOD } from "../../config/scene";
import { useImageWithFallback } from "../../lib/useImageAvailable";

/** Our crochet dog from the scene config (mood art when it exists, base art otherwise). */
export function CareDog({ name, mood, size = "large" }: { name: string; mood: DogMood; size?: "large" | "small" }) {
  const { t } = useTranslation();
  const image = useImageWithFallback(DOG_IMAGE_BY_MOOD[mood], DOG_BASE_IMAGE);
  if (!image.available) return null;
  return (
    <img
      className={`care-dog care-dog--${size}`}
      src={image.src}
      onError={image.onError}
      alt={t("care.web.dogAlt", { name })}
      width={1000}
      height={1300}
    />
  );
}
