import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "../components/Icon";
import type { Medication } from "../types";

export function ProofScreen({
  onBack,
  onVerified,
  medication,
  petName,
}: {
  onBack: () => void;
  onVerified: () => void;
  medication: Medication;
  petName: string;
}) {
  const { t } = useTranslation();
  const [captured, setCaptured] = useState(false);
  return (
    <section className="content-card full-card scan-card">
      <button className="back-button" onClick={onBack}><Icon name="back" size={20} /> {t("proof.notNow")}</button>
      <p className="eyebrow green">{captured ? t("proof.eyebrowFound", { name: petName }) : t("proof.eyebrowCheck")}</p>
      <h2>{captured ? t("proof.titleFound") : t("proof.titleShow", { name: petName })}</h2>
      <p className="supporting">{captured ? t("proof.supportingFound", { name: petName }) : t("proof.supportingShow")}</p>
      <button className={`scanner proof-scanner ${captured ? "captured" : ""}`} onClick={() => setCaptured(true)}>
        {captured ? <><span className="proof-check"><Icon name="check" size={38} /></span><strong>{t("proof.verified")}</strong><small>{medication.name} · {medication.dosage}</small></> : <><span className="camera-orb"><Icon name="camera" size={30} /></span><strong>{t("proof.tapPhoto")}</strong><small>{t("proof.onePill")}</small></>}
      </button>
      {captured && <button className="primary-button" onClick={onVerified}>{t("proof.giveHeart", { name: petName })}</button>}
    </section>
  );
}
