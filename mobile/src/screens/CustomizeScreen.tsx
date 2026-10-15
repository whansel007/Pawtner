import { useTranslation } from "react-i18next";
import { FullCard } from "../components/FullCard";
import type { BackAction } from "../lib/navigation";
import { AccessoryMark } from "../components/AccessoryMark";
import type { WorldOption, AccessoryOption, World, Accessory } from "../types";

export function CustomizeScreen({
  back,
  world,
  setWorld,
  accessory,
  setAccessory,
  worldOptions,
  accessoryOptions,
  petName,
}: {
  back: BackAction;
  world: World;
  setWorld: (world: World) => void;
  accessory: Accessory;
  setAccessory: (accessory: Accessory) => void;
  worldOptions: WorldOption[];
  accessoryOptions: AccessoryOption[];
  petName: string;
}) {
  const { t } = useTranslation();
  return (
    <FullCard back={back} className="customize-card">
      <p className="eyebrow green">{t("customize.eyebrow", { name: petName })}</p>
      <h2>{t("customize.title")}</h2>
      <p className="supporting">{t("customize.supporting")}</p>
      <div className="section-title"><h3>{t("customize.scenery")}</h3><span>{t("customize.scenerySub")}</span></div>
      <div className="world-picker">
        {worldOptions.map((item) => (
          <button className={`${item.id} ${world === item.id ? "selected" : ""}`} key={item.id} onClick={() => setWorld(item.id)}>
            <span className="world-thumb"><i /></span><strong>{item.label}</strong><small>{item.note}</small>
          </button>
        ))}
      </div>
      <div className="section-title"><h3>{t("customize.accessories")}</h3><span>{t("customize.accessoriesSub")}</span></div>
      <div className="wardrobe-grid">
        {accessoryOptions.map((item) => (
          <button className={accessory === item.id ? "selected" : ""} key={item.id} onClick={() => setAccessory(item.id)}>
            <span><AccessoryMark accessory={item.id} /></span><strong>{item.id === "none" ? item.label : t(`accessory.${item.id}`)}</strong><small>{t(item.note, { name: petName })}</small>
          </button>
        ))}
      </div>
      <button className="primary-button" onClick={back.onBack}>{t("customize.showMe")}</button>
    </FullCard>
  );
}
