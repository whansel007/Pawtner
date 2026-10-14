import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "../components/Icon";
import { api } from "../lib/api";
import type { MedicineExplanationResponse } from "../../../shared/contract";

export function ExplanationScreen({
  onBack,
  onContinue,
  medicineName,
}: {
  onBack: () => void;
  onContinue: () => void;
  medicineName: string;
}) {
  const { t } = useTranslation();
  const [info, setInfo] = useState<MedicineExplanationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.medicineExplanation(medicineName)
      .then((data) => { if (!cancelled) setInfo(data); })
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : "Could not load explanation"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [medicineName]);

  const readAloud = () => {
    if ("speechSynthesis" in window && info) {
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(new SpeechSynthesisUtterance(info.spokenText));
    }
  };

  if (loading) return (
    <section className="content-card full-card">
      <button className="back-button" onClick={onBack}><Icon name="back" size={20} /> {t("explanation.back")}</button>
      <p className="supporting">Loading medicine information…</p>
    </section>
  );

  if (error || !info) return (
    <section className="content-card full-card">
      <button className="back-button" onClick={onBack}><Icon name="back" size={20} /> {t("explanation.back")}</button>
      <p className="error-text">{error || "Could not load explanation."}</p>
    </section>
  );

  return (
    <section className="content-card full-card">
      <button className="back-button" onClick={onBack}><Icon name="back" size={20} /> {t("explanation.back")}</button>
      <p className="eyebrow green">{t("explanation.eyebrow")}</p>
      <h2>{t("explanation.title")}</h2>
      <div className="plain-card">
        <span className="feature-icon"><Icon name="pill" /></span>
        <div><small>{info.medicineName}</small><h3>{info.summary}</h3></div>
        <button onClick={readAloud} aria-label={t("explanation.readAria")}><Icon name="speaker" /></button>
      </div>
      <div className="explain-points">
        {info.points.map((point) => (
          <article key={point.label}><strong>{point.label}</strong><p>{point.text}</p></article>
        ))}
      </div>
      <button className="listen-button" onClick={readAloud}><Icon name="speaker" /> {t("explanation.readAloud")}</button>

      {/* T2-04: Credits and external links */}
      <div className="explanation-links">
        <p className="source-credit">{info.sourceCredit}</p>
        <a className="external-link" href={info.ndfUrl} target="_blank" rel="noreferrer">
          <Icon name="external" size={18} /> Check on NDF
        </a>
        <a className="external-link" href={info.healthHubUrl} target="_blank" rel="noreferrer">
          <Icon name="external" size={18} /> Read the HealthHub leaflet
        </a>
      </div>

      <button className="primary-button" onClick={onContinue}>{t("explanation.continue")}</button>
    </section>
  );
}
