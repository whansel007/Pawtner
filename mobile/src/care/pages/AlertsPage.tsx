import { useTranslation } from "react-i18next";
import type { CareData, Caretaker } from "../data/types";
import type { SaveStatus } from "../hooks/useCareData";
import { canDecreaseThreshold, checkInLock, MIN_CHECK_IN_THRESHOLD, stepThreshold } from "../lib/rules";
import { CareBadge, CareCard, PageWelcome } from "../components/CareCard";
import { CareDog } from "../components/CareDog";
import { CareNotice } from "../components/CareNotice";
import { CaretakerList } from "../components/CaretakerList";
import { ThresholdStepper } from "../components/ThresholdStepper";

interface AlertsPageProps {
  data: CareData;
  caretakers: readonly Caretaker[];
  viewer: Caretaker;
  offline: boolean;
  saveStatus: SaveStatus;
  pendingThreshold: number | null;
  onSaveThreshold: (threshold: number) => void;
  /** Turns check-ins on or off (the caretaker decides here; the senior's phone no longer has this setting). */
  onSaveConsent: (optedIn: boolean) => void;
}

export function AlertsPage({ data, caretakers, viewer, offline, saveStatus, pendingThreshold, onSaveThreshold, onSaveConsent }: AlertsPageProps) {
  const { t } = useTranslation();
  const senior = data.summary.senior.name;
  const dog = data.today.dog;
  const { optedIn } = data.escalation;
  const threshold = pendingThreshold ?? data.escalation.threshold;
  const lock = checkInLock({ receivesCheckIns: viewer.receivesCheckIns, optedIn, offline });
  // The on/off switch: check-ins caretakers only, and saving needs the API.
  const canSwitch = viewer.receivesCheckIns && !offline;

  const saveMessage = {
    idle: null,
    saving: t("care.web.alerts.saving"),
    saved: t("care.web.alerts.saved", { count: threshold }),
    failed: t("care.web.alerts.saveFailed"),
  }[saveStatus];

  return (
    <div className="care-content care-page-enter">
      <PageWelcome
        eyebrow={t("care.web.alerts.eyebrow")}
        title={t("care.web.alerts.title")}
        intro={t("care.web.alerts.intro", { name: senior })}
        aside={<CareDog name={dog.name} mood={dog.mood} size="small" />}
      />

      <div className="care-grid care-grid--alerts">
        <CareCard
          eyebrow={t("care.web.alerts.cardEyebrow")}
          title={t("care.web.alerts.cardTitle")}
          stitched
          badge={<CareBadge tone={optedIn ? "moss" : "rose"}>{t(optedIn ? "care.web.alerts.consentBadge" : "care.web.alerts.noConsentBadge")}</CareBadge>}
        >
          {(() => {
            const content = (
              <>
                <span className="care-consent__mark" aria-hidden="true">{optedIn ? "✓" : "·"}</span>
                <span>
                  <strong>{t(optedIn ? "care.web.alerts.consentOn" : "care.web.alerts.consentOff", { name: senior })}</strong>
                  <span className="care-consent__sub">{t(canSwitch ? "care.web.alerts.consentSwitchSub" : optedIn ? "care.web.alerts.consentOnSub" : "care.web.alerts.consentOffSub", { name: senior })}</span>
                </span>
              </>
            );
            return canSwitch ? (
              <button type="button" role="switch" aria-checked={optedIn} aria-label={t("care.web.alerts.consentSwitchLabel")} className={`care-consent care-consent--switch ${optedIn ? "is-on" : ""}`}
                disabled={saveStatus === "saving"} onClick={() => onSaveConsent(!optedIn)}>
                {content}
              </button>
            ) : <div className={`care-consent ${optedIn ? "is-on" : ""}`}>{content}</div>;
          })()}

          <ThresholdStepper
            value={threshold}
            editable={lock === null}
            canDecrease={canDecreaseThreshold(threshold)}
            busy={saveStatus === "saving"}
            onStep={(delta) => onSaveThreshold(stepThreshold(threshold, delta))}
          />
          {lock === null && !canDecreaseThreshold(threshold) && (
            <p className="care-hint">{t("care.web.alerts.minimumNote", { count: MIN_CHECK_IN_THRESHOLD })}</p>
          )}
          {lock !== null && <CareNotice tone={lock === "offline" ? "warm" : "calm"}>{t(`care.web.alerts.lock.${lock}`, { name: senior })}</CareNotice>}
          <div className="care-live" role="status">{lock === null ? saveMessage : null}</div>

          <figure className="care-preview">
            <figcaption className="care-preview__label">{t("care.web.alerts.previewLabel")}</figcaption>
            <blockquote>{t("care.web.alerts.preview", { name: senior, count: threshold })}</blockquote>
            <p className="care-preview__note">{t("care.web.alerts.previewNote")}</p>
          </figure>
        </CareCard>

        <CareCard
          eyebrow={t("care.web.alerts.listEyebrow")}
          title={t("care.web.alerts.listTitle")}
          badge={<CareBadge>{t("care.web.alerts.listCount", { count: caretakers.length })}</CareBadge>}
        >
          <CaretakerList caretakers={caretakers} viewerSlot={viewer.slot} />
        </CareCard>
      </div>
    </div>
  );
}
