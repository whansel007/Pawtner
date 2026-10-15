import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import "./PhotoViewer.css";

/**
 * Full-screen look at one photo (e.g. the clinic memo). Close with the button, Escape, or a tap on the backdrop.
 * Focus moves to Close on open and back to the opener on close.
 */
export function PhotoViewer({
  src,
  alt,
  title,
  closeLabel,
  onClose,
  actions,
}: {
  src: string;
  alt: string;
  title: string;
  closeLabel: string;
  onClose: () => void;
  /** Extra buttons under the photo, e.g. "Replace photo". */
  actions?: ReactNode;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  // Latest onClose without re-running the open/close effect on every render.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onCloseRef.current(); };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      opener?.focus?.();
    };
  }, []);

  return createPortal(
    <div className="photo-viewer" role="dialog" aria-modal="true" aria-label={title} onClick={onClose}>
      <div className="photo-viewer__panel" onClick={(event) => event.stopPropagation()}>
        <div className="photo-viewer__bar">
          <strong>{title}</strong>
          <button ref={closeRef} type="button" className="photo-viewer__close" onClick={onClose}>{closeLabel}</button>
        </div>
        <img className="photo-viewer__image" src={src} alt={alt} />
        {actions && <div className="photo-viewer__actions">{actions}</div>}
      </div>
    </div>,
    document.body,
  );
}
