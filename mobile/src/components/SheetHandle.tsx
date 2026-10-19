import { useRef, type KeyboardEvent, type PointerEvent } from "react";
import { HOME_VIEW, SHEET_DASHES, type HomeView } from "../config/homeView";
import { homeViewAfterDrag, stepHomeView } from "../lib/homeView";
import type { SceneLayout } from "../config/scene";
import "./SheetHandle.css";

/** A movement shorter than this (px) on release counts as a tap. */
const TAP_SLOP_PX = 8;

/**
 * The grab bar on Home's card and on the card screens that drag (config/homeView.ts). Drag toward the form / full card
 * (portrait: up, landscape: left) or toward Buddy; on release it snaps one step per HOME_VIEW.snapPx. A tap returns to
 * both. Arrow keys step too. It shows the current view as dashes (SHEET_DASHES). While dragging it reports the follow
 * distance so the card moves with the finger (transform only, in HomeScreen / FullCard).
 */
export function SheetHandle({ view, layout, label, onView, onFollow }: {
  view: HomeView;
  /** The accessible label (en.json, already filled in by the caller). */
  label: string;
  layout: SceneLayout;
  onView: (view: HomeView) => void;
  /** Distance toward the form while dragging (px, clamped), or 0 when released. */
  onFollow: (towardForm: number) => void;
}) {
  const start = useRef<{ x: number; y: number; id: number } | null>(null);
  const towardForm = (event: PointerEvent) => {
    if (!start.current) return 0;
    return layout === "landscape" ? start.current.x - event.clientX : start.current.y - event.clientY;
  };
  const clampFollow = (value: number) => Math.max(-HOME_VIEW.maxFollowPx, Math.min(HOME_VIEW.maxFollowPx, value));

  const onPointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    start.current = { x: event.clientX, y: event.clientY, id: event.pointerId };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    if (start.current?.id === event.pointerId) onFollow(clampFollow(towardForm(event)));
  };
  const finish = (event: PointerEvent<HTMLButtonElement>, cancelled: boolean) => {
    if (start.current?.id !== event.pointerId) return;
    const distance = towardForm(event);
    start.current = null;
    onFollow(0);
    if (cancelled) return;
    onView(Math.abs(distance) < TAP_SLOP_PX ? "both" : homeViewAfterDrag(view, distance));
  };
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const toForm = layout === "landscape" ? "ArrowLeft" : "ArrowUp";
    const toBuddy = layout === "landscape" ? "ArrowRight" : "ArrowDown";
    if (event.key !== toForm && event.key !== toBuddy) return;
    event.preventDefault();
    onView(stepHomeView(view, event.key === toForm ? 1 : -1));
  };

  return (
    <button
      type="button"
      className={`sheet-handle sheet-handle--${layout}`}
      aria-label={label}
      // Click is handled on pointer up (tap vs drag); keyboard Enter/Space still go back to both.
      onClick={(event) => { if (event.detail === 0) onView("both"); }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={(event) => finish(event, false)}
      onPointerCancel={(event) => finish(event, true)}
      onKeyDown={onKeyDown}
    >
      <span className="sheet-handle__dashes" aria-hidden="true">
        {Array.from({ length: SHEET_DASHES[view] }, (_, index) => <span key={index} className="sheet-handle__dash" />)}
      </span>
    </button>
  );
}
