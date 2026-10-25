"use client";

import { useActionState, useRef, useState } from "react";
import type { Status } from "@/lib/expenses";
import { centerOf, notify, Spinner } from "../feedback";
import { changeDecision, type ReviewState } from "./actions";
import styles from "./approvals.module.css";

const LABELS: Record<Status, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
};

const OPTIONS: { value: Status; label: string }[] = [
  { value: "approved", label: "Approve" },
  { value: "rejected", label: "Reject" },
  { value: "pending", label: "Move back to pending" },
];

// "Change decision" on a reviewed expense: pick a new decision, add a comment,
// then confirm before it's saved.
export function ChangeDecision({ expenseId, current }: { expenseId: string; current: Status }) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  // Saves the change; on success, shows a message (and confetti for approvals).
  async function change(previous: ReviewState, formData: FormData) {
    const decision = formData.get("decision");
    const origin = centerOf(confirmRef.current);
    const result = await changeDecision(previous, formData);
    if (!result) {
      if (decision === "approved") notify("Approved", origin);
      else if (decision === "rejected") notify("Rejected");
      else notify("Moved back to pending");
    }
    return result;
  }

  const [state, formAction, pending] = useActionState(change, null);
  const [open, setOpen] = useState(false);
  const [choice, setChoice] = useState<Status | null>(null);
  const [comment, setComment] = useState("");
  const [reviseBy, setReviseBy] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  function close() {
    setOpen(false);
    setChoice(null);
    setComment("");
    setReviseBy("");
    setConfirming(false);
    setProblem(null);
  }

  function next() {
    if (!choice) {
      setProblem("Please choose a new decision.");
      return;
    }
    if (choice === "rejected" && !comment.trim()) {
      setProblem("Please add a short comment explaining why it's rejected.");
      return;
    }
    setProblem(null);
    setConfirming(true);
  }

  if (!open) {
    return (
      <button type="button" className={styles.changeButton} onClick={() => setOpen(true)}>
        Change decision
      </button>
    );
  }

  const error = problem ?? state?.error;

  return (
    <form action={formAction} className={styles.reviewForm}>
      <input type="hidden" name="expenseId" value={expenseId} />
      <input type="hidden" name="fromStatus" value={current} />
      <input type="hidden" name="decision" value={choice ?? ""} />
      <input type="hidden" name="comment" value={comment} />
      <input type="hidden" name="reviseBy" value={choice === "rejected" ? reviseBy : ""} />

      {!confirming ? (
        <>
          <fieldset className={styles.choices}>
            <legend className={styles.choicesLabel}>Change to</legend>
            {OPTIONS.filter((o) => o.value !== current).map((o) => (
              <label key={o.value} className={styles.choice}>
                <input
                  type="radio"
                  name="choice"
                  value={o.value}
                  checked={choice === o.value}
                  onChange={() => setChoice(o.value)}
                />
                {o.label}
              </label>
            ))}
          </fieldset>
          <textarea
            rows={2}
            maxLength={500}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder={
              choice === "rejected"
                ? "Comment (required): why is it rejected?"
                : "Comment (optional): why the change?"
            }
            className={styles.commentBox}
          />
          {choice === "rejected" && (
            <label className={styles.dateField}>
              Revise by <span>(optional)</span>
              <input type="date" value={reviseBy} onChange={(event) => setReviseBy(event.target.value)} />
            </label>
          )}
          {error && <p className={styles.error}>{error}</p>}
          <div className={styles.buttons}>
            <button type="button" className={styles.secondary} onClick={close}>
              Cancel
            </button>
            <button type="button" className={styles.approve} onClick={next}>
              Continue
            </button>
          </div>
        </>
      ) : (
        <>
          <p className={styles.confirm}>
            Change this expense from <strong>{LABELS[current]}</strong> to{" "}
            <strong>{choice ? LABELS[choice] : ""}</strong>?
          </p>
          {error && <p className={styles.error}>{error}</p>}
          <div className={styles.buttons}>
            <button
              type="button"
              className={styles.secondary}
              onClick={() => setConfirming(false)}
              disabled={pending}
            >
              Go back
            </button>
            <button ref={confirmRef} type="submit" className={styles.approve} disabled={pending}>
              {pending ? (
                <>
                  <Spinner />
                  Saving…
                </>
              ) : (
                "Yes, change it"
              )}
            </button>
          </div>
        </>
      )}
    </form>
  );
}
