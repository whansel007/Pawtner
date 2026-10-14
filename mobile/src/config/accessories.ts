/**
 * Single source of truth for accessory sizing and positioning.
 * All values are relative to the dog image box (% of width/height).
 */

export type AccessoryId = "none" | "glasses" | "hat" | "flower";

export interface AccessoryLayout {
  /** Vertical position as % of the dog figure height */
  top: string;
  /** Horizontal offset as % of the dog figure width (defaults to centred) */
  left?: string;
  /** Size as % of the dog figure width */
  width: string;
  /** Size as % of the dog figure height */
  height: string;
  /** Rotation angle */
  rotate: string;
}

/** Per-accessory anchors: hat sits on the head, glasses over the eyes, flower at the ear. */
export const ACCESSORY_LAYOUTS: Record<Exclude<AccessoryId, "none">, AccessoryLayout> = {
  hat: {
    top: "20%",
    width: "55%",
    height: "18%",
    rotate: "3deg",
  },
  glasses: {
    top: "30%",
    width: "45%",
    height: "13%",
    rotate: "-2deg",
  },
  flower: {
    top: "10%",
    left: "76%",
    width: "24%",
    height: "24%",
    rotate: "-10deg",
  },
};
