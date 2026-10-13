import { Icon } from "./Icon";
import type { Accessory } from "../types";

export function AccessoryMark({ accessory }: { accessory: Accessory }) {
  if (accessory === "none") return <Icon name="paw" size={30} />;
  return <span className={`accessory-mark mark-${accessory}`} aria-hidden="true"><i /><i /></span>;
}
