import type { Expense } from "@/lib/expenses";

const WEEK = 7 * 24 * 60 * 60 * 1000;

// Totals for each of the last `weeks` weeks (oldest first), by when expenses were
// submitted, for drawing the small trend lines on stat cards.
export function weeklySeries(
  expenses: Expense[],
  value: (expense: Expense) => number,
  weeks = 8
): number[] {
  const now = Date.now();
  const series = new Array(weeks).fill(0);
  for (const expense of expenses) {
    const age = Math.floor((now - new Date(expense.created_at).getTime()) / WEEK);
    if (age >= 0 && age < weeks) {
      series[weeks - 1 - age] += value(expense);
    }
  }
  return series;
}
