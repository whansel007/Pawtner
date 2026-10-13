import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "../components/Icon";
import type { Medication } from "../types";

export function PrescriptionScreen({
  goHome,
  onExplain,
  medication,
  petName,
}: {
  goHome: () => void;
  onExplain: () => void;
  medication: Medication;
  petName: string;
}) {
  const { t } = useTranslation();
  const [scanned, setScanned] = useState(false);
  return (
    <section className="content-card full-card scan-card">
      <button className="back-button" onClick={goHome}><Icon name="back" size={20} /> {t("common.home")}</button>
      <p className="eyebrow green">{t("prescription.eyebrow")}</p>
      <h2>{scanned ? t("prescription.titleFound") : t("prescription.titleScan")}</h2>
      <p className="supporting">{scanned ? t("prescription.supportingFound", { name: petName }) : t("prescription.supportingScan")}</p>
      {!scanned ? (
        <>
          <button className="scanner" onClick={() => setScanned(true)}>
            <span className="scan-corner top-left" /><span className="scan-corner top-right" />
            <span className="scan-corner bottom-left" /><span className="scan-corner bottom-right" />
            <span className="camera-orb"><Icon name="camera" size={30} /></span>
            <strong>{t("prescription.tapCapture")}</strong><small>{t("prescription.keepLit")}</small>
          </button>
          <button className="text-button">{t("prescription.enterManual")}</button>
        </>
      ) : (
        <div className="prescription-result">
          <span className="feature-icon sage"><Icon name="scan" /></span>
          <div className="field"><small>{t("prescription.medication")}</small><strong>{medication.name}</strong></div>
          <div className="field-row"><div className="field"><small>{t("prescription.dosage")}</small><strong>{medication.dosage}</strong></div><div className="field"><small>{t("prescription.frequency")}</small><strong>{medication.frequency}</strong></div></div>
          <button className="primary-button" onClick={onExplain}>{t("prescription.explain")}</button>
        </div>
      )}
    </section>
  );
}
