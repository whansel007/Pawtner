import { useState } from "react";
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
import type { AgentDecision, DerivedDose, HealthMetric } from "../../shared/contract";
import { requestDecision, buildAgentInputFromState } from "./lib/agent";
import type { Screen, World, Accessory } from "./types";
import {
  pet,
  doses,
  todayDoses,
  demoUser,
  demoDog,
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
  const [healthMetrics, setHealthMetrics] = useState<HealthMetric[]>([]);
  const [latestDecision, setLatestDecision] = useState<AgentDecision | null>(null);
  const [world, setWorld] = useState<World>("garden");
  const [accessory, setAccessory] = useState<Accessory>("none");
  const [toast, setToast] = useState("");

  const takenCount = doseList.filter((d) => d.status === "taken").length;
  const heartCount = Math.min(DEMO_RULES.heartMaximum, 1 + takenCount + (bpLogged ? 1 : 0));
  // Mock state: latestDecision is set when a BP reading is logged and resets on page reload.
  const mood = selectDogMood(heartCount, latestDecision);
  const phase = DEFAULT_PHASE;

  const dogName = pet.name;
  const caretakerName = caregiver.caretakerName;

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2400);
  };

  async function handleLogBp(metric: HealthMetric) {
    setHealthMetrics((prev) => [...prev, metric]);
    setBpLogged(true);
    const updatedMetrics = [...healthMetrics, metric];
    const input = buildAgentInputFromState({
      now: new Date().toISOString(),
      userId: demoUser.id,
      dogId: demoDog.id,
      dogName: pet.name,
      heart: heartCount,
      streak: pet.streak,
      doses: doseList,
      healthMetrics: updatedMetrics,
    });
    const decision = await requestDecision(input);
    setLatestDecision(decision);
    // Emergency and see-GP moments stay calm: no playful toast.
    if (decision.decision !== "emergency_995" && decision.decision !== "see_gp_soon") {
      notify(t("toast.bpLogged", { name: dogName }));
    }
  }

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
        dogName={pet.name}
        accessory={accessory !== "none" && <span className={`pet-accessory accessory-${accessory}`} aria-label={t("toast.petAccessoryAria", { name: dogName, item: accessory })}><i /><i /></span>}
      />
      <TopZone onSettings={() => setScreen("settings")} pet={{ ...pet, heartCount }} />
      <div className={`screen-stage screen-${screen}`}>
        {screen === "home" && (
          <HomeScreen
            todayDoses={doseList}
            pet={pet}
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
        {screen === "care" && <CareScreen goHome={() => setScreen("home")} sendTreat={() => notify(t("toast.treatSent", { name: dogName }))} pet={pet} caregiver={caregiver} careActivity={careActivity} restockAlert={restockAlert} />}
        {screen === "reminders" && <RemindersScreen goHome={() => setScreen("home")} doses={doses} />}
        {screen === "prescription" && <PrescriptionScreen goHome={() => setScreen("home")} onExplain={() => setScreen("explanation")} medication={medication} petName={dogName} />}
        {screen === "explanation" && <ExplanationScreen onBack={() => setScreen("prescription")} onContinue={() => setScreen("schedule")} medicationExplanation={medicationExplanation} />}
        {screen === "schedule" && <ScheduleScreen onBack={() => setScreen("explanation")} onConfirm={() => { setScreen("home"); notify(t("toast.nudgeSet", { name: dogName })); }} nudgeSettings={nudgeSettings} petName={dogName} />}
        {screen === "proof" && <ProofScreen onBack={() => setScreen("home")} onVerified={() => { /* TODO(API): post a DoseEvent and refetch /today; status is derived, never set by the client. */ setDoseList((current) => current.map((d) => d.id === pendingDoseId ? { ...d, status: "taken" as const, eventAt: new Date().toISOString() } : d)); setScreen("home"); notify(t("toast.heartGained", { name: dogName })); }} medication={medication} petName={dogName} />}
        {screen === "walk" && <WalkScreen goHome={() => setScreen("home")} walkStats={walkStats} petName={dogName} />}
        {screen === "milestones" && <MilestonesScreen goHome={() => setScreen("home")} onWalk={() => setScreen("walk")} onCustomize={() => setScreen("customize")} pet={pet} currentWorld={currentWorld} tricks={tricks} souvenirs={souvenirs} petName={dogName} />}
        {screen === "health" && <HealthScreen goHome={() => setScreen("home")} bpLogged={bpLogged} healthMetrics={healthMetrics} latestDecision={latestDecision} onLogBp={handleLogBp} onScreening={() => setScreen("screening")} onSummary={() => setScreen("summary")} bloodPressureReading={bloodPressureReading} screeningInfo={screeningInfo} activityLink={activityLink} clinicTasks={clinicTasks} weekSummary={weekSummary} petName={dogName} />}
        {screen === "screening" && <ScreeningScreen onBack={() => setScreen("health")} screeningInfo={screeningInfo} petName={dogName} />}
        {screen === "summary" && <WeeklySummaryScreen onBack={() => setScreen("health")} weekSummary={weekSummary} />}
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
