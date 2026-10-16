import { useTranslation } from "react-i18next";
import { FullCard } from "../components/FullCard";
import type { BackAction } from "../lib/navigation";
import { AccessoryMark } from "../components/AccessoryMark";
import { Icon } from "../components/Icon";
import { isComingSoon, isUnlocked, unlockThreshold } from "../lib/rewards";
import type { WorldOption, AccessoryOption, World, Accessory } from "../types";

export function CustomizeScreen({
  back,
  onHome,
  world,
  setWorld,
  accessory,
  setAccessory,
  worldOptions,
  accessoryOptions,
  petName,
  caretakerName,
  heartsTotal,
  notify,
}: {
  back: BackAction;
  /** "Show me at home": leaves the wardrobe for Home, where the dog wears the new look. */
  onHome: () => void;
  world: World;
  setWorld: (world: World) => void;
  accessory: Accessory;
  setAccessory: (accessory: Accessory) => void;
  worldOptions: WorldOption[];
  accessoryOptions: AccessoryOption[];
  petName: string;
  caretakerName: string;
  heartsTotal: number;
  notify: (message: string) => void;
}) {
  const { t } = useTranslation();

  const allWorldsUnlocked = worldOptions.every((w) => isUnlocked(w.id, heartsTotal));

  function handleWorldClick(item: WorldOption) {
    if (!isUnlocked(item.id, heartsTotal)) {
      const threshold = unlockThreshold(item.id);
      notify(t("customize.lockedToast", { name: petName, count: threshold }));
      return;
    }
    setWorld(item.id);
  }

  function handleAccessoryClick(item: AccessoryOption) {
    if (isComingSoon(item.id)) {
      notify(t("customize.comingSoon"));
      return;
    }
    if (!isUnlocked(item.id, heartsTotal)) {
      const threshold = unlockThreshold(item.id);
      notify(t("customize.lockedToast", { name: petName, count: threshold }));
      return;
    }
    setAccessory(item.id);
  }

  /** Worlds with a threshold show their level and hearts ("Level 1 · 80 hearts"); the first home shows its note. */
  function worldNote(item: WorldOption): string {
    const threshold = unlockThreshold(item.id);
    return threshold === undefined ? item.note : t("customize.worldLevelNote", { level: item.note, hearts: t("customize.lockedNote", { count: threshold }) });
  }

  function itemNote(item: WorldOption | AccessoryOption): string {
    if (isComingSoon(item.id)) return t("customize.comingSoon");
    const threshold = unlockThreshold(item.id);
    if (threshold !== undefined) {
      return t("customize.lockedNote", { count: threshold });
    }
    if (item.note === "accessory.justPet") {
      return t(item.note, { name: petName });
    }
    if (item.note === "accessory.fromCaretaker") {
      return t(item.note, { name: caretakerName });
    }
    return item.note;
  }

  return (
    <FullCard back={back} className="customize-card">
      <p className="eyebrow green">{t("customize.eyebrow", { name: petName })}</p>
      <h2>{t("customize.title")}</h2>
      <p className="supporting">{t("customize.supporting")}</p>
      <div className="section-title"><h3>{t("customize.scenery")}</h3><span>{allWorldsUnlocked ? t("customize.scenerySub") : t("customize.scenerySubLocked")}</span></div>
      <div className="world-picker">
        {worldOptions.map((item) => {
          const locked = !isUnlocked(item.id, heartsTotal);
          return (
            <button className={`${item.id} ${world === item.id ? "selected" : ""} ${locked ? "locked" : ""}`} key={item.id} onClick={() => handleWorldClick(item)}>
              <span className="world-thumb"><i /></span>
              <strong>{item.label}</strong>
              <small>{worldNote(item)}{locked ? <Icon name="lock" size={10} className="lock-icon" /> : null}</small>
            </button>
          );
        })}
      </div>
      <div className="section-title"><h3>{t("customize.accessories")}</h3><span>{t("customize.accessoriesSub")}</span></div>
      <div className="wardrobe-grid">
        {accessoryOptions.map((item) => {
          const locked = !isUnlocked(item.id, heartsTotal);
          return (
            <button className={`${accessory === item.id ? "selected" : ""} ${locked ? "locked" : ""}`} key={item.id} onClick={() => handleAccessoryClick(item)}>
              <span><AccessoryMark accessory={item.id} /></span>
              <strong>{item.id === "none" ? item.label : t(`accessory.${item.id}`)}</strong>
              <small>{itemNote(item)}{locked ? <Icon name="lock" size={10} className="lock-icon" /> : null}</small>
            </button>
          );
        })}
      </div>
      <button className="primary-button" onClick={onHome}>{t("customize.showMe")}</button>
    </FullCard>
  );
}
