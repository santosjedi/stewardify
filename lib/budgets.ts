import { isSpent } from "@/lib/expenses";
import type { SpendingRow, Today } from "@/lib/spending";

export type Budget = { category: string; monthly_amount: number | string };

export type BudgetLine = {
  category: string;
  budget: number;
  spent: number;
  percent: number;
  tone: "green" | "amber" | "red";
};

export type Recommendation = {
  tone: "red" | "amber" | "blue";
  title: string;
  advice: string;
  numbers: string[]; // the figures behind it, shown underneath
};

function monthKey(year: number, month: number) {
  const date = new Date(Date.UTC(year, month - 1, 1));
  return date.toISOString().slice(0, 7);
}

function daysIn(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

// Approved (and reimbursed) spending per category in one month (by expense date).
function spentByCategory(rows: SpendingRow[], month: string) {
  const totals = new Map<string, number>();
  for (const row of rows) {
    if (!isSpent(row.status) || !row.expense_date.startsWith(month)) continue;
    totals.set(row.category, (totals.get(row.category) ?? 0) + Number(row.amount_php));
  }
  return totals;
}

// Green under 75%, amber from 75% up to 100%, red over 100%.
export function budgetTone(percent: number): BudgetLine["tone"] {
  if (percent > 100) return "red";
  if (percent >= 75) return "amber";
  return "green";
}

// This month's approved spending against each budget that's been set.
export function budgetLines(rows: SpendingRow[], budgets: Budget[], today: Today): BudgetLine[] {
  const spent = spentByCategory(rows, monthKey(today.year, today.month));
  return budgets
    .map((b) => {
      const budget = Number(b.monthly_amount);
      const amount = spent.get(b.category) ?? 0;
      const percent = budget > 0 ? (amount / budget) * 100 : amount > 0 ? Infinity : 0;
      return { category: b.category, budget, spent: amount, percent, tone: budgetTone(percent) };
    })
    .sort((a, b) => b.percent - a.percent);
}

const pct = (n: number) => (Number.isFinite(n) ? `${Math.round(n)}%` : "over 100%");

// Simple rules, each based only on the numbers it shows.
export function recommendations(
  rows: SpendingRow[],
  budgets: Budget[],
  today: Today,
  money: (n: number) => string
): Recommendation[] {
  const results: Recommendation[] = [];
  const lines = budgetLines(rows, budgets, today);
  const daysInMonth = daysIn(today.year, today.month);
  const daysLeft = daysInMonth - today.day;
  const budgeted = new Set(budgets.map((b) => b.category));

  for (const line of lines) {
    if (line.budget <= 0) continue;

    // Rule 1: already over budget.
    if (line.spent > line.budget) {
      results.push({
        tone: "red",
        title: `${line.category} is over budget by ${money(line.spent - line.budget)}`,
        advice: `Consider pausing new ${line.category} expenses until next month, or raising its budget.`,
        numbers: [
          `${money(line.spent)} approved of a ${money(line.budget)} budget (${pct(line.percent)})`,
          `${daysLeft} ${daysLeft === 1 ? "day" : "days"} left this month`,
        ],
      });
      continue;
    }

    // Rule 2: at 75% or more with days still to go.
    if (line.percent >= 75 && daysLeft > 0) {
      results.push({
        tone: "amber",
        title: `${line.category} is at ${pct(line.percent)} of budget with ${daysLeft} ${daysLeft === 1 ? "day" : "days"} left`,
        advice: `Consider limiting ${line.category} expenses for the rest of the month.`,
        numbers: [
          `${money(line.spent)} approved of ${money(line.budget)}`,
          `${money(line.budget - line.spent)} left to spend`,
        ],
      });
      continue;
    }

    // Rule 3: under 75% now, but the daily pace so far would pass the budget.
    const projected = (line.spent / today.day) * daysInMonth;
    if (line.spent > 0 && projected > line.budget && daysLeft > 0) {
      results.push({
        tone: "amber",
        title: `At this pace, ${line.category} will go over budget`,
        advice: `Keep an eye on ${line.category} expenses.`,
        numbers: [
          `${money(line.spent)} in ${today.day} ${today.day === 1 ? "day" : "days"} = ${money(line.spent / today.day)} per day`,
          `× ${daysInMonth} days ≈ ${money(projected)}, vs. a ${money(line.budget)} budget`,
        ],
      });
    }
  }

  // Rule 4: under budget for the last 2 full months, while another category is
  // running high this month. Only when there was approved spending in both months,
  // so a brand-new setup doesn't look "under budget" by default.
  const previous = [1, 2].map((back) => monthKey(today.year, today.month - back));
  const previousSpent = previous.map((m) => spentByCategory(rows, m));
  const hadActivity = previousSpent.every((totals) => totals.size > 0);
  const needy = lines.find((l) => l.percent >= 75);

  if (hadActivity && needy) {
    for (const b of budgets) {
      const budget = Number(b.monthly_amount);
      // Don't suggest taking money from a category that's running high itself.
      const now = lines.find((l) => l.category === b.category);
      if (budget <= 0 || (now && now.percent >= 75)) continue;
      const used = previousSpent.map((totals) => totals.get(b.category) ?? 0);
      if (!used.every((u) => u < budget)) continue;

      const averageUnused = used.reduce((sum, u) => sum + (budget - u), 0) / used.length;
      const amount = Math.floor(averageUnused / 100) * 100;
      if (amount <= 0) continue;

      const [last, before] = previous.map((m) =>
        new Date(`${m}-01T00:00:00Z`).toLocaleDateString("en-US", { month: "short", timeZone: "UTC" })
      );
      results.push({
        tone: "blue",
        title: `${b.category} has been under budget for 2 months`,
        advice: `Consider reallocating ${money(amount)} to ${needy.category}.`,
        numbers: [
          `${before}: ${money(used[1])} and ${last}: ${money(used[0])} of a ${money(budget)} budget`,
          `About ${money(averageUnused)} unused per month on average (rounded down to ${money(amount)})`,
          `${needy.category} is at ${pct(needy.percent)} of its budget this month`,
        ],
      });
      break;
    }
  }

  // Rule 5: spending this month in a category with no budget.
  const thisMonth = spentByCategory(rows, monthKey(today.year, today.month));
  for (const [category, amount] of thisMonth) {
    if (budgeted.has(category) || amount <= 0) continue;
    results.push({
      tone: "blue",
      title: `${category} has no budget yet`,
      advice: "Consider setting a monthly budget for it.",
      numbers: [`${money(amount)} approved this month`],
    });
  }

  return results;
}
