import { dueTone, todayISO } from "@/lib/dates";
import { formatDate } from "@/lib/format";
import type { Expense } from "@/lib/expenses";
import styles from "./page.module.css";

const TONE_CLASS = {
  overdue: styles.dueOverdue,
  soon: styles.dueSoon,
  later: styles.dueLater,
};

// The date that matters right now for this expense, if any:
// "Needed by" while pending, "Revise by" while rejected.
export function activeDeadline(expense: Expense) {
  if (expense.status === "pending" && expense.needed_by) {
    return { label: "Needed by", date: expense.needed_by };
  }
  if (expense.status === "rejected" && expense.revise_by) {
    return { label: "Revise by", date: expense.revise_by };
  }
  return null;
}

// A small chip: amber when due within 3 days, red when overdue.
export function DueChip({ expense }: { expense: Expense }) {
  const deadline = activeDeadline(expense);
  if (!deadline) return null;
  const tone = dueTone(deadline.date, todayISO());

  return (
    <span className={`${styles.dueChip} ${TONE_CLASS[tone]}`}>
      {tone === "overdue" ? "Overdue · " : ""}
      {deadline.label} {formatDate(deadline.date)}
    </span>
  );
}
