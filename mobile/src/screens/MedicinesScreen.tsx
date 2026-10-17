import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "../components/Icon";
import { FullCard } from "../components/FullCard";
import { PhotoViewer } from "../components/PhotoViewer";
import type { BackAction } from "../lib/navigation";
import { api } from "../lib/api";
import { fileToBase64 } from "../lib/imageBase64";
import type { MedicationDetail } from "../../../shared/contract";
import { formatStrength } from "../lib/strength";
import { isStopBusy } from "../lib/stopMedicine";
import { useStopMedicine } from "../lib/useStopMedicine";

/**
 * "My medicines" (Settings): the senior's medicine list with Edit (T2-06) and the
 * settings-defined original pill photo (T2-08) that every proof check is compared to.
 * Moved here from the old caretaker-style Care screen (William's medicine settings).
 * "Stop this medicine" (soft stop, two separate taps, Undo while on this screen): lib/useStopMedicine.ts.
 */
export function MedicinesScreen({ back, petName, caretakerName, onMedicinesChanged }: {
  back: BackAction;
  petName: string;
  caretakerName: string;
  /** After a successful stop or undo, so Home's doses are fresh. */
  onMedicinesChanged: () => void;
}) {
  const { t } = useTranslation();
  const stops = useStopMedicine(onMedicinesChanged);
  const [medications, setMedications] = useState<MedicationDetail[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [editingMed, setEditingMed] = useState<string | null>(null);
  const [editDays, setEditDays] = useState("");
  const [editPrescribed, setEditPrescribed] = useState("");
  const [saving, setSaving] = useState(false);

  // T2-08: set the SETTINGS-defined original/reference pill photo for a medicine.
  const [settingRefMed, setSettingRefMed] = useState<string | null>(null);
  const [refFile, setRefFile] = useState<File | null>(null);
  const [refPreview, setRefPreview] = useState<string | null>(null);
  const [refSaving, setRefSaving] = useState(false);
  const [refMsg, setRefMsg] = useState<{ id: string; ok: boolean; text: string } | null>(null);
  // "Original photo set" → look at the saved original (GET /api/pill-reference).
  const [viewingRef, setViewingRef] = useState<{ name: string; image: string } | null>(null);
  const [loadingRefId, setLoadingRefId] = useState<string | null>(null);

  const viewRef = async (med: MedicationDetail) => {
    setLoadingRefId(med.id);
    setRefMsg(null);
    try {
      const result = await api.getPillReference(med.id);
      setViewingRef({ name: med.name, image: result.imageDataUrl });
    } catch (error) {
      console.warn("My medicines: original pill photo could not be loaded:", error);
      setRefMsg({ id: med.id, ok: false, text: t("medicines.pillRef.viewFailed") });
    } finally {
      setLoadingRefId(null);
    }
  };

  useEffect(() => {
    api.listMedications()
      .then((res) => { setMedications(res.medications); setLoadState("ready"); })
      .catch((error) => { console.warn("My medicines: list failed:", error); setLoadState("error"); });
  }, []);

  const startEdit = (med: MedicationDetail) => {
    stops.cancel(med.id);
    setEditingMed(med.id);
    setEditDays(med.daysOfSupply?.toString() ?? "");
    setEditPrescribed(med.prescribedFor ?? "");
  };

  const saveEdit = async (medId: string) => {
    setSaving(true);
    try {
      const res = await api.updateMedication(medId, {
        daysOfSupply: editDays ? Number(editDays) : null,
        prescribedFor: editPrescribed.trim() || null,
      });
      setMedications((current) => current.map((m) => (m.id === medId ? res.medication : m)));
      setEditingMed(null);
    } catch (error) {
      console.warn("My medicines: edit failed:", error);
    } finally {
      setSaving(false);
    }
  };

  const closeRef = () => { setSettingRefMed(null); setRefFile(null); setRefPreview(null); };

  // The confirm panel replaces the row, so Edit and the photo step on that row close.
  const openStop = (medId: string) => {
    if (editingMed === medId) setEditingMed(null);
    if (settingRefMed === medId) closeRef();
    setRefMsg(null);
    stops.open(medId);
  };

  // Save the SETTINGS-defined original pill photo; every check-in is later compared to it.
  const setRef = async (medId: string) => {
    if (!refFile) return;
    setRefSaving(true);
    setRefMsg(null);
    try {
      const { imageBase64, mimeType } = await fileToBase64(refFile);
      await api.setPillReference(medId, imageBase64, mimeType);
      setMedications((current) => current.map((m) => (m.id === medId ? { ...m, pillReferenceSet: true } : m)));
      setRefMsg({ id: medId, ok: true, text: t("medicines.pillRef.saved") });
      closeRef();
    } catch (error) {
      // Never show the raw error to the senior; log it for diagnosis instead.
      console.warn("My medicines: original pill photo failed:", error);
      setRefMsg({ id: medId, ok: false, text: t("medicines.pillRef.failed", { name: petName }) });
    } finally {
      setRefSaving(false);
    }
  };

  return (
    <FullCard back={back}>
      <p className="eyebrow green">{t("medicines.eyebrow", { name: petName })}</p>
      <h2>{t("medicines.title")}</h2>
      <p className="supporting">{t("medicines.supporting", { name: petName })}</p>

      {loadState === "loading" && <p className="supporting">{t("medicines.loading")}</p>}
      {loadState === "error" && <p className="supporting">{t("medicines.offline")}</p>}
      {loadState === "ready" && medications.length === 0 && <p className="supporting">{t("medicines.empty")}</p>}
      {loadState === "ready" && medications.length > 0 && (
        <div className="medication-list">
          {medications.map((med) => {
            const stopRow = stops.rows[med.id];
            const busy = isStopBusy(stopRow);
            return (
            <div className="medication-edit-row" key={med.id}>
              {stopRow?.status === "stopped" || stopRow?.status === "undoing" ? (
                <div className="med-stop">
                  <p className="med-stop__done" role="status">{t("medicines.stop.done", { medicine: med.name })}</p>
                  {stopRow.failed && <p className="error-text">{t("medicines.stop.failed")}</p>}
                  <button type="button" className="secondary-button" disabled={busy} onClick={() => void stops.undo(med.id)}>{t("medicines.stop.undo")}</button>
                </div>
              ) : stopRow ? (
                <div className="med-stop" role="group" aria-labelledby={`stop-title-${med.id}`}>
                  <h3 className="med-stop__title" id={`stop-title-${med.id}`}>{t("medicines.stop.confirmTitle", { medicine: med.name })}</h3>
                  {med.strength && <p className="med-stop__strength">{formatStrength(med.strength)}</p>}
                  <p className="supporting">{t("medicines.stop.confirmBody", { name: petName, caretaker: caretakerName })}</p>
                  {stopRow.failed && <p className="error-text">{t("medicines.stop.failed")}</p>}
                  {/* The calm choice comes first; "Yes, stop it" sits below the text, never where "Stop this medicine" was tapped. */}
                  <div className="med-stop__actions">
                    <button type="button" className="secondary-button" disabled={busy} onClick={() => stops.cancel(med.id)}>{t("medicines.stop.no")}</button>
                    <button type="button" className="primary-button stop-button" disabled={busy} onClick={() => void stops.stop(med.id)}>{busy ? t("medicines.stop.stopping") : t("medicines.stop.yes")}</button>
                  </div>
                </div>
              ) : editingMed === med.id ? (
                <div className="medication-edit-form">
                  <strong>{med.name}</strong>
                  {med.strength && <small>{formatStrength(med.strength)}</small>}
                  <label htmlFor={`prescribed-${med.id}`}>{t("medicines.edit.prescribedLabel")}</label>
                  <input id={`prescribed-${med.id}`} type="text" value={editPrescribed} onChange={(e) => setEditPrescribed(e.target.value)} placeholder={t("medicines.edit.prescribedPlaceholder")} />
                  <label htmlFor={`days-${med.id}`}>{t("medicines.edit.daysLabel")}</label>
                  <input id={`days-${med.id}`} type="number" value={editDays} onChange={(e) => setEditDays(e.target.value)} placeholder={t("medicines.edit.daysPlaceholder")} />
                  <div className="edit-actions">
                    <button className="primary-button" disabled={saving} onClick={() => void saveEdit(med.id)}>{saving ? t("medicines.edit.saving") : t("medicines.edit.save")}</button>
                    <button className="text-button" onClick={() => setEditingMed(null)}>{t("medicines.cancel")}</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="med-head">
                    <div>
                      <strong>{med.name}</strong>
                      {med.strength && <small> · {formatStrength(med.strength)}</small>}
                      {med.prescribedFor && <small><br />{t("medicines.doctorSaid", { reason: med.prescribedFor })}</small>}
                      {med.daysOfSupply !== null && <small> · {t("medicines.daysLeft", { count: med.daysOfSupply })}</small>}
                      {med.pillReferenceSet && (
                        <small> · <button type="button" className="pill-ref-set pill-ref-view" disabled={loadingRefId === med.id} onClick={() => void viewRef(med)}>{t("medicines.pillRef.setBadge")}</button></small>
                      )}
                    </div>
                    <div className="med-actions">
                      <button className="text-button" onClick={() => startEdit(med)}>{t("medicines.edit.button")}</button>
                      <button className="text-button" onClick={() => { if (settingRefMed === med.id) closeRef(); else { stops.cancel(med.id); setSettingRefMed(med.id); setRefFile(null); setRefPreview(null); } setRefMsg(null); }}>{med.pillReferenceSet ? t("medicines.pillRef.replace") : t("medicines.pillRef.set")}</button>
                    </div>
                  </div>
                  {settingRefMed === med.id && (
                    <div className="med-ref-set">
                      <p className="supporting">{t("medicines.pillRef.hint")}</p>
                      <label className={`scanner proof-scanner ${refFile ? "captured" : ""}`}>
                        {refPreview ? (
                          <>
                            <img src={refPreview} alt={t("medicines.pillRef.photoAlt")} className="proof-photo-preview" />
                            <strong>{t("medicines.pillRef.captured")}</strong>
                          </>
                        ) : (
                          <>
                            <span className="camera-orb"><Icon name="camera" size={30} /></span>
                            <strong>{t("medicines.pillRef.capture")}</strong>
                          </>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={(e) => {
                            const f = e.target.files?.[0] ?? null;
                            setRefFile(f);
                            setRefPreview(f ? URL.createObjectURL(f) : null);
                          }}
                          className="proof-photo-input"
                          aria-label={t("medicines.pillRef.capture")}
                        />
                      </label>
                      <div className="edit-actions">
                        <button className="primary-button" disabled={!refFile || refSaving} onClick={() => void setRef(med.id)}>{refSaving ? t("medicines.pillRef.saving") : t("medicines.pillRef.save")}</button>
                        <button className="text-button" onClick={closeRef}>{t("medicines.cancel")}</button>
                      </div>
                    </div>
                  )}
                  {refMsg && refMsg.id === med.id && (
                    <p className={refMsg.ok ? "pill-ref-ok" : "error-text"}>{refMsg.text}</p>
                  )}
                  <button type="button" className="secondary-button med-stop__open" onClick={() => openStop(med.id)}>{t("medicines.stop.button")}</button>
                </>
              )}
            </div>
            );
          })}
        </div>
      )}
      {viewingRef && (
        <PhotoViewer title={viewingRef.name} closeLabel={t("health.memoClose")} onClose={() => setViewingRef(null)}>
          <img className="photo-viewer__image" src={viewingRef.image} alt={t("medicines.pillRef.photoAlt")} />
        </PhotoViewer>
      )}
    </FullCard>
  );
}
