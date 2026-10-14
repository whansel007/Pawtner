import { useTranslation } from "react-i18next";
import type { CareData, Caretaker } from "../data/types";
import { visibleMoments } from "../lib/rules";
import { CareCard, PageWelcome } from "../components/CareCard";
import { CareDog } from "../components/CareDog";

/** Read-only: names come from the phone's data; no toggles. Medication editing is not on the web yet. */
export function SettingsPage({ data, viewer }: { data: CareData; viewer: Caretaker }) {
  const { t } = useTranslation();
  const senior = data.summary.senior.name;
  const dog = data.today.dog;
  const momentCount = visibleMoments(data.summary.caringMoments, viewer).length;
  const weeklyNote = [
    t("care.web.settings.walks", { count: data.summary.walkCount, dog: dog.name }),
    t("care.web.settings.questions", { count: data.summary.doctorQuestions.length }),
  ].join(" · ");

  return (
    <div className="care-content care-page-enter">
      <PageWelcome
        eyebrow={t("care.web.settings.eyebrow")}
        title={t("care.web.settings.title")}
        intro={t("care.web.settings.intro", { name: senior })}
        aside={<CareDog name={dog.name} mood={dog.mood} size="small" />}
      />

      <div className="care-grid">
        <CareCard eyebrow={t("care.web.settings.namesEyebrow")} title={t("care.web.settings.namesTitle")} stitched>
          <dl className="care-names">
            <div>
              <dt>{t("care.web.settings.dogName")}</dt>
              <dd>{dog.name}</dd>
            </div>
            <div>
              <dt>{t("care.web.settings.seniorName")}</dt>
              <dd>{senior}</dd>
            </div>
          </dl>
          <p className="care-hint">{t("care.web.settings.namesNote", { name: senior })}</p>
          <p className="care-soon">
            <span aria-hidden="true">✦</span>
            {t("care.web.settings.medsSoon")}
          </p>
        </CareCard>

        <CareCard eyebrow={t("care.web.settings.summaryEyebrow")} title={t("care.web.settings.summaryTitle")}>
          <p className="care-hint">{t("care.web.settings.summaryIntro")}</p>
          <div className="care-summary care-stitched">
            <p className="care-summary__label">{t("care.web.settings.previewLabel")}</p>
            <p className="care-summary__names">{t("care.web.settings.previewNames", { senior, dog: dog.name })}</p>
            <dl className="care-summary__stats">
              <div>
                <dt>{t("care.web.settings.momentsStat", { count: momentCount })}</dt>
                <dd>{momentCount}</dd>
              </div>
              <div>
                <dt>{t("care.web.settings.streakStatLabel")}</dt>
                <dd>{t("care.web.settings.streakStat", { count: dog.streak })}</dd>
              </div>
            </dl>
            <p className="care-summary__note">{weeklyNote}</p>
          </div>
        </CareCard>
      </div>
    </div>
  );
}
