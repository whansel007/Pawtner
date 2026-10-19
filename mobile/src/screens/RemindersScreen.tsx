import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "../components/Icon";
import { FullCard } from "../components/FullCard";
import type { BackAction } from "../lib/navigation";
import type { DerivedDose } from "../../../shared/contract";
import { formatDayDate, formatDoseTime, minutesUntil, selectNextDose } from "../lib/doses";
import { SENIOR_TIMEZONE } from "../config/scene";
import { formatStrength } from "../lib/strength";
import type { RemindersParts } from "../config/reminders";

export function RemindersScreen({
  back,
  doses,
  now,
  restockCard,
  parts,
}: {
  back: BackAction;
  doses: DerivedDose[];
  /** ISO "now" for the countdown and today's date (the agent demo clock when set, else real time). */
  now: string;
  /** "Restock soon" card (App decides when it shows). */
  restockCard?: ReactNode;
  /** Which parts show, chosen by the way in (lib/reminders.ts remindersParts). */
  parts: RemindersParts;
}) {
  const { t } = useTranslation();
  // Same pick as Home's next-dose card: the earliest due or missed dose, else the next upcoming one.
  const nextDose = selectNextDose(doses);
  const minutes = nextDose ? minutesUntil(nextDose.scheduledAt, now) : 0;
  const countdown = minutes <= 0
    ? t("home.stillToTake")
    : minutes < 60
      ? t("reminders.nextDoseInMinutes", { minutes })
      : t("reminders.nextDoseInHours", { hours: Math.floor(minutes / 60), minutes: minutes % 60 });
  return (
    <FullCard back={back}>
      <p className="eyebrow green">{t("reminders.eyebrow")}</p>
      <h2>{t("reminders.title")}</h2>
      {restockCard}
      {parts.nextDose && nextDose && (
        <div className="next-dose">
          <span className="feature-icon sage"><Icon name="bell" /></span>
          <div><small>{t("reminders.nextDose")}</small><h3>{countdown}</h3><p>{t("reminders.nextDoseName", { name: nextDose.medicationName, time: formatDoseTime(nextDose.scheduledAt) })}</p></div>
        </div>
      )}
      <div className="section-title"><h3>{t("reminders.today")}</h3><span>{formatDayDate(now, SENIOR_TIMEZONE)}</span></div>
      <div className="timeline">
        {doses.map((dose, index) => (
          <article key={dose.id}>
            <span className={`timeline-dot ${dose.status === "taken" ? "complete" : ""}`} />
            <time>{formatDoseTime(dose.scheduledAt)}</time>
            <div><h3>{dose.medicationName}</h3><p>{formatStrength(dose.strength)}</p></div>
            <span className={`status-tag ${dose.status === "due" ? "now" : ""}`}>{dose.status === "taken" ? t("reminders.statusDone") : dose.status === "due" ? t("reminders.statusSoon") : t("reminders.statusLater")}</span>
          </article>
        ))}
      </div>
    </FullCard>
  );
}
