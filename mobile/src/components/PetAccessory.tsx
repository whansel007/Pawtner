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
      <i />
      <i />
    </span>
  );
}
