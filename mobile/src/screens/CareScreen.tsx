import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "../components/Icon";
import { api } from "../lib/api";
import type { Caregiver, CareActivity, RestockAlert, Pet } from "../types";
import type { MedicationDetail } from "../../../shared/contract";

export function CareScreen({
  goHome,
  sendTreat,
  pet,
  caregiver,
  careActivity,
  restockAlert,
}: {
  goHome: () => void;
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

  return (
    <section className="content-card full-card">
      <button className="back-button" onClick={goHome}><Icon name="back" size={20} /> {t("common.home")}</button>
      <div className="card-heading">
        <div><p className="eyebrow green">{t("care.eyebrow")}</p><h2>{t("care.title", { name: dogName })}</h2></div>
        <span className="score-orb">{pet.careScore}%</span>
      </div>
      <p className="supporting">{t("care.supporting")}</p>
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
                  <div>
                    <strong>{med.name}</strong>
                    {med.strength && <small> · {med.strength}</small>}
                    {med.prescribedFor && <small><br />Doctor said: {med.prescribedFor}</small>}
                    {med.daysOfSupply !== null && <small> · {med.daysOfSupply} days left</small>}
                  </div>
                  <button className="text-button" onClick={() => startEdit(med)}>Edit</button>
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
    </section>
  );
}
