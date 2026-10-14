import type { ReactNode } from "react";
import type { BackAction } from "../lib/navigation";
import { BackButton } from "./BackButton";

/**
 * The shared card for every non-Home screen: a fixed rounded white frame (padding kept) holding the back button,
 * with the content scrolling inside it, so scrolled content never runs into a bare edge.
 */
export function FullCard({
  back,
  backLabel,
  className = "",
  children,
}: {
  back: BackAction;
  backLabel?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={`content-card full-card ${className}`.trim()}>
      <BackButton back={back} label={backLabel} />
      <div className="full-card__scroll">{children}</div>
    </section>
  );
}
