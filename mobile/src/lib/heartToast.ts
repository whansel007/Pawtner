import { DEMO_RULES } from "../../../shared/config.js";

/** What a save did to the hearts shown on the phone (before = when the action started, after = after the save). */
export interface HeartChange {
  gained: boolean;
  full: boolean;
}

export function heartChange(before: number, after: number, max: number = DEMO_RULES.heartMaximum): HeartChange {
  return { gained: after > before, full: after >= max };
}

/** Blood-pressure toast (owner, 18 Oct): a warning always warns; else "full" only at max hearts, "gained" only on a real gain. */
export function bpToastKey(change: HeartChange, urgent: boolean): "toast.bpWarning" | "toast.bpLogged" | "toast.bpLoggedHeart" | "toast.bpLoggedPlain" {
  if (urgent) return "toast.bpWarning";
  if (change.full) return "toast.bpLogged";
  return change.gained ? "toast.bpLoggedHeart" : "toast.bpLoggedPlain";
}

/** Medicine and walk toast (owner, 18 Oct): "heart is full" when the gain fills the hearts, "gained a heart" on another gain, else no toast (null). */
export function activityToastKey(change: HeartChange): "toast.heartFull" | "toast.heartGained" | null {
  if (!change.gained) return null;
  return change.full ? "toast.heartFull" : "toast.heartGained";
}
