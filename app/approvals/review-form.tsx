"use client";

import { useActionState } from "react";
import { reviewExpense } from "./actions";
import styles from "./approvals.module.css";

// The comment box with Approve and Reject buttons for one expense.
export function ReviewForm({ expenseId }: { expenseId: string }) {
  const [state, formAction, pending] = useActionState(reviewExpense, null);

  return (
    <form action={formAction} className={styles.reviewForm}>
      <input type="hidden" name="expenseId" value={expenseId} />
      <textarea
        name="comment"
        rows={2}
        maxLength={500}
        placeholder="Comment (required to reject, optional to approve)"
        className={styles.commentBox}
      />
      {state?.error && <p className={styles.error}>{state.error}</p>}
      <div className={styles.buttons}>
        <button
          type="submit"
          name="decision"
          value="rejected"
          className={styles.reject}
          disabled={pending}
        >
          Reject
        </button>
        <button
          type="submit"
          name="decision"
          value="approved"
          className={styles.approve}
          disabled={pending}
        >
          {pending ? "Saving…" : "Approve"}
        </button>
      </div>
    </form>
  );
}
