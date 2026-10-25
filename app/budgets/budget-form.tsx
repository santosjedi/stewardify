"use client";

import { useActionState } from "react";
import { notify, Spinner } from "../feedback";
import { categoryIcon, Icon } from "../icons";
import { saveBudgets, type BudgetState } from "./actions";
import styles from "./budgets.module.css";

type Row = { category: string; budget: string; spentThisMonth: string };

// One amount box per category. Leave a box empty for "no budget".
export function BudgetForm({ rows }: { rows: Row[] }) {
  async function save(previous: BudgetState, formData: FormData) {
    const result = await saveBudgets(previous, formData);
    if (result?.saved) notify("Budgets saved");
    return result;
  }
  const [state, formAction, pending] = useActionState(save, null);

  return (
    <form action={formAction} className={styles.form}>
      <div className={styles.head} aria-hidden="true">
        <span>Category</span>
        <span>Approved this month</span>
        <span>Monthly budget (₱)</span>
      </div>
      {rows.map((row) => (
        <label key={row.category} className={styles.row}>
          <span className={styles.category}>
            <span className={styles.icon}>
              <Icon name={categoryIcon(row.category)} size={16} />
            </span>
            {row.category}
          </span>
          <span className={styles.spent}>
            <span className={styles.mobileLabel}>Approved this month: </span>
            {row.spentThisMonth}
          </span>
          <input
            name={row.category}
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            defaultValue={row.budget}
            placeholder="No budget"
            aria-label={`Monthly budget for ${row.category}`}
            className={styles.input}
          />
        </label>
      ))}

      {state?.error && <p className={styles.error}>{state.error}</p>}

      <div className={styles.actions}>
        <span className={styles.hint}>Leave a box empty to have no budget for that category.</span>
        <button type="submit" className={styles.save} disabled={pending}>
          {pending ? (
            <>
              <Spinner />
              Saving…
            </>
          ) : (
            "Save budgets"
          )}
        </button>
      </div>
    </form>
  );
}
