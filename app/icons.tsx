import type { ReactNode } from "react";

// Simple line icons drawn with inline SVG. They take the text color around them.
const PATHS: Record<string, ReactNode> = {
  // Sidebar
  list: <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />,
  plus: <path d="M12 5v14M5 12h14" />,
  inbox: <path d="M3 13h5l2 3h4l2-3h5M5 5h14l2 8v6H3v-6l2-8z" />,
  history: <path d="M3 12a9 9 0 1 0 3-6.7M3 4v4h4M12 8v4l3 2" />,

  // Stat cards
  wallet: <path d="M3 7h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7zm0 0 2-3h12M16 13.5h.01" />,
  hourglass: <path d="M7 3h10M7 21h10M8 3c0 5 8 5 8 9s-8 4-8 9M16 3c0 5-8 5-8 9s8 4 8 9" />,
  check: <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM8 12.5l2.5 2.5L16 9.5" />,
  cross: <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9 9l6 6M15 9l-6 6" />,

  // Categories
  car: <path d="M5 17h14M5 17v2M19 17v2M4 13l2-6h12l2 6v4H4v-4zM7.5 14.5h.01M16.5 14.5h.01" />,
  food: <path d="M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M17 3c-2 2-3 5-3 8h3v10" />,
  paperclip: <path d="M8 12l6-6a3 3 0 0 1 4 4l-8 8a5 5 0 0 1-7-7l7-7" />,
  printer: <path d="M7 8V3h10v5M7 17H4v-7h16v7h-3M7 14h10v7H7v-7z" />,
  building: <path d="M4 21V5l8-3 8 3v16M9 21v-5h6v5M8 9h.01M12 9h.01M16 9h.01M8 13h.01M16 13h.01" />,
  bolt: <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z" />,
  wifi: <path d="M5 12a10 10 0 0 1 14 0M8.5 15.5a5 5 0 0 1 7 0M2 8.5a15 15 0 0 1 20 0M12 19h.01" />,
  mic: <path d="M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3zM5 11a7 7 0 0 0 14 0M12 18v3" />,
  globe: <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z" />,
  heart: <path d="M12 20s-7-4.4-9-9a5 5 0 0 1 9-3 5 5 0 0 1 9 3c-2 4.6-9 9-9 9z" />,
  tool: <path d="M14.7 6.3a4 4 0 0 0-5 5L3 18l3 3 6.7-6.7a4 4 0 0 0 5-5l-2.5 2.5-2.8-.7-.7-2.8 2.5-2.5z" />,
  bed: <path d="M3 18V7M3 14h18v4M21 14v-2a3 3 0 0 0-3-3h-7v5M7 11h.01" />,
  dots: <path d="M5 12h.01M12 12h.01M19 12h.01" />,

  // Panel
  close: <path d="M6 6l12 12M18 6 6 18" />,
  search: <path d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4" />,
  chevron: <path d="M9 6l6 6-6 6" />,
  logout: <path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10" />,
};

export function Icon({ name, size = 20 }: { name: string; size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[name] ?? PATHS.dots}
    </svg>
  );
}

const CATEGORY_ICONS: Record<string, string> = {
  Transportation: "car",
  "Meals & Food": "food",
  "Office Supplies": "paperclip",
  "Printing & Documents": "printer",
  "Venue & Rentals": "building",
  Utilities: "bolt",
  "Internet & Mobile Load": "wifi",
  "Honorarium & Speaker Fees": "mic",
  "Outreach & Missions": "globe",
  "Scholarships & Benevolence": "heart",
  Equipment: "tool",
  Accommodation: "bed",
  Other: "dots",
};

export function categoryIcon(category: string) {
  return CATEGORY_ICONS[category] ?? "dots";
}
