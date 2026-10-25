"use client";

import { useActionState, useState } from "react";
import { REIMBURSE_METHODS } from "@/lib/expenses";
import { notify, Spinner } from "../feedback";
import { markReimbursed, undoReimbursement, type ReviewState } from "./actions";
import styles from "./approvals.module.css";

// "Mark as reimbursed": records how and when the submitter was paid back.
export function MarkReimbursed({ expenseId, today }: { expenseId: string; today: string }) {
  const [open, setOpen] = useState(false);

  async function save(previous: ReviewState, formData: FormData) {
    const result = await markReimbursed(previous, formData);
    if (!result) notify("Marked as reimbursed");
    return result;
  }
  const [state, formAction, pending] = useActionState(save, null);

  if (!open) {
    return (
      <button type="button" className={styles.reimburseButton} onClick={() => setOpen(true)}>
        Mark as reimbursed
      </button>
    );
  }

  return (
    <form action={formAction} className={styles.reimburseForm}>
      <input type="hidden" name="expenseId" value={expenseId} />
      <p className={styles.reimburseNote}>
        This only records a payment made outside Stewardify. No money moves here.
      </p>
      <div className={styles.reimburseGrid}>
        <label className={styles.formField}>
          Reimbursed via
          <select name="via" defaultValue="" required>
            <option value="" disabled>
              Choose…
            </option>
            {REIMBURSE_METHODS.map((method) => (
              <option key={method} value={method}>
                {method}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.formField}>
          Payment date
          <input type="date" name="paidOn" defaultValue={today} max={today} required />
        </label>
        <label className={styles.formField}>
          <span>
            Reference number <span className={styles.optionalText}>(optional)</span>
          </span>
          <input type="text" name="reference" maxLength={100} placeholder="e.g. GCash reference" />
        </label>
        <label className={styles.formField}>
          <span>
            Note <span className={styles.optionalText}>(optional)</span>
          </span>
          <input type="text" name="note" maxLength={500} placeholder="Anything to add" />
        </label>
      </div>
      {state?.error && <p className={styles.error}>{state.error}</p>}
      <div className={styles.buttons}>
        <button type="button" className={styles.secondary} onClick={() => setOpen(false)} disabled={pending}>
          Cancel
        </button>
        <button type="submit" className={styles.approve} disabled={pending}>
          {pending ? (
            <>
              <Spinner />
              Saving…
            </>
          ) : (
            "Save reimbursement"
          )}
        </button>
      </div>
    </form>
  );
}

// "Undo reimbursement": back to Approved, with an optional reason. Asks first.
export function UndoReimbursement({ expenseId }: { expenseId: string }) {
  const [open, setOpen] = useState(false);

  async function undo(previous: ReviewState, formData: FormData) {
    const result = await undoReimbursement(previous, formData);
    if (!result) notify("Reimbursement undone");
    return result;
  }
  const [state, formAction, pending] = useActionState(undo, null);

  if (!open) {
    return (
      <button type="button" className={styles.changeButton} onClick={() => setOpen(true)}>
        Undo reimbursement
      </button>
    );
  }

  return (
    <form action={formAction} className={styles.reviewForm}>
      <input type="hidden" name="expenseId" value={expenseId} />
      <p className={styles.confirm}>
        Move this expense from <strong>Reimbursed</strong> back to <strong>Approved</strong>?
      </p>
      <input
        type="text"
        name="reason"
        maxLength={500}
        placeholder="Reason (optional), e.g. marked by mistake"
        className={styles.commentBox}
      />
      {state?.error && <p className={styles.error}>{state.error}</p>}
      <div className={styles.buttons}>
        <button type="button" className={styles.secondary} onClick={() => setOpen(false)} disabled={pending}>
          Go back
        </button>
        <button type="submit" className={styles.approve} disabled={pending}>
          {pending ? (
            <>
              <Spinner />
              Saving…
            </>
          ) : (
            "Yes, undo it"
          )}
        </button>
      </div>
    </form>
  );
}
