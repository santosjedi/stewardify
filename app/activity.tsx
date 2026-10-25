import type { Expense, Status } from "@/lib/expenses";
import { formatDateTime } from "@/lib/format";
import styles from "./page.module.css";

const LABELS: Record<Status, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  reimbursed: "Reimbursed",
};

// What one log entry says happened.
function eventText(d: Expense["decisions"][number]) {
  if (d.kind === "resubmission") return "Fixed and resubmitted";
  if (d.kind === "reimbursement") return "Marked as reimbursed";
  if (d.kind === "undo_reimbursement") return "Reimbursement undone";
  if (d.new_status === "pending") return "Moved back to pending";
  return LABELS[d.new_status];
}

// A small, fold-out timeline of every decision on an expense, oldest first.
// Shown only once someone has made a decision.
export function Activity({ expense, open = false }: { expense: Expense; open?: boolean }) {
  const decisions = [...(expense.decisions ?? [])].sort((a, b) =>
    a.created_at.localeCompare(b.created_at)
  );
  if (decisions.length === 0) {
    return null;
  }

  return (
    <details className={styles.activity} open={open}>
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
              {eventText(d)} by{" "}
              {d.decider?.full_name ?? (d.kind === "resubmission" ? "the submitter" : "an approver")}
              {d.kind === "decision" && d.old_status !== "pending" && d.new_status !== "pending" && (
                <> (was {LABELS[d.old_status]})</>
              )}
            </span>
            <span className={styles.eventTime}>{formatDateTime(d.created_at)}</span>
            {d.details && <span className={styles.eventTime}>{d.details}</span>}
            {d.comment && <span className={styles.eventComment}>“{d.comment}”</span>}
          </li>
        ))}
      </ol>
    </details>
  );
}

// After a rejected expense is fixed and resubmitted, the rejection comment stays
// visible as "Previous feedback" while it waits for review again.
export function PreviousFeedback({ expense }: { expense: Expense }) {
  if (expense.status !== "pending") {
    return null;
  }
  const decisions = [...(expense.decisions ?? [])].sort((a, b) =>
    a.created_at.localeCompare(b.created_at)
  );
  const last = decisions[decisions.length - 1];
  if (last?.kind !== "resubmission") {
    return null;
  }
  const rejection = decisions.findLast((d) => d.new_status === "rejected" && d.comment);
  if (!rejection) {
    return null;
  }

  return (
    <p className={styles.feedback}>
      <span className={styles.feedbackLabel}>
        Previous feedback from {rejection.decider?.full_name ?? "an approver"}
      </span>
      <span className={styles.comment}>“{rejection.comment}”</span>
    </p>
  );
}
