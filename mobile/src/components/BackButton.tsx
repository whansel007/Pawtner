import { useTranslation } from "react-i18next";
import type { BackAction } from "../lib/navigation";
import { Icon } from "./Icon";

/** The one back button for full-card screens: "Home" on top-level screens, "Back" on drilled-down ones. `label` overrides the text (e.g. "Not now"). */
export function BackButton({ back, label }: { back: BackAction; label?: string }) {
  const { t } = useTranslation();
  return (
    <button type="button" className="back-button" onClick={back.onBack}>
      <Icon name="back" size={20} /> {label ?? (back.kind === "home" ? t("common.home") : t("common.back"))}
    </button>
  );
}
