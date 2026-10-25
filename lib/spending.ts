import { isSpent, type Status } from "@/lib/expenses";

// The few columns the dashboard needs from each expense.
export type SpendingRow = {
  amount_php: number | string;
  category: string;
  expense_date: string; // YYYY-MM-DD, as entered
  status: Status;
};

export type Today = { year: number; month: number; day: number }; // month is 1–12

// Today's date in the Philippines.
export function todayInManila(now: Date): Today {
  const [year, month, day] = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" })
    .format(now)
    .split("-")
    .map(Number);
  return { year, month, day };
}

function key(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function daysIn(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

// "2026-10" → "Oct" (or "Oct 2026" with the year)
export function monthLabel(monthKey: string, withYear = false) {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("en-US", {
    month: "short",
    ...(withYear ? { year: "numeric" } : {}),
    timeZone: "UTC",
  });
}

// The last `count` months up to and including this one, oldest first.
export function recentMonths(today: Today, count: number) {
  const months: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const date = new Date(Date.UTC(today.year, today.month - 1 - i, 1));
    months.push(key(date.getUTCFullYear(), date.getUTCMonth() + 1));
  }
  return months;
}

// Spending = approved (and later reimbursed) expenses, counted by their expense date.
function approved(rows: SpendingRow[]) {
  return rows.filter((r) => isSpent(r.status));
}

export function spendingByMonth(rows: SpendingRow[], months: string[]) {
  const totals = new Map(months.map((m) => [m, 0]));
  for (const row of approved(rows)) {
    const month = row.expense_date.slice(0, 7);
    if (totals.has(month)) totals.set(month, totals.get(month)! + Number(row.amount_php));
  }
  return months.map((month) => ({ month, total: totals.get(month)! }));
}

export function spendingByCategory(rows: SpendingRow[], months: string[]) {
  const inRange = new Set(months);
  const totals = new Map<string, number>();
  for (const row of approved(rows)) {
    if (!inRange.has(row.expense_date.slice(0, 7))) continue;
    totals.set(row.category, (totals.get(row.category) ?? 0) + Number(row.amount_php));
  }
  return [...totals.entries()]
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);
}

// Estimate this month's total from the pace so far:
// (approved spending dated from the 1st through today) ÷ (days so far) × (days in the month).
export function monthProjection(rows: SpendingRow[], today: Today) {
  const thisMonth = key(today.year, today.month);
  const lastMonthDate = new Date(Date.UTC(today.year, today.month - 2, 1));
  const lastMonth = key(lastMonthDate.getUTCFullYear(), lastMonthDate.getUTCMonth() + 1);
  const todayKey = `${thisMonth}-${String(today.day).padStart(2, "0")}`;

  let spentSoFar = 0;
  let pendingThisMonth = 0;
  let lastMonthTotal = 0;
  for (const row of rows) {
    const month = row.expense_date.slice(0, 7);
    const amount = Number(row.amount_php);
    if (isSpent(row.status) && month === thisMonth && row.expense_date <= todayKey) spentSoFar += amount;
    if (row.status === "pending" && month === thisMonth) pendingThisMonth += amount;
    if (isSpent(row.status) && month === lastMonth) lastMonthTotal += amount;
  }

  const daysSoFar = today.day;
  const daysInMonth = daysIn(today.year, today.month);
  const perDay = spentSoFar / daysSoFar;

  return {
    thisMonth,
    lastMonth,
    spentSoFar,
    daysSoFar,
    daysInMonth,
    perDay,
    projected: perDay * daysInMonth,
    pendingThisMonth,
    lastMonthTotal,
  };
}
