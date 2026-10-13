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
import type { Screen, World, Accessory } from "./types";
import {
  pet,
  doses,
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
  const [taken, setTaken] = useState([true, false, false]);
  const [proofIndex, setProofIndex] = useState(1);
  const [bpLogged, setBpLogged] = useState(false);
  const [world, setWorld] = useState<World>("garden");
  const [accessory, setAccessory] = useState<Accessory>("none");
  const [toast, setToast] = useState("");

  const heartCount = Math.min(DEMO_RULES.heartMaximum, 1 + taken.filter(Boolean).length + (bpLogged ? 1 : 0));
  // TODO(data wiring): pass the latest agent decision instead of null once the API is connected.
  const mood = selectDogMood(heartCount, null);
  const phase = DEFAULT_PHASE;

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
        dogName={pet.name}
        accessory={accessory !== "none" && <span className={`pet-accessory accessory-${accessory}`} aria-label={t("toast.petAccessoryAria", { name: accessory })}><i /><i /></span>}
      />
      <TopZone onSettings={() => setScreen("settings")} pet={{ ...pet, heartCount }} />
      <div className={`screen-stage screen-${screen}`}>
        {screen === "home" && (
          <HomeScreen
            taken={taken}
            doses={doses}
            pet={pet}
            onTaken={(index) => {
              if (taken[index]) {
                notify(t("toast.alreadyCounted"));
                return;
              }
              setProofIndex(index);
              setScreen("proof");
            }}
            onReminders={() => setScreen("reminders")}
            onTreat={() => notify(t("toast.treatWaiting"))}
            onWalk={() => setScreen("walk")}
            onBloodPressure={() => setScreen("health")}
          />
        )}
        {screen === "care" && <CareScreen goHome={() => setScreen("home")} sendTreat={() => notify(t("toast.treatSent"))} pet={pet} caregiver={caregiver} careActivity={careActivity} restockAlert={restockAlert} />}
        {screen === "reminders" && <RemindersScreen goHome={() => setScreen("home")} doses={doses} />}
        {screen === "prescription" && <PrescriptionScreen goHome={() => setScreen("home")} onExplain={() => setScreen("explanation")} medication={medication} />}
        {screen === "explanation" && <ExplanationScreen onBack={() => setScreen("prescription")} onContinue={() => setScreen("schedule")} medicationExplanation={medicationExplanation} />}
        {screen === "schedule" && <ScheduleScreen onBack={() => setScreen("explanation")} onConfirm={() => { setScreen("home"); notify(t("toast.nudgeSet")); }} nudgeSettings={nudgeSettings} />}
        {screen === "proof" && <ProofScreen onBack={() => setScreen("home")} onVerified={() => { setTaken((current) => current.map((value, index) => index === proofIndex ? true : value)); setScreen("home"); notify(t("toast.heartGained")); }} medication={medication} />}
        {screen === "walk" && <WalkScreen goHome={() => setScreen("home")} walkStats={walkStats} />}
        {screen === "milestones" && <MilestonesScreen goHome={() => setScreen("home")} onWalk={() => setScreen("walk")} onCustomize={() => setScreen("customize")} pet={pet} currentWorld={currentWorld} tricks={tricks} souvenirs={souvenirs} />}
        {screen === "health" && <HealthScreen goHome={() => setScreen("home")} bpLogged={bpLogged} logBp={() => { setBpLogged(true); notify(t("toast.bpLogged")); }} onScreening={() => setScreen("screening")} onSummary={() => setScreen("summary")} bloodPressureReading={bloodPressureReading} screeningInfo={screeningInfo} activityLink={activityLink} clinicTasks={clinicTasks} weekSummary={weekSummary} />}
        {screen === "screening" && <ScreeningScreen onBack={() => setScreen("health")} screeningInfo={screeningInfo} />}
        {screen === "summary" && <WeeklySummaryScreen onBack={() => setScreen("health")} weekSummary={weekSummary} />}
        {screen === "settings" && <SettingsScreen goHome={() => setScreen("home")} addMedication={() => setScreen("prescription")} openCaretaker={() => setScreen("care")} openReminders={() => setScreen("reminders")} caregiver={caregiver} />}
        {screen === "customize" && <CustomizeScreen onBack={() => setScreen("milestones")} world={world} setWorld={(nextWorld) => { setWorld(nextWorld); notify(nextWorld === "flat" ? t("toast.worldFlat") : nextWorld === "garden" ? t("toast.worldGarden") : t("toast.worldKampung")); }} accessory={accessory} setAccessory={(nextAccessory) => { setAccessory(nextAccessory); notify(nextAccessory === "none" ? t("toast.accessoryNone") : t("toast.accessoryOn", { name: nextAccessory })); }} worldOptions={worldOptions} accessoryOptions={accessoryOptions} />}
      </div>
      <div className="bottom-dock" aria-hidden="true" />
      <BottomNav screen={screen} navigate={setScreen} />
      <span className="woof-bubble">woof!</span>
      <button className="add-button companion-button" onClick={() => notify(t("toast.hello"))} aria-label="Say hello to Max"><Icon name="paw" size={29} /></button>
      {toast && <div className="toast">{toast}</div>}
        </>
      )}
    </main>
    </>
  );
}
