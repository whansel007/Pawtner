import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "../components/Icon";
import { FullCard } from "../components/FullCard";
import type { BackAction } from "../lib/navigation";
import { api } from "../lib/api";

interface Slot {
  label: string;
  time: string;
  note: string;
}

export function ScheduleScreen({
  back,
  onConfirm,
  petName,
  medicationId,
}: {
  back: BackAction;
  onConfirm: () => void;
  petName: string;
  medicationId?: string;
}) {
  const { t } = useTranslation();
  const today = new Date().toISOString().slice(0, 10);
  const [slots, setSlots] = useState<Slot[]>([
    { label: "Morning", time: "09:00", note: "After breakfast" },
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const addSlot = () => setSlots([...slots, { label: "Dose", time: "12:00", note: "" }]);
  const removeSlot = (idx: number) => setSlots(slots.filter((_, i) => i !== idx));
  const updateSlot = (idx: number, field: keyof Slot, value: string) =>
    setSlots(slots.map((s, i) => i === idx ? { ...s, [field]: value } : s));

  const save = async () => {
    if (!medicationId) { onConfirm(); return; }
    setSaving(true);
    setError("");
    try {
      for (const slot of slots) {
        await api.createSchedule({
          medicationId,
          scheduledTime: slot.time,
          startsOn: today,
        });
      }
      onConfirm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save schedule");
    } finally {
      setSaving(false);
    }
  };

  return (
    <FullCard back={back}>
      <p className="eyebrow green">{t("schedule.eyebrow")}</p>
      <h2>{t("schedule.title", { name: petName })}</h2>
      <p className="supporting">{t("schedule.supporting")}</p>
      {slots.map((slot, idx) => (
        <div className="schedule-choice" key={idx}>
          <input type="time" value={slot.time} onChange={(e) => updateSlot(idx, "time", e.target.value)} aria-label={`${slot.label} time`} />
          <input type="text" value={slot.note} onChange={(e) => updateSlot(idx, "note", e.target.value)} placeholder="Note (optional)" aria-label="Schedule note" />
          {slots.length > 1 && <button className="text-button" onClick={() => removeSlot(idx)}>Remove</button>}
        </div>
      ))}
      <button className="text-button" onClick={addSlot}>Add another time</button>
      <div className="dog-message"><Icon name="bell" /><p><strong>{petName} will give a gentle woof.</strong><br />{t("schedule.noAlarm")}</p></div>
      {error && <p className="error-text">{error}</p>}
      <button className="primary-button" disabled={saving} onClick={save}>
        {saving ? "Saving…" : t("schedule.confirm", { name: petName })}
      </button>
    </FullCard>
  );
}
