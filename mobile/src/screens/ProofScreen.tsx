import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "../components/Icon";
import { FullCard } from "../components/FullCard";
import type { BackAction } from "../lib/navigation";

export function ProofScreen({
  back,
  onVerified,
  petName,
  medicationName,
}: {
  back: BackAction;
  onVerified: (photoUrl: string | null) => void | Promise<void>;
  petName: string;
  medicationName?: string;
}) {
  const { t } = useTranslation();
  const [captured, setCaptured] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  const onFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    // T2-07: In production this would upload to object storage and get a URL.
    // For the demo, we create a local object URL (not persisted).
    setPhotoUrl(URL.createObjectURL(file));
    setCaptured(true);
  };

  return (
    <FullCard back={back} backLabel={t("proof.notNow")} className="scan-card">
      <p className="eyebrow green">{captured ? t("proof.eyebrowFound", { name: petName }) : t("proof.eyebrowCheck")}</p>
      <h2>{captured ? t("proof.titleFound") : t("proof.titleShow", { name: petName })}</h2>
      <p className="supporting">{captured ? t("proof.supportingFound", { name: petName }) : t("proof.supportingShow")}</p>

      <label className={`scanner proof-scanner ${captured ? "captured" : ""}`}>
        {captured && photoUrl ? (
          <>
            <img src={photoUrl} alt="Proof photo" style={{ maxWidth: "100%", borderRadius: "12px" }} />
            <strong>{t("proof.verified")}</strong>
            {medicationName && <small>{medicationName}</small>}
          </>
        ) : (
          <>
            <span className="camera-orb"><Icon name="camera" size={30} /></span>
            <strong>{t("proof.tapPhoto")}</strong>
            <small>{t("proof.onePill")}</small>
          </>
        )}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={onFileChange}
          style={{ display: "none" }}
          aria-label={t("proof.tapPhoto")}
        />
      </label>

      {/* T2-02 safety: never identify a pill from a photo */}
      {captured && (
        <p className="supporting" style={{ fontSize: "0.85em" }}>
          The photo is saved as proof only. The app cannot identify a pill from a photo.
          Always check the package and ask your pharmacist.
        </p>
      )}

      {captured && <button className="primary-button" onClick={() => void onVerified(photoUrl)}>{t("proof.giveHeart", { name: petName })}</button>}
    </FullCard>
  );
}
