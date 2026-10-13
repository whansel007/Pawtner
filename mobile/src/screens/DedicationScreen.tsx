import { useTranslation } from "react-i18next";

export function DedicationScreen({ onContinue }: { onContinue: () => void }) {
  const { t } = useTranslation();

  return (
    <div
      className="intro-dedication"
      onClick={onContinue}
      role="button"
      tabIndex={0}
      aria-label={t("intro.dedicationAria")}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onContinue();
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
