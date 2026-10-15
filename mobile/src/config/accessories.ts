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

/**
 * Per-accessory anchors: hat sits on the head, glasses over the eyes, flower at the ear.
 * Landmarks measured from dog-base.webp's alpha (% of image height): crown of the head ~8%,
 * ears ~4-20% (outer edges ~x 6%-94% at 12-20%), eyes ~39%.
 */
export const ACCESSORY_LAYOUTS: Record<Exclude<AccessoryId, "none">, AccessoryLayout> = {
  /* Box spans 3-21%: the dome covers the crown between the ears, the brim rests on the forehead above the eyes. */
  hat: {
    top: "3%",
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
