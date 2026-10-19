import { useState, type CSSProperties, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { HomeView } from "../config/homeView";
import type { BackAction } from "../lib/navigation";
import { useSceneLayout } from "../lib/useSceneLayout";
import { BackButton } from "./BackButton";
import { SheetHandle } from "./SheetHandle";

/** A card screen that drags like Home (config/homeView.ts CARD_SHEET): its view and who it shows besides the card. */
export type CardSheet = { view: HomeView; onView: (view: HomeView) => void; petName: string };

/**
 * The shared card for every non-Home screen: a fixed rounded white frame (padding kept) holding the back button,
 * with the content scrolling inside it, so scrolled content never runs into a bare edge.
 * With `sheet` it gets Home's grab bar: full card / both / full Buddy. In full Buddy it shrinks to a strip with the back
 * button and the screen's `heading`; the content stays mounted (hidden), so nothing on it is lost.
 */
export function FullCard({
  back,
  backLabel,
  className = "",
  sheet,
  heading,
  children,
}: {
  back: BackAction;
  backLabel?: string;
  className?: string;
  sheet?: CardSheet;
  /** The screen's eyebrow and title, shown on the full-Buddy strip. */
  heading?: { eyebrow: string; title: string };
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const layout = useSceneLayout();
  // How far the card follows the finger toward the full card while the grab bar is dragged (0 at rest).
  const [follow, setFollow] = useState(0);
  const strip = sheet?.view === "buddy";
  const sheetClass = sheet ? `full-card--sheet full-card--${layout} ${strip ? "full-card--strip" : ""} ${follow !== 0 ? "is-dragging" : ""}` : "";
  return (
    <section
      className={`content-card full-card ${sheetClass} ${className}`.replace(/\s+/g, " ").trim()}
      style={sheet ? ({ "--sheet-follow": `${follow}px` } as CSSProperties) : undefined}
    >
      {sheet && (
        <SheetHandle view={sheet.view} layout={layout} label={t(`cardSheet.${layout}`, { name: sheet.petName })} onView={sheet.onView} onFollow={setFollow} />
      )}
      <BackButton back={back} label={backLabel} />
      {strip && heading && (
        <div className="full-card__strip">
          <p className="eyebrow green">{heading.eyebrow}</p>
          <h2>{heading.title}</h2>
        </div>
      )}
      <div className="full-card__scroll" hidden={strip}>{children}</div>
    </section>
  );
}
