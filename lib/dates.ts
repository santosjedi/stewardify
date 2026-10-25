// Plain calendar dates (YYYY-MM-DD), like "Needed by" and "Revise by".
// They're compared as dates only, never shifted by time zones.

export function isValidDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !isNaN(Date.parse(value));
}

// Today's date in the Philippines, as YYYY-MM-DD.
export function todayISO(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(now);
}

export function addDays(isoDate: string, days: number) {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export type DueTone = "overdue" | "soon" | "later";

// Red when the date has passed, amber when it's within the next 3 days.
export function dueTone(isoDate: string, today: string): DueTone {
  if (isoDate < today) return "overdue";
  if (isoDate <= addDays(today, 3)) return "soon";
  return "later";
}
