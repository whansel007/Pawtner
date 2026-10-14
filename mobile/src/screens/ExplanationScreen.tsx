import { useTranslation } from "react-i18next";
import { Icon } from "../components/Icon";
import { FullCard } from "../components/FullCard";
import type { BackAction } from "../lib/navigation";
import type { MedicationExplanation } from "../types";

export function ExplanationScreen({
  back,
  onContinue,
  medicationExplanation,
}: {
  back: BackAction;
  onContinue: () => void;
  medicationExplanation: MedicationExplanation;
}) {
  const { t } = useTranslation();
  const readAloud = () => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(new SpeechSynthesisUtterance(medicationExplanation.spokenText));
    }
  };
  return (
    <FullCard back={back}>
      <p className="eyebrow green">{t("explanation.eyebrow")}</p>
      <h2>{t("explanation.title")}</h2>
      <div className="plain-card">
        <span className="feature-icon"><Icon name="pill" /></span>
        <div><small>{medicationExplanation.name} · {medicationExplanation.dosage}</small><h3>{medicationExplanation.summary}</h3></div>
        <button onClick={readAloud} aria-label={t("explanation.readAria")}><Icon name="speaker" /></button>
      </div>
      <div className="explain-points">
        {medicationExplanation.points.map((point) => (
          <article key={point.label}><strong>{point.label}</strong><p>{point.text}</p></article>
        ))}
      </div>
      <button className="listen-button" onClick={readAloud}><Icon name="speaker" /> {t("explanation.readAloud")}</button>
      <button className="primary-button" onClick={onContinue}>{t("explanation.continue")}</button>
    </FullCard>
  );
}
