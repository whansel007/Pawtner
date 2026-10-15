import type { ReactNode } from "react";

export function Icon({
  name,
  size = 24,
  className = "",
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const paths: Record<string, ReactNode> = {
    home: <><path d="m3 11 9-8 9 8" /><path d="M5 10v10h14V10M9 20v-6h6v6" /></>,
    star: <path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z" />,
    stats: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></>,
    plus: <path d="M12 5v14M5 12h14" />,
    gear: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M8 3v4M16 3v4M3 10h18" /></>,
    flame: <path d="M12.4 22c4.1-.5 7.1-3.2 7.1-7.2 0-3.2-1.8-5.7-4.6-8.1.1 2-1 3.7-2.4 4.5.2-3.4-1.5-6.5-4.1-8.2.1 3.8-3.9 6.5-3.9 11.8 0 4 3 6.7 7.1 7.2-1.8-1-2.6-2.5-2.3-4.1.3-1.5 1.4-2.5 2.5-3.6-.1 1.6.5 2.7 1.6 3.6.8-.8 1.3-1.8 1.4-3 .8 2.8-.2 5.6-2.4 7.1Z" />,
    gift: <><rect x="3" y="9" width="18" height="12" rx="2" /><path d="M12 9v12M3 13h18M12 9H7.5a2.5 2.5 0 1 1 2.4-3.2L12 9Zm0 0h4.5a2.5 2.5 0 1 0-2.4-3.2L12 9Z" /></>,
    pill: <><path d="m8.5 19.5-4-4a5 5 0 0 1 7-7l4 4a5 5 0 0 1-7 7Z" /><path d="m8 9 7 7" /></>,
    camera: <><path d="M4 8h4l1.5-2h5L16 8h4a2 2 0 0 1 2 2v9H2v-9a2 2 0 0 1 2-2Z" /><circle cx="12" cy="13.5" r="3.5" /></>,
    bell: <><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z" /><path d="M10 21h4" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    chevron: <path d="m9 18 6-6-6-6" />,
    scan: <><path d="M8 3H4a1 1 0 0 0-1 1v4M16 3h4a1 1 0 0 1 1 1v4M8 21H4a1 1 0 0 1-1-1v-4M16 21h4a1 1 0 0 0 1-1v-4" /><path d="M7 12h10" /></>,
    walk: <><circle cx="13" cy="4" r="2" /><path d="m10 22 2-7-3-3 2-5 5 3 3 1M5 22l4-6M15 22l-2-7" /></>,
    back: <path d="m15 18-6-6 6-6" />,
    speaker: <><path d="M11 5 6 9H3v6h3l5 4V5Z" /><path d="M15 9a4 4 0 0 1 0 6M18 6a8 8 0 0 1 0 12" /></>,
    heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" />,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" /></>,
    book: <><path d="M4 4h6a2 2 0 0 1 2 2v15a3 3 0 0 0-3-3H4V4ZM20 4h-6a2 2 0 0 0-2 2v15a3 3 0 0 1 3-3h5V4Z" /></>,
    paw: <><path d="M12 21c-3.4 0-6-1.7-6-4.2 0-2.2 2.7-5.1 6-5.1s6 2.9 6 5.1C18 19.3 15.4 21 12 21Z" /><ellipse cx="5.2" cy="10.1" rx="2.2" ry="3" transform="rotate(-28 5.2 10.1)" /><ellipse cx="18.8" cy="10.1" rx="2.2" ry="3" transform="rotate(28 18.8 10.1)" /><ellipse cx="9.2" cy="5.8" rx="2.1" ry="3" transform="rotate(-8 9.2 5.8)" /><ellipse cx="14.8" cy="5.8" rx="2.1" ry="3" transform="rotate(8 14.8 5.8)" /></>,
    lock: <><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></>,
  };

  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      height={size}
      viewBox="0 0 24 24"
      width={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.9"
    >
      {paths[name]}
    </svg>
  );
}
