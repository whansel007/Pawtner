import { useTranslation } from "react-i18next";
import { useState } from "react";
import type { CareData, Caretaker } from "../data/types";
import type { TreatStatus } from "../hooks/useCareTreat";
import type { RestockRequest } from "../../../../shared/contract";
import { formatCalendarDay, formatWeekday } from "../lib/format";
import { careUpdates, progressPercent, RHYTHM_MIN_HEARTS, stoppedMedicineDay, streakHearts, todayProgress, todayState, weekRhythm } from "../lib/rules";
import { SENIOR_TIMEZONE } from "../../config/scene";
import { CareBadge, CareCard, PageWelcome } from "../components/CareCard";
import { CareNotice } from "../components/CareNotice";
import { CareDog } from "../components/CareDog";
import { ProgressRing } from "../components/ProgressRing";
import { StreakHearts } from "../components/StreakHearts";

interface WeekPageProps {
  data: CareData;
  viewer: Caretaker;
  offline: boolean;
  treatStatus: TreatStatus;
  onSendTreat: (message: string) => void;
  /** The senior's pending "help with a refill" request (demo: lib/restockHelp.ts). Never names the medicine. */
  restockRequests: RestockRequest[];
  onHandleRestock: (id: string) => void;
  /** "Questions for the doctor": the senior's shared notes plus the API's questions, newest first (doctorQuestionsForCare). */
  doctorQuestions: Array<{ note: string; occurredAt: string }>;
  /** Latest reading, only when the senior shares her blood pressure (Settings on her phone); else null. */
  latestBloodPressure: { systolic: number; diastolic: number; recordedAt: string } | null;
}

export function WeekPage({ data, viewer, offline, treatStatus, onSendTreat, restockRequests, onHandleRestock, doctorQuestions, latestBloodPressure }: WeekPageProps) {
  const { t, i18n } = useTranslation();
  // Thank-you line after "I'll handle it" (and when it was tapped, to order it among the updates), until the page changes.
  const [handledHere, setHandledHere] = useState<Record<string, string>>({});
  const locale = i18n.language;
  const now = new Date();
  const senior = data.summary.senior.name;
  const dog = data.today.dog;

  const progress = todayProgress(data.today.activities, data.today.doses);
  const state = todayState(progress);
  const stateText = (part: string) => t(`care.web.week.state.${state}.${part}`, { done: progress.done, total: progress.total, dog: dog.name });
  const stateBadge = state === "allDone" || state === "onTrack" ? <CareBadge>{stateText("badge")}</CareBadge> : null;

  const hearts = streakHearts(dog.streak);
  // Sunday to Saturday; past days filled when Buddy ended them on 2+ hearts (lib/rules.ts weekRhythm).
  const streakDays = weekRhythm(now, data.summary.dayHearts).map((day) => ({ key: day.date.toISOString(), label: formatWeekday(day.date, locale, "narrow"), filled: day.filled }));


  const [latestQuestion, ...earlierQuestions] = doctorQuestions;
  // One "{{dog}}'s updates" card: check-in (check-ins caretakers only), a stopped medicine (never its name), the refill request.
  const updates = careUpdates(data.summary, viewer, restockRequests, handledHere);

  return (
    <div className="care-content care-page-enter">
      <PageWelcome
        eyebrow={t("care.web.week.eyebrow", { day: formatWeekday(now, locale) })}
        title={t("care.web.week.title", { name: senior })}
        intro={t("care.web.week.intro")}
        aside={<CareDog name={dog.name} mood={dog.mood} size="small" />}
      />

      <div className="care-grid care-grid--week">
        {updates.length > 0 && (
          <CareCard title={t("care.web.week.updatesTitle", { dog: dog.name })} stitched className="care-restock care-updates">
            <ul className="care-updates__list">
              {updates.map((update) => (
                <li className="care-updates__item" key={update.kind === "refill" ? `refill-${update.request.id}` : update.kind === "refillHandled" ? `handled-${update.id}` : update.kind}>
                  {update.kind === "checkIn" && (
                    <>
                      <p className="care-eyebrow">{t("care.web.week.checkInEyebrow")}</p>
                      <h3 className="care-updates__title">{t("care.web.week.checkInTitle", { name: senior, count: update.checkIn.missedDays, day: formatCalendarDay(update.checkIn.lastMissedDay, locale) })}</h3>
                      <p className="care-hint">{t("care.web.week.checkInBody", { name: senior })}</p>
                    </>
                  )}
                  {update.kind === "stopped" && (
                    <>
                      <h3 className="care-updates__title">{t("care.web.week.stoppedTitle")}</h3>
                      <p className="care-hint">{t("care.web.week.stoppedDay", { day: formatCalendarDay(stoppedMedicineDay({ stoppedAt: update.at }, SENIOR_TIMEZONE)!, locale) })}</p>
                    </>
                  )}
                  {update.kind === "refill" && (
                    <>
                      <p className="care-eyebrow">{t("care.web.week.restockEyebrow")}</p>
                      <h3 className="care-updates__title">{t("care.web.week.restockTitle", { name: senior, medicine: update.request.medicationName, count: update.request.daysLeft })}</h3>
                      <p className="care-hint">{t("care.web.week.restockBody", { name: senior, day: formatWeekday(update.request.requestedAt, locale) })}</p>
                      <button
                        className="care-primary-button care-primary-button--card"
                        type="button"
                        onClick={() => { const id = update.request.id; onHandleRestock(id); setHandledHere((current) => ({ ...current, [id]: new Date().toISOString() })); }}
                      >
                        {t("care.web.week.restockHandle")}
                      </button>
                    </>
                  )}
                  {update.kind === "refillHandled" && (
                    <>
                      <p className="care-eyebrow">{t("care.web.week.restockEyebrow")}</p>
                      <h3 className="care-updates__title">{t("care.web.week.restockHandled", { name: senior })}</h3>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </CareCard>
        )}

        <CareCard eyebrow={t("care.web.week.todayEyebrow")} title={stateText("title")} badge={stateBadge} stitched className="care-today">
          <div className="care-progress">
            <ProgressRing
              percent={progressPercent(progress)}
              value={t("care.web.week.ringValue", { done: progress.done, total: progress.total })}
              caption={t("care.web.week.ringCaption")}
              label={t("care.web.week.ringLabel", { done: progress.done, total: progress.total })}
            />
            <div className="care-progress__copy">
              <strong>{stateText("lead")}</strong>
              <p>{stateText("body")}</p>
            </div>
          </div>
        </CareCard>

        <CareCard
          title={t("care.web.week.streakEyebrow")}
          badge={dog.streak >= hearts.length ? <CareBadge tone="rose">{t("care.web.week.streakBadge")}</CareBadge> : null}
        >
          {/* "N-day streak" under the title; the hearts below are this week, Sunday to Saturday, filled by Buddy's hearts. */}
          <p className="care-streak__count">{t("care.web.week.streakTitle", { count: dog.streak })}</p>
          <StreakHearts days={streakDays} label={t("care.web.week.rhythmLabel", { dog: dog.name, count: RHYTHM_MIN_HEARTS })} />
        </CareCard>


        <CareCard eyebrow={t("care.web.week.treatEyebrow")} title={t("care.web.week.treatTitle", { dog: dog.name })} className="care-treat">
          <p className="care-hint">{t("care.web.week.treatBody", { name: senior })}</p>
          <button
            className="care-primary-button care-primary-button--card"
            type="button"
            disabled={offline || treatStatus === "sending"}
            onClick={() => onSendTreat(t("care.web.week.treatMessage", { caretaker: viewer.name, dog: dog.name }))}
          >
            {treatStatus === "sending" ? t("care.web.week.treatSending") : t("care.web.week.treatButton", { dog: dog.name })}
          </button>
          {offline && <CareNotice tone="warm">{t("care.web.week.treatOffline")}</CareNotice>}
          <div className="care-live" role="status">
            {!offline && treatStatus === "sent" && t("care.web.week.treatSent", { name: senior, dog: dog.name })}
            {!offline && treatStatus === "failed" && t("care.web.week.treatFailed")}
          </div>
        </CareCard>

        {latestBloodPressure && (
          <CareCard eyebrow={t("care.web.week.bpEyebrow", { name: senior })} title={t("care.web.week.bpTitle")} stitched className="care-bp">
            <p className="care-bp__value">{t("care.web.week.bpValue", { systolic: latestBloodPressure.systolic, diastolic: latestBloodPressure.diastolic })}</p>
            <p className="care-hint">{t("care.web.week.bpLogged", { day: formatWeekday(latestBloodPressure.recordedAt, locale) })}</p>
          </CareCard>
        )}

        <CareCard eyebrow={t("care.web.week.questionsEyebrow", { name: senior })} title={t("care.web.week.questionsTitle")} stitched className="care-questions">
          <span className="care-questions__pin" aria-hidden="true" />
          {latestQuestion ? (
            <>
              <blockquote>{latestQuestion.note}</blockquote>
              <p className="care-questions__note">
                {t("care.web.week.questionsSaved", { day: formatWeekday(latestQuestion.occurredAt, locale) })}
              </p>
              {earlierQuestions.length > 0 && (
                <>
                  <h3 className="care-questions__more">{t("care.web.week.questionsEarlier")}</h3>
                  <ul className="care-questions__list">
                    {earlierQuestions.map((question) => (
                      <li key={`${question.occurredAt}-${question.note}`}>{question.note}</li>
                    ))}
                  </ul>
                </>
              )}
            </>
          ) : (
            <p className="care-empty">{t("care.web.week.questionsEmpty")}</p>
          )}
        </CareCard>
      </div>
    </div>
  );
}
