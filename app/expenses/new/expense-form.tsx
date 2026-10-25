"use client";

import Link from "next/link";
import { useState, useTransition, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { CATEGORIES, MAX_RECEIPT_BYTES, RECEIPT_TYPES } from "@/lib/expenses";
import { createExpense } from "./actions";
import styles from "./expense-form.module.css";

export function ExpenseForm({ userId, today }: { userId: string; today: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      // 1. Upload the receipt photo (if any) straight to the private bucket,
      //    into this person's own folder.
      const receipt = formData.get("receipt");
      formData.delete("receipt");

      if (receipt instanceof File && receipt.size > 0) {
        if (!RECEIPT_TYPES.includes(receipt.type)) {
          setError("The receipt must be a JPG, PNG, or WebP photo.");
          return;
        }
        if (receipt.size > MAX_RECEIPT_BYTES) {
          setError("The receipt photo must be 5 MB or smaller.");
          return;
        }

        const extension = receipt.type.split("/")[1];
        const path = `${userId}/${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await createClient()
          .storage.from("receipts")
          .upload(path, receipt, { contentType: receipt.type });

        if (uploadError) {
          setError(`Could not upload the receipt: ${uploadError.message}`);
          return;
        }
        formData.set("receiptPath", path);
      }

      // 2. Save the expense. On success, this goes back to the list.
      const result = await createExpense(formData);
      if (result?.error) {
        setError(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <label className={styles.field}>
        Date
        <input name="expenseDate" type="date" defaultValue={today} required />
      </label>

      <label className={styles.field}>
        Description
        <input
          name="description"
          type="text"
          maxLength={200}
          placeholder="e.g. Fare for home visits in Rizal"
          required
        />
      </label>

      <div className={styles.row}>
        <label className={styles.field}>
          Category
          <select name="category" defaultValue="" required>
            <option value="" disabled>
              Choose…
            </option>
            {CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          Amount (₱)
          <input
            name="amount"
            type="number"
            inputMode="decimal"
            min="0.01"
            step="0.01"
            placeholder="0.00"
            required
          />
        </label>
      </div>

      <label className={styles.field}>
        <span>
          Note <span className={styles.optional}>(optional)</span>
        </span>
        <textarea
          name="note"
          rows={3}
          maxLength={1000}
          placeholder="Anything the approver should know"
        />
      </label>

      <label className={styles.field}>
        <span>
          Receipt photo <span className={styles.optional}>(optional, up to 5 MB)</span>
        </span>
        <input name="receipt" type="file" accept={RECEIPT_TYPES.join(",")} />
      </label>

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.actions}>
        <Link href="/" className={styles.cancel}>
          Cancel
        </Link>
        <button type="submit" className={styles.submit} disabled={pending}>
          {pending ? "Submitting…" : "Submit expense"}
        </button>
      </div>
    </form>
  );
}
