"use client";

import { useActionState, useRef, useState } from "react";
import { centerOf, notify, Spinner } from "../feedback";
import { reviewExpense, type ReviewState } from "./actions";
import styles from "./approvals.module.css";

// The comment box with Approve and Reject buttons for one expense.
export function ReviewForm({ expenseId }: { expenseId: string }) {
  const approveRef = useRef<HTMLButtonElement>(null);
  const [clicked, setClicked] = useState<"approved" | "rejected" | null>(null);

  // Saves the decision; on success, shows a message (and confetti for approvals).
  async function review(previous: ReviewState, formData: FormData) {
    const decision = formData.get("decision");
    const origin = centerOf(approveRef.current);
    const result = await reviewExpense(previous, formData);
    if (!result) {
      notify(decision === "approved" ? "Approved" : "Rejected", decision === "approved" ? origin : undefined);
    }
    return result;
  }

  const [state, formAction, pending] = useActionState(review, null);

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
      <label className={styles.dateField}>
        Revise by <span>(optional, if rejecting)</span>
        <input type="date" name="reviseBy" />
      </label>
      {state?.error && <p className={styles.error}>{state.error}</p>}
      <div className={styles.buttons}>
        <button
          type="submit"
          name="decision"
          value="rejected"
          className={styles.reject}
          disabled={pending}
          onClick={() => setClicked("rejected")}
        >
          {pending && clicked === "rejected" ? (
            <>
              <Spinner />
              Saving…
            </>
          ) : (
            "Reject"
          )}
        </button>
        <button
          ref={approveRef}
          type="submit"
          name="decision"
          value="approved"
          className={styles.approve}
          disabled={pending}
          onClick={() => setClicked("approved")}
        >
          {pending && clicked === "approved" ? (
            <>
              <Spinner />
              Saving…
            </>
          ) : (
            "Approve"
          )}
        </button>
      </div>
    </form>
  );
}
