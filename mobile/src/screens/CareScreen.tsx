import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "../components/Icon";
import { FullCard } from "../components/FullCard";
import type { BackAction } from "../lib/navigation";
import { api } from "../lib/api";
import type { Caregiver, CareActivity, RestockAlert, Pet } from "../types";
import type { MedicationDetail } from "../../../shared/contract";

export function CareScreen({
  back,
  sendTreat,
  pet,
  caregiver,
  careActivity,
  restockAlert,
}: {
  back: BackAction;
  sendTreat: () => void;
  pet: Pet;
  caregiver: Caregiver;
  careActivity: CareActivity;
  restockAlert: RestockAlert;
}) {
  const { t } = useTranslation();
  const dogName = pet.name;
  const [medications, setMedications] = useState<MedicationDetail[]>([]);
  const [loadingMeds, setLoadingMeds] = useState(true);
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

  useEffect(() => {
    api.listMedications().then((res) => { setMedications(res.medications); }).catch(() => {}).finally(() => setLoadingMeds(false));
  }, []);

  const startEdit = (med: MedicationDetail) => {
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
      setMedications(medications.map((m) => m.id === medId ? res.medication : m));
      setEditingMed(null);
    } catch {
      // ignore for demo
    } finally {
      setSaving(false);
    }
  };

  async function fileToBase64(file: File): Promise<{ imageBase64: string; mimeType: string }> {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return { imageBase64: btoa(binary), mimeType: file.type || "image/jpeg" };
  }

  // Save the SETTINGS-defined original pill photo; every check-in is later compared to it.
  const setRef = async (medId: string) => {
    if (!refFile) return;
    setRefSaving(true);
    setRefMsg(null);
    try {
      const { imageBase64, mimeType } = await fileToBase64(refFile);
      await api.setPillReference(medId, imageBase64, mimeType);
      setMedications(medications.map((m) => (m.id === medId ? { ...m, pillReferenceSet: true } : m)));
      setRefMsg({ id: medId, ok: true, text: t("care.pillRef.saved") });
      setSettingRefMed(null);
      setRefFile(null);
      setRefPreview(null);
    } catch (err) {
      setRefMsg({ id: medId, ok: false, text: err instanceof Error ? err.message : "Could not save" });
    } finally {
      setRefSaving(false);
    }
  };

  return (
    <FullCard back={back}>
      <div className="card-heading">
        <div><p className="eyebrow green">{t("care.eyebrow")}</p><h2>{t("care.title", { name: dogName })}</h2></div>
        <span className="score-orb">{pet.careScore}%</span>
      </div>
      <p className="supporting">{t("care.supporting", { name: dogName, caretaker: caregiver.caretakerName })}</p>
      <div className="role-strip"><Icon name="users" size={20} /><div><strong>{caregiver.names}</strong><small>{caregiver.relationship}</small></div><span>{caregiver.status}</span></div>
      {restockAlert.daysRemaining <= 5 && (
        <div className="alert-card warm">
          <span className="feature-icon"><Icon name="pill" /></span>
          <div><small>{restockAlert.label}</small><h3>{restockAlert.name}</h3><p>{t("care.daysRemaining", { count: restockAlert.daysRemaining })}</p></div>
          <Icon name="chevron" size={20} />
        </div>
      )}

      {/* T2-06: Medication editing on /care */}
      <div className="section-title"><h3>{t("care.careToday")}</h3></div>
      <div className="care-grid">
        <article><span><Icon name="check" /></span><strong>{careActivity.dosesTaken}</strong><small>{t("care.dosesTaken")}</small></article>
        <article><span><Icon name="walk" /></span><strong>{careActivity.walkDistance}</strong><small>{t("care.walkedToday")}</small></article>
      </div>

      <div className="section-title"><h3>Medications</h3></div>
      {loadingMeds ? <p className="supporting">Loading…</p> : medications.length === 0 ? <p className="supporting">No medications yet.</p> : (
        <div className="medication-list">
          {medications.map((med) => (
            <div className="medication-edit-row" key={med.id}>
              {editingMed === med.id ? (
                <div className="medication-edit-form">
                  <strong>{med.name}</strong>
                  {med.strength && <small>{med.strength}</small>}
                  <label>What did your doctor say it's for?</label>
                  <input type="text" value={editPrescribed} onChange={(e) => setEditPrescribed(e.target.value)} placeholder="Your doctor's reason" />
                  <label>Days of supply</label>
                  <input type="number" value={editDays} onChange={(e) => setEditDays(e.target.value)} placeholder="e.g. 30" />
                  <div className="edit-actions">
                    <button className="primary-button" disabled={saving} onClick={() => saveEdit(med.id)}>{saving ? "Saving…" : "Save"}</button>
                    <button className="text-button" onClick={() => setEditingMed(null)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="med-head">
                    <div>
                      <strong>{med.name}</strong>
                      {med.strength && <small> · {med.strength}</small>}
                      {med.prescribedFor && <small><br />Doctor said: {med.prescribedFor}</small>}
                      {med.daysOfSupply !== null && <small> · {med.daysOfSupply} days left</small>}
                      {med.pillReferenceSet && <small className="pill-ref-set"> · {t("care.pillRef.setBadge")}</small>}
                    </div>
                    <div className="med-actions">
                      <button className="text-button" onClick={() => startEdit(med)}>Edit</button>
                      <button className="text-button" onClick={() => { setSettingRefMed(settingRefMed === med.id ? null : med.id); setRefFile(null); setRefPreview(null); setRefMsg(null); }}>{med.pillReferenceSet ? t("care.pillRef.replace") : t("care.pillRef.set")}</button>
                    </div>
                  </div>
                  {settingRefMed === med.id && (
                    <div className="med-ref-set">
                      <p className="supporting">{t("care.pillRef.hint")}</p>
                      <label className={`scanner proof-scanner ${refFile ? "captured" : ""}`}>
                        {refPreview ? (
                          <>
                            <img src={refPreview} alt="Original pill" className="proof-photo-preview" />
                            <strong>{t("care.pillRef.captured")}</strong>
                          </>
                        ) : (
                          <>
                            <span className="camera-orb"><Icon name="camera" size={30} /></span>
                            <strong>{t("care.pillRef.capture")}</strong>
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
                          aria-label={t("care.pillRef.capture")}
                        />
                      </label>
                      {refMsg && refMsg.id === med.id && (
                        <p className={refMsg.ok ? "pill-ref-ok" : "error-text"}>{refMsg.text}</p>
                      )}
                      <div className="edit-actions">
                        <button className="primary-button" disabled={!refFile || refSaving} onClick={() => void setRef(med.id)}>{refSaving ? t("care.pillRef.saving") : t("care.pillRef.save")}</button>
                        <button className="text-button" onClick={() => { setSettingRefMed(null); setRefFile(null); setRefPreview(null); }}>Cancel</button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="activity-card">
        <p><strong>{t("care.recentActivity")}</strong><span>{careActivity.timestamp}</span></p>
        <p>{careActivity.description}</p>
      </div>
      <button className="primary-button" onClick={sendTreat}><Icon name="gift" size={20} /> {t("care.sendTreat", { name: dogName })}</button>
    </FullCard>
  );
}
