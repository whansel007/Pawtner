import type { MouseEvent, ReactNode } from "react";
import { CARE_PATHS, type CareRoute } from "../routing";

interface CareLinkProps {
  to: CareRoute;
  onNavigate: (route: CareRoute) => void;
  className?: string;
  current?: boolean;
  children: ReactNode;
}

/** A real link (open in new tab works) that navigates in-app on a plain click. */
export function CareLink({ to, onNavigate, className, current, children }: CareLinkProps) {
  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    onNavigate(to);
  };
  return (
    <a href={CARE_PATHS[to]} className={className} aria-current={current ? "page" : undefined} onClick={onClick}>
      {children}
    </a>
  );
}
