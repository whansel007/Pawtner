import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "../components/Icon";
import { FullCard } from "../components/FullCard";
import { api } from "../lib/api";
import type { PillDescribeResponse, PillVerifyResponse } from "../../../shared/contract";
import type { BackAction } from "../lib/navigation";

type CheckState =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "described"; result: PillDescribeResponse }
  | { kind: "verified"; result: PillVerifyResponse }
  | { kind: "error" };

export function ProofScreen({
  back,
  onVerified,
  petName,
  medicationName,
  medicationId,
}: {
  back: BackAction;
  onVerified: (photoUrl: string | null) => void | Promise<void>;
  petName: string;
  medicationName?: string;
  medicationId?: string;
}) {
  const { t } = useTranslation();
  const [captured, setCaptured] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [check, setCheck] = useState<CheckState>({ kind: "idle" });
  const fileRef = useRef<HTMLInputElement>(null);

  const onFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setPhotoUrl(URL.createObjectURL(file));
    setPhotoFile(file);
    setCaptured(true);
    setCheck({ kind: "idle" });
  };

  async function fileToBase64(file: File): Promise<{ imageBase64: string; mimeType: string }> {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return { imageBase64: btoa(binary), mimeType: file.type || "image/jpeg" };
  }

  async function handleCheckPill() {
    if (!photoFile || !medicationId) return;
    setCheck({ kind: "checking" });
    try {
      const { imageBase64, mimeType } = await fileToBase64(photoFile);
      // Try verify first — if it fails with 409 (no saved description), fall back to describe.
      try {
        const result = await api.verifyPill(medicationId, imageBase64, mimeType);
        setCheck({ kind: "verified", result });
      } catch (verifyError) {
        // 409 = no saved description yet → this is the first time
        if (verifyError instanceof Error && verifyError.message.includes("first")) {
          const result = await api.describePill(medicationId, imageBase64, mimeType);
          setCheck({ kind: "described", result });
        } else {
          throw verifyError;
        }
      }
    } catch (error) {
      // Never show the raw error to the senior; log it for diagnosis instead.
      console.warn("Proof screen pill check failed:", error);
      setCheck({ kind: "error" });
    }
  }

  return (
    <FullCard back={back} backLabel={t("proof.notNow")} className="scan-card">
      <p className="eyebrow green">{captured ? t("proof.eyebrowFound", { name: petName }) : t("proof.eyebrowCheck")}</p>
      <h2>{captured ? t("proof.titleFound") : t("proof.titleShow", { name: petName })}</h2>
      <p className="supporting">{captured ? t("proof.supportingFound", { name: petName }) : t("proof.supportingShow")}</p>

      <label className={`scanner proof-scanner ${captured ? "captured" : ""}`}>
        {captured && photoUrl ? (
          <>
            <img src={photoUrl} alt="Proof photo" className="proof-photo-preview" />
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
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={onFileChange}
          className="proof-photo-input"
          aria-label={t("proof.tapPhoto")}
        />
      </label>

      {/* T2-08: Pill comparison (demo only) — compares with the senior's own earlier photo,
          per PRD 7.4 it never identifies a pill. */}
      {captured && medicationId && (
        <div className="proof-check-block">
          {check.kind === "idle" && (
            <button className="secondary-button" onClick={() => void handleCheckPill()}>
              {t("proof.check.button")}
            </button>
          )}
          {check.kind === "checking" && (
            <p className="supporting proof-checking-status">{t("proof.check.checking", { name: petName })}</p>
          )}
          {check.kind === "described" && (
            <div className="proof-check-card">
              <small className="proof-check-card-title">{t("proof.check.described.title")}</small>
              <p className="proof-check-card-line">{check.result.description}</p>
              <p className="proof-check-card-note">{t("proof.check.described.note", { name: petName })}</p>
            </div>
          )}
          {check.kind === "verified" && (
            <div className="proof-check-card">
              <small className="proof-check-card-title">
                {check.result.match ? t("proof.check.verified.match") : t("proof.check.verified.diff")}
              </small>
              {check.result.savedDescription && (
                <p className="proof-check-card-line">
                  <strong>{t("proof.check.verified.savedLabel")}</strong> {check.result.savedDescription}
                </p>
              )}
              <p className="proof-check-card-line">
                <strong>{t("proof.check.verified.newLabel")}</strong> {check.result.newDescription}
              </p>
            </div>
          )}
          {check.kind === "error" && (
            <p className="supporting proof-check-error">{t("proof.check.error", { name: petName })}</p>
          )}
        </div>
      )}

      {/* T2-02 safety: never identify a pill from a photo */}
      {captured && (
        <p className="supporting proof-check-disclosure">{t("proof.check.disclosure", { name: petName })}</p>
      )}

      {captured && <button className="primary-button" onClick={() => void onVerified(photoUrl)}>{t("proof.giveHeart", { name: petName })}</button>}
    </FullCard>
  );
}
