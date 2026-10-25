import type { Expense, Status } from "@/lib/expenses";
import { formatDateTime } from "@/lib/format";
import styles from "./page.module.css";

const LABELS: Record<Status, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
};

// A small, fold-out timeline of every decision on an expense, oldest first.
// Shown only once someone has made a decision.
export function Activity({ expense }: { expense: Expense }) {
  const decisions = [...(expense.decisions ?? [])].sort((a, b) =>
    a.created_at.localeCompare(b.created_at)
  );
  if (decisions.length === 0) {
    return null;
  }

  return (
    <details className={styles.activity}>
      <summary className={styles.activitySummary}>Activity ({decisions.length + 1})</summary>
      <ol className={styles.timeline}>
        <li className={styles.event}>
          <span className={styles.eventText}>
            Submitted by {expense.submitter?.full_name ?? "Unknown"}
          </span>
          <span className={styles.eventTime}>{formatDateTime(expense.created_at)}</span>
        </li>
        {decisions.map((d) => (
          <li key={d.id} className={`${styles.event} ${styles[`event_${d.new_status}`]}`}>
            <span className={styles.eventText}>
              {d.new_status === "pending" ? "Moved back to pending" : LABELS[d.new_status]} by{" "}
              {d.decider?.full_name ?? "an approver"}
              {d.old_status !== "pending" && d.new_status !== "pending" && (
                <> (was {LABELS[d.old_status]})</>
              )}
            </span>
            <span className={styles.eventTime}>{formatDateTime(d.created_at)}</span>
            {d.comment && <span className={styles.eventComment}>“{d.comment}”</span>}
          </li>
        ))}
      </ol>
    </details>
  );
}
