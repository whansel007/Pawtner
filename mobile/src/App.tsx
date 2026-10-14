import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "./components/Icon";
import { TopZone } from "./screens/TopZone";
import { HomeScreen } from "./screens/HomeScreen";
import { CareScreen } from "./screens/CareScreen";
import { RemindersScreen } from "./screens/RemindersScreen";
import { PrescriptionScreen } from "./screens/PrescriptionScreen";
import { ExplanationScreen } from "./screens/ExplanationScreen";
import { ScheduleScreen } from "./screens/ScheduleScreen";
import { ProofScreen } from "./screens/ProofScreen";
import { WalkScreen } from "./screens/WalkScreen";
import { MilestonesScreen } from "./screens/MilestonesScreen";
import { CustomizeScreen } from "./screens/CustomizeScreen";
import { HealthScreen } from "./screens/HealthScreen";
import { WeeklySummaryScreen } from "./screens/WeeklySummaryScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { ScreeningScreen } from "./screens/ScreeningScreen";
import { CoverScreen } from "./screens/CoverScreen";
import { DedicationScreen } from "./screens/DedicationScreen";
import { BottomNav } from "./screens/BottomNav";
import { DesktopBackdrop, SceneBackdrop } from "./components/SceneBackdrop";
import { DogLayer } from "./components/DogLayer";
import { DEFAULT_PHASE } from "./config/scene";
import { selectDogMood } from "../../shared/rules";
import { DEMO_RULES } from "../../shared/config";
import type { CaretakerSummaryResponse, DerivedDose, TodayResponse } from "../../shared/contract";
import { api } from "./lib/api";
import type { Screen, World, Accessory } from "./types";
import {
  pet,
  doses,
  todayDoses,
  medication,
  medicationExplanation,
  nudgeSettings,
  weekSummary,
  bloodPressureReading,
  screeningInfo,
  activityLink,
  clinicTasks,
  caregiver,
  careActivity,
  restockAlert,
  currentWorld,
  tricks,
  souvenirs,
  worldOptions,
  accessoryOptions,
  walkStats,
} from "./mock";

export default function App() {
  const { t } = useTranslation();
  const [screen, setScreen] = useState<Screen>("cover");
  const [doseList, setDoseList] = useState<DerivedDose[]>(todayDoses);
  const [pendingDoseId, setPendingDoseId] = useState<string | null>(null);
  const [bpLogged, setBpLogged] = useState(false);
  const [world, setWorld] = useState<World>("garden");
  const [accessory, setAccessory] = useState<Accessory>("none");
  const [toast, setToast] = useState("");
  const [today, setToday] = useState<TodayResponse | null>(null);
  const [careSummary, setCareSummary] = useState<CaretakerSummaryResponse | null>(null);
  const [walkStartedAt, setWalkStartedAt] = useState<string | null>(null);
  const [apiError, setApiError] = useState("");

  const refreshToday = async () => {
    try { const result = await api.today(); setToday(result); setDoseList(result.doses); setBpLogged(result.bloodPressureLoggedToday); setApiError(""); }
    catch (error) { setApiError(error instanceof Error ? error.message : "Could not connect to Pawtner API"); }
  };
  useEffect(() => { void refreshToday(); }, []);
  useEffect(() => {
    if (screen === "care" || screen === "summary") void api.caretakerSummary().then(setCareSummary).catch((error) => setApiError(error instanceof Error ? error.message : "Could not load care summary"));
  }, [screen]);

  const takenCount = doseList.filter((d) => d.status === "taken").length;
  const heartCount = today?.dog.heart ?? Math.min(DEMO_RULES.heartMaximum, 1 + takenCount + (bpLogged ? 1 : 0));
  const mood = today ? today.dog.mood : selectDogMood(heartCount, null);
  const phase = DEFAULT_PHASE;

  const dogName = today?.dog.name.toLowerCase() ?? pet.name;
  const caretakerName = careSummary?.caregiver?.name ?? caregiver.caretakerName;
  const livePet = { ...pet, name: dogName, heartCount, streak: today?.dog.streak ?? pet.streak, careScore: careSummary?.careScore ?? pet.careScore, caringDays: careSummary?.caringDays ?? pet.caringDays };
  const liveCaregiver = careSummary?.caregiver ? { ...caregiver, caretakerName: careSummary.caregiver.name, names: `${careSummary.senior.name} + ${careSummary.caregiver.name}` } : caregiver;
  const liveCareActivity = careSummary ? { ...careActivity, dosesTaken: `${careSummary.dosesTaken} of ${careSummary.dosesDue}`, dosesTakenCount: careSummary.dosesTaken, dosesTotal: careSummary.dosesDue, walkDistance: `${(careSummary.walkDistanceMeters / 1000).toFixed(1)} km`, description: careSummary.caringMoments[0]?.message ?? "Care routine activity", timestamp: careSummary.latestActivityAt ? new Date(careSummary.latestActivityAt).toLocaleString() : "No recent activity" } : careActivity;

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2400);
  };

  return (
    <>
    <DesktopBackdrop phase={phase} />
    <main className={`app-shell world-${world}`}>
      {screen === "cover" && <CoverScreen onContinue={() => setScreen("dedication")} />}
      {screen === "dedication" && <DedicationScreen onContinue={() => setScreen("home")} />}
      {screen !== "cover" && screen !== "dedication" && (
        <>
      <SceneBackdrop phase={phase} />
      <div className="scene-shade" />
      <DogLayer
        screen={screen}
        mood={mood}
        dogName={dogName}
        accessory={accessory !== "none" && <span className={`pet-accessory accessory-${accessory}`} aria-label={t("toast.petAccessoryAria", { name: dogName, item: accessory })}><i /><i /></span>}
      />
      <TopZone onSettings={() => setScreen("settings")} pet={livePet} />
      {apiError && <div className="toast" role="alert">API: {apiError}</div>}
      <div className={`screen-stage screen-${screen}`}>
        {screen === "home" && (
          <HomeScreen
            todayDoses={doseList}
            pet={livePet}
            onTakenDose={(doseId) => {
              setPendingDoseId(doseId);
              setScreen("proof");
            }}
            onReminders={() => setScreen("reminders")}
            onTreat={() => notify(t("toast.treatWaiting", { name: dogName, caretaker: caretakerName }))}
            onWalk={() => setScreen("walk")}
            onBloodPressure={() => setScreen("health")}
          />
        )}
        {screen === "care" && <CareScreen goHome={() => setScreen("home")} sendTreat={() => notify(t("toast.treatSent", { name: dogName }))} pet={livePet} caregiver={liveCaregiver} careActivity={liveCareActivity} restockAlert={restockAlert} />}
        {screen === "reminders" && <RemindersScreen goHome={() => setScreen("home")} doses={doses} />}
        {screen === "prescription" && <PrescriptionScreen goHome={() => setScreen("home")} onExplain={() => setScreen("explanation")} medication={medication} petName={dogName} />}
        {screen === "explanation" && <ExplanationScreen onBack={() => setScreen("prescription")} onContinue={() => setScreen("schedule")} medicationExplanation={medicationExplanation} />}
        {screen === "schedule" && <ScheduleScreen onBack={() => setScreen("explanation")} onConfirm={() => { setScreen("home"); notify(t("toast.nudgeSet", { name: dogName })); }} nudgeSettings={nudgeSettings} petName={dogName} />}
        {screen === "proof" && <ProofScreen onBack={() => setScreen("home")} onVerified={async () => { const dose = doseList.find((item) => item.id === pendingDoseId); if (!dose) return; try { const result = await api.doseEvent({ scheduleId: dose.id, scheduledFor: dose.scheduledAt, event: "taken", occurredAt: new Date().toISOString() }); setToday(result.today); setDoseList(result.today.doses); setScreen("home"); notify(t("toast.heartGained", { name: dogName })); } catch (error) { setApiError(error instanceof Error ? error.message : "Could not record dose"); } }} medication={medication} petName={dogName} />}
        {screen === "walk" && <WalkScreen goHome={() => setScreen("home")} walkStats={walkStats} petName={dogName} onWalkState={(walking) => { if (walking) setWalkStartedAt(new Date().toISOString()); else if (walkStartedAt) { void api.walkSession({ startedAt: walkStartedAt, finishedAt: new Date().toISOString(), distanceMeters: 0, fastStretchOccurred: false }).then(() => api.caretakerSummary().then(setCareSummary)).catch((error) => setApiError(error instanceof Error ? error.message : "Could not save walk")); setWalkStartedAt(null); } }} />}
        {screen === "milestones" && <MilestonesScreen goHome={() => setScreen("home")} onWalk={() => setScreen("walk")} onCustomize={() => setScreen("customize")} pet={pet} currentWorld={currentWorld} tricks={tricks} souvenirs={souvenirs} petName={dogName} />}
        {screen === "health" && <HealthScreen goHome={() => setScreen("home")} bpLogged={bpLogged} logBp={async (systolic, diastolic) => { try { await api.healthMetric({ systolic, diastolic, recordedAt: new Date().toISOString() }); setBpLogged(true); await refreshToday(); notify(t("toast.bpLogged", { name: dogName })); } catch (error) { setApiError(error instanceof Error ? error.message : "Could not save reading"); } }} onScreening={() => setScreen("screening")} onSummary={() => setScreen("summary")} bloodPressureReading={today?.healthMetrics[0] ? { ...bloodPressureReading, systolic: today.healthMetrics[0].systolic, diastolic: today.healthMetrics[0].diastolic, note: today.healthMetrics[0].note ?? "Logged today" } : bloodPressureReading} screeningInfo={screeningInfo} activityLink={activityLink} clinicTasks={clinicTasks} weekSummary={weekSummary} petName={dogName} />}
        {screen === "screening" && <ScreeningScreen onBack={() => setScreen("health")} screeningInfo={screeningInfo} petName={dogName} />}
        {screen === "summary" && <WeeklySummaryScreen onBack={() => setScreen("health")} weekSummary={careSummary ? { ...weekSummary, caringDays: careSummary.caringDays, metrics: [{ ...weekSummary.metrics[0], value: `${careSummary.dosesTaken}/${careSummary.dosesDue}` }, { ...weekSummary.metrics[1], value: `${careSummary.walkCount}` }], doctorQuestion: careSummary.doctorQuestions[0]?.note ?? weekSummary.doctorQuestion } : weekSummary} />}
        {screen === "settings" && <SettingsScreen goHome={() => setScreen("home")} addMedication={() => setScreen("prescription")} openCaretaker={() => setScreen("care")} openReminders={() => setScreen("reminders")} caregiver={caregiver} petName={dogName} />}
        {screen === "customize" && <CustomizeScreen onBack={() => setScreen("milestones")} world={world} setWorld={(nextWorld) => { setWorld(nextWorld); notify(nextWorld === "flat" ? t("toast.worldFlat", { name: dogName }) : nextWorld === "garden" ? t("toast.worldGarden", { name: dogName }) : t("toast.worldKampung", { name: dogName })); }} accessory={accessory} setAccessory={(nextAccessory) => { setAccessory(nextAccessory); notify(nextAccessory === "none" ? t("toast.accessoryNone", { name: dogName }) : t("toast.accessoryOn", { name: dogName, item: nextAccessory })); }} worldOptions={worldOptions} accessoryOptions={accessoryOptions} petName={dogName} />}
      </div>
      <div className="bottom-dock" aria-hidden="true" />
      <BottomNav screen={screen} navigate={setScreen} />
      <span className="woof-bubble">woof!</span>
      <button className="add-button companion-button" onClick={() => notify(t("toast.hello", { name: dogName }))} aria-label={t("toast.hello", { name: dogName })}><Icon name="paw" size={29} /></button>
      {toast && <div className="toast">{toast}</div>}
        </>
      )}
    </main>
    </>
  );
}
