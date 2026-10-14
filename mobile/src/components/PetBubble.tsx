import "./PetBubble.css";

/**
 * The tap-the-dog speech bubble. Shown in the toast slot under the name and hearts (shared --toast-top),
 * lifted if needed so it never covers the dog's head (see PetBubble.css).
 * The live region is always mounted so screen readers announce each new line.
 */
export function PetBubble({ text }: { text: string }) {
  return (
    <p className={`pet-bubble${text ? "" : " pet-bubble--idle"}`} role="status" aria-live="polite">
      {text}
    </p>
  );
}
