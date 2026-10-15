import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "../components/Icon";
import { FullCard } from "../components/FullCard";
import { api, ApiRequestError } from "../lib/api";
import type { PillVerifyResponse } from "../../../shared/contract";
import type { BackAction } from "../lib/navigation";

type CheckState =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "verified"; result: PillVerifyResponse }
  | { kind: "error" }
  | { kind: "error-warmup" }
  | { kind: "error-no-reference" };

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

  // Warm up the vision model in the background when this screen opens, so the first real
  // pill check hits an already-warm instance instead of a slow cold start (which can time out).
  useEffect(() => {
    if (!medicationId) return;
    void api.warmupPill().catch(() => {});
  }, [medicationId]);

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
      // Compare the check-in photo against the SETTINGS-defined original reference picture.
      const result = await api.verifyPill(medicationId, imageBase64, mimeType);
      setCheck({ kind: "verified", result });
    } catch (error) {
      // Never show the raw error to the senior; log it for diagnosis instead.
      console.warn("Proof screen pill check failed:", error);
      if (error instanceof ApiRequestError) {
        // 422 = no original pill photo set in medicine settings yet.
        if (error.status === 422) {
          setCheck({ kind: "error-no-reference" });
        }
        // 502/504 from the vision model usually means it is still warming up — ask for a retry
        // rather than failing silently.
        else if (error.status === 502 || error.status === 504) {
          setCheck({ kind: "error-warmup" });
        } else {
          setCheck({ kind: "error" });
        }
      } else {
        setCheck({ kind: "error" });
      }
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
            {/* The medicine is what matters: its name is bold, "Photo saved!" is regular. */}
            <span className="proof-scanner__saved">{t("proof.verified")}</span>
            {medicationName && <strong>{medicationName}</strong>}
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

      {/* T2-08: Pill comparison (demo only) — compares the check-in photo with the SETTINGS-defined
          original reference picture, per PRD 7.4 it never identifies a pill. */}
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
          {check.kind === "verified" && (
            <div className="proof-check-card">
              <small className="proof-check-card-title">
                {check.result.match ? t("proof.check.verified.match") : t("proof.check.verified.diff")}
              </small>
              {check.result.referenceDescription && (
                <p className="proof-check-card-line">
                  <strong>{t("proof.check.verified.referenceLabel")}</strong> {check.result.referenceDescription}
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
          {check.kind === "error-warmup" && (
            <p className="supporting proof-check-error">{t("proof.check.errorWarmup", { name: petName })}</p>
          )}
          {check.kind === "error-no-reference" && (
            <p className="supporting proof-check-error">{t("proof.check.noReference", { name: petName })}</p>
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
