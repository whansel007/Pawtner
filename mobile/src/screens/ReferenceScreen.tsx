import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "../components/Icon";
import { FullCard } from "../components/FullCard";
import { api } from "../lib/api";
import { fileToBase64 } from "../lib/imageBase64";
import type { BackAction } from "../lib/navigation";

type Stage = "capture" | "saving" | "saved" | "error";

export function ReferenceScreen({
  back,
  onDone,
  onSkip,
  petName,
  medicationId,
}: {
  back: BackAction;
  onDone: () => void;
  onSkip: () => void;
  petName: string;
  medicationId?: string;
}) {
  const { t } = useTranslation();
  const [stage, setStage] = useState<Stage>("capture");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [description, setDescription] = useState<string>("");
  const fileRef = useRef<HTMLInputElement>(null);

  const onFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !medicationId) return;
    event.target.value = "";
    setPhotoUrl(URL.createObjectURL(file));
    setStage("saving");

    try {
      const { imageBase64, mimeType } = await fileToBase64(file);

      // Saves this photo as the medicine's original pill photo (T2-08); every later check-in is compared to it.
      const result = await api.setPillReference(medicationId, imageBase64, mimeType);
      setDescription(result.description?.trim() ?? "");
      setStage("saved");
    } catch {
      setStage("error");
    }
  };

  return (
    <FullCard back={back} className="scan-card">
      <p className="eyebrow green">{t("reference.eyebrow")}</p>
      <h2>{t("reference.title", { name: petName })}</h2>
      <p className="supporting">{t("reference.supporting")}</p>

      {stage === "capture" && (
        <label className="scanner">
          <span className="camera-orb"><Icon name="camera" size={30} /></span>
          <strong>{t("reference.tapCapture")}</strong>
          <small>{t("reference.onePill")}</small>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={onFileChange}
            style={{ display: "none" }}
            aria-label={t("reference.tapCapture")}
          />
        </label>
      )}

      {stage !== "capture" && photoUrl && (
        <>
          {/* Same photo card as the proof screen: photo centred, status line inside the card. */}
          <div className="scanner proof-scanner captured">
            <img src={photoUrl} alt={t("reference.photoAlt")} className="proof-photo-preview" />
            {stage === "saving" && <span className="proof-scanner__saved">{t("reference.saving", { name: petName })}</span>}
            {stage === "saved" && <strong>{t("reference.savedTitle")}</strong>}
          </div>
          {stage === "saved" && (
            <div className="proof-check-card">
              <p className="proof-check-card-line">{description || t("reference.savedFallback", { name: petName })}</p>
              <p className="proof-check-card-note">{t("reference.savedNote", { name: petName })}</p>
            </div>
          )}
          {stage === "error" && (
            <p className="supporting proof-check-error">{t("reference.offline", { name: petName })}</p>
          )}
        </>
      )}

      {stage !== "capture" && (
        <button className="primary-button" onClick={onDone}>
          {t("common.done")}
        </button>
      )}

      <button className="text-button" onClick={onSkip}>
        {t("reference.skip")}
      </button>
    </FullCard>
  );
}
