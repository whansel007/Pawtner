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
  /* Box spans 3-26% of the height and 82% of the width. Crown (see .accessory-hat in index.css) ~49% wide, top at ~4%,
     just above the crown of the head, so it covers the top of the head between the ears; brim ~18-25%, on the forehead
     just above the ear bases and well clear of the eyes (~39%). Checked on the base, joyful and sleepy art. */
  hat: {
    top: "3%",
    width: "82%",
    height: "23%",
    rotate: "2deg",
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
