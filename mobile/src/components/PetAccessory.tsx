import { useTranslation } from "react-i18next";
import type { CSSProperties } from "react";
import { ACCESSORY_LAYOUTS, type AccessoryId } from "../config/accessories";

export function PetAccessory({ accessory, dogName }: { accessory: AccessoryId; dogName: string }) {
  const { t } = useTranslation();
  if (accessory === "none") return null;

  const layout = ACCESSORY_LAYOUTS[accessory];
  const style: CSSProperties = {
    "--acc-top": layout.top,
    "--acc-width": layout.width,
    "--acc-height": layout.height,
    "--acc-rotate": layout.rotate,
    ...(layout.left ? { "--acc-left": layout.left } : {}),
  } as CSSProperties;

  return (
    <span
      className={`pet-accessory accessory-${accessory}`}
      style={style}
      aria-label={t("toast.petAccessoryAria", { name: dogName, item: t(`accessory.${accessory}`) })}
    >
      {accessory === "flower" ? <HibiscusArt /> : (
        <>
          <i />
          <i />
        </>
      )}
    </span>
  );
}

/** Petal angles around the centre: five petals, evenly spaced. */
const HIBISCUS_PETAL_ANGLES = [0, 72, 144, 216, 288];

/** Hibiscus drawn in a 100x100 viewBox so it scales with the accessory box. Colours live in index.css (.accessory-flower). */
function HibiscusArt() {
  return (
    <svg className="hibiscus" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      {HIBISCUS_PETAL_ANGLES.map((angle) => (
        <ellipse key={angle} className="hibiscus__petal" cx="50" cy="28" rx="19" ry="24" transform={`rotate(${angle} 50 50)`} />
      ))}
      <circle className="hibiscus__throat" cx="50" cy="50" r="13" />
      <path className="hibiscus__stamen" d="M50 50 L66 31" />
      <circle className="hibiscus__pollen" cx="67" cy="29" r="4" />
      <circle className="hibiscus__pollen" cx="62" cy="28" r="2.6" />
      <circle className="hibiscus__pollen" cx="69" cy="34" r="2.6" />
      <circle className="hibiscus__centre" cx="50" cy="50" r="6" />
    </svg>
  );
}
