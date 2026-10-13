import { useTranslation } from "react-i18next";

export function CoverScreen({ onContinue }: { onContinue: () => void }) {
  const { t } = useTranslation();
  return (
    <div
      className="intro-cover"
      onClick={onContinue}
      role="button"
      tabIndex={0}
      aria-label={t("intro.coverAria")}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onContinue();
        }
      }}
    >
      <img src="/assets/intro-cover.jpg" alt={t("intro.coverAlt")} className="intro-cover-img" />
      <div className="intro-cover-veil" aria-hidden="true" />

      <div className="intro-cover-cta">
        <span className="intro-cover-pulse" aria-hidden="true" />
        <p className="intro-cover-hint">{t("intro.coverHint")}</p>
      </div>
    </div>
  );
}
