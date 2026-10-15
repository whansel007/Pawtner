import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "../components/Icon";
import { FullCard } from "../components/FullCard";
import { api } from "../lib/api";
import type { BackAction } from "../lib/navigation";

type Stage = "capture" | "describing" | "described" | "error";

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
    setStage("describing");

    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      const imageBase64 = btoa(binary);
      const mimeType = file.type || "image/jpeg";

      const result = await api.describePill(medicationId, imageBase64, mimeType);
      setDescription(result.description);
      setStage("described");
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
          <img src={photoUrl} alt="Pill reference" className="proof-photo-preview" style={{ marginBottom: 12 }} />
          {stage === "describing" && <p className="supporting">{t("reference.describing", { name: petName })}</p>}
          {stage === "described" && (
            <div className="proof-check-card">
              <small className="proof-check-card-title">{t("reference.describedTitle")}</small>
              <p className="proof-check-card-line">{description}</p>
              <p className="proof-check-card-note">{t("reference.describedNote", { name: petName })}</p>
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
