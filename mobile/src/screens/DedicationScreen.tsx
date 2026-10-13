import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { DEDICATION_HOLD_MS } from "../config/intro";

export function DedicationScreen({ onContinue }: { onContinue: () => void }) {
  const { t } = useTranslation();
  const advanced = useRef(false);

  const advance = () => {
    if (advanced.current) return;
    advanced.current = true;
    onContinue();
  };

  useEffect(() => {
    const timer = window.setTimeout(advance, DEDICATION_HOLD_MS);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="intro-dedication"
      onClick={advance}
      role="button"
      tabIndex={0}
      aria-label={t("intro.dedicationAria")}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          advance();
        }
      }}
    >
      <img src="/assets/intro-cover.jpg" alt="" aria-hidden="true" className="intro-dedication-bg" />
      <div className="intro-dedication-wash" aria-hidden="true" />
      <div className="intro-dedication-glow" aria-hidden="true" />

      <div className="dedication-card">
        <span className="dedication-rule" aria-hidden="true" />
        <p className="dedication-text">{t("intro.dedicationText")}</p>
        <span className="dedication-rule" aria-hidden="true" />
      </div>
    </div>
  );
}
