import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { EXPENSE_COLUMNS, type Expense } from "@/lib/expenses";
import { getReceiptUrls } from "@/lib/receipts";
import { createClient } from "@/lib/supabase/server";
import { Header } from "../../../header";
import { ExpenseForm } from "../../new/expense-form";
import { PageSkeleton } from "../../../skeleton";
import styles from "../../../page.module.css";

// Fix a rejected expense and send it back for review.
export default function EditExpensePage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <main className={styles.main}>
      <Suspense fallback={<PageSkeleton cards={0} rows={2} />}>
        <EditExpense params={params} />
      </Suspense>
    </main>
  );
}

async function EditExpense({ params }: { params: Promise<{ id: string }> }) {
  // Different for each visit: who is signed in, and today's date.
  await connection();
  const { id } = await params;
  const user = await getCurrentUser();

  // Security rules only return expenses this person may see.
  const supabase = await createClient();
  const { data } = await supabase.from("expenses").select(EXPENSE_COLUMNS).eq("id", id).maybeSingle();
  const expense = data as unknown as Expense | null;

  if (!expense || expense.submitted_by !== user.id || expense.status !== "rejected") {
    return (
      <>
        <Header user={user} active="expenses" />
        <p className={styles.message}>
          Only your own rejected expenses can be edited and resubmitted.{" "}
          <Link href="/" className={styles.reviewBannerAction}>
            Back to my expenses
          </Link>
        </p>
      </>
    );
  }

  const receiptUrls = await getReceiptUrls(supabase, [expense.receipt_path]);
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date());

  return (
    <>
      <Header user={user} active="expenses" />
      <h1 className={styles.title}>Fix &amp; resubmit</h1>
      {expense.review_comment && (
        <p className={`${styles.feedback} ${styles.feedbackTop}`}>
          <span className={styles.feedbackLabel}>
            Feedback from {expense.reviewer?.full_name ?? "the approver"}
          </span>
          <span className={styles.comment}>“{expense.review_comment}”</span>
        </p>
      )}
      <ExpenseForm
        userId={user.id}
        today={today}
        existing={{
          id: expense.id,
          expense_date: expense.expense_date,
          description: expense.description,
          category: expense.category,
          category_other: expense.category_other,
          amount_php: expense.amount_php,
          note: expense.note,
          receiptUrl: expense.receipt_path ? (receiptUrls.get(expense.receipt_path) ?? null) : null,
        }}
      />
    </>
  );
}
