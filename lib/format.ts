// ₱1,200.00
export const pesos = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });

// Oct 25, 2026 (UTC so the date never shifts by a day)
export function formatDate(isoDate: string) {
  return new Date(isoDate).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

// Oct 26, 2026, 3:05 PM (Philippine time)
export function formatDateTime(isoTimestamp: string) {
  return new Date(isoTimestamp).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Manila",
  });
}
