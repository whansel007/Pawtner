import { useTranslation } from "react-i18next";
import type { CareData, Caretaker } from "../data/types";
import { formatMomentTime, formatWeekday } from "../lib/format";
import { progressPercent, recentDays, streakHearts, todayProgress, todayState, visibleMoments } from "../lib/rules";
import { CareBadge, CareCard, PageWelcome } from "../components/CareCard";
import { CareDog } from "../components/CareDog";
import { MomentList } from "../components/MomentList";
import { ProgressRing } from "../components/ProgressRing";
import { StreakHearts } from "../components/StreakHearts";

export function WeekPage({ data, viewer }: { data: CareData; viewer: Caretaker }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const now = new Date();
  const senior = data.summary.senior.name;
  const dog = data.today.dog;

  const progress = todayProgress(data.today.doses);
  const state = todayState(progress);
  const stateText = (part: string) => t(`care.web.week.state.${state}.${part}`, { done: progress.done, total: progress.total, dog: dog.name });
  const stateBadge = state === "allDone" || state === "onTrack" ? <CareBadge>{stateText("badge")}</CareBadge> : null;

  const hearts = streakHearts(dog.streak);
  const streakDays = recentDays(now).map((date, index) => ({ key: date.toISOString(), label: formatWeekday(date, locale, "narrow"), filled: hearts[index] }));

  const moments = visibleMoments(data.summary.caringMoments, viewer).map((moment) => ({
    moment,
    kindLabel: t(`care.web.week.momentKind.${moment.kind}`),
    time: formatMomentTime(moment.occurredAt, locale),
  }));

  const [latestQuestion, ...earlierQuestions] = data.summary.doctorQuestions;

  return (
    <div className="care-content care-page-enter">
      <PageWelcome
        eyebrow={t("care.web.week.eyebrow", { day: formatWeekday(now, locale) })}
        title={t("care.web.week.title", { name: senior })}
        intro={t("care.web.week.intro")}
        aside={<CareDog name={dog.name} mood={dog.mood} size="small" />}
      />

      <div className="care-grid">
        <CareCard eyebrow={t("care.web.week.todayEyebrow")} title={stateText("title")} badge={stateBadge} stitched>
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
          eyebrow={t("care.web.week.streakEyebrow")}
          title={t("care.web.week.streakTitle", { count: dog.streak })}
          badge={dog.streak >= hearts.length ? <CareBadge tone="rose">{t("care.web.week.streakBadge")}</CareBadge> : null}
        >
          <StreakHearts days={streakDays} label={t("care.web.week.streakLabel", { count: dog.streak, days: hearts.length })} />
        </CareCard>

        <CareCard
          eyebrow={t("care.web.week.momentsEyebrow")}
          title={t("care.web.week.momentsTitle")}
          badge={<span className="care-card__meta">{t("care.web.week.momentsWhen")}</span>}
        >
          <MomentList rows={moments} emptyText={t("care.web.week.momentsEmpty")} />
        </CareCard>

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
