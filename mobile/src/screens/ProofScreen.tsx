import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "../components/Icon";
import { FullCard } from "../components/FullCard";
import { api, ApiRequestError } from "../lib/api";
import type { PillDescribeResponse, PillVerifyResponse } from "../../../shared/contract";
import type { BackAction } from "../lib/navigation";

type CheckState =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "described"; result: PillDescribeResponse }
  | { kind: "verified"; result: PillVerifyResponse }
  | { kind: "error"; message: string };

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
        if (verifyError instanceof ApiRequestError && verifyError.status === 409) {
          const result = await api.describePill(medicationId, imageBase64, mimeType);
          setCheck({ kind: "described", result });
        } else {
          throw verifyError;
        }
      }
    } catch (error) {
      setCheck({ kind: "error", message: error instanceof Error ? error.message : "Check failed." });
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
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={onFileChange}
          style={{ display: "none" }}
          aria-label={t("proof.tapPhoto")}
        />
      </label>

      {/* T2-08: Pill recognition (demo only) */}
      {captured && medicationId && (
        <div style={{ marginTop: "0.75rem" }}>
          {check.kind === "idle" && (
            <button className="secondary-button" onClick={() => void handleCheckPill()}>
              Check pill with AI
            </button>
          )}
          {check.kind === "checking" && (
            <p className="supporting" style={{ fontSize: "0.9em" }}>Checking pill…</p>
          )}
          {check.kind === "described" && (
            <div style={{ padding: "0.75rem", borderRadius: "12px", background: "var(--surface-soft, #f0fdf4)", border: "1px solid var(--green-accent, #86efac)" }}>
              <small style={{ fontWeight: 600 }}>First photo saved</small>
              <p style={{ fontSize: "0.85em", marginTop: "0.25rem" }}>{check.result.description}</p>
              <p style={{ fontSize: "0.8em", opacity: 0.7, marginTop: "0.25rem" }}>
                Next time you take this medicine, the AI will compare the photo to this description.
              </p>
            </div>
          )}
          {check.kind === "verified" && (
            <div style={{ padding: "0.75rem", borderRadius: "12px", background: check.result.match ? "var(--surface-soft, #f0fdf4)" : "#fef3c7", border: `1px solid ${check.result.match ? "#86efac" : "#fcd34d"}` }}>
              <small style={{ fontWeight: 600 }}>{check.result.match ? "Match — same medicine" : "No match — different medicine?"}</small>
              <p style={{ fontSize: "0.85em", marginTop: "0.25rem" }}>
                <strong>Saved:</strong> {check.result.savedDescription}
              </p>
              <p style={{ fontSize: "0.85em", marginTop: "0.25rem" }}>
                <strong>This photo:</strong> {check.result.newDescription}
              </p>
              <p style={{ fontSize: "0.8em", opacity: 0.7, marginTop: "0.25rem" }}>
                Similarity: {Math.round(check.result.similarity * 100)}%
              </p>
            </div>
          )}
          {check.kind === "error" && (
            <p className="supporting" style={{ fontSize: "0.85em", color: "#dc2626" }}>{check.message}</p>
          )}
        </div>
      )}

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
