import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { EXPENSE_COLUMNS, type Expense, type Status } from "@/lib/expenses";
import { formatDate, formatDateTime, pesos } from "@/lib/format";
import { getReceiptUrls } from "@/lib/receipts";
import { createClient } from "@/lib/supabase/server";
import { Header } from "./header";
import { ReceiptThumbnail } from "./receipt-thumbnail";
import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.main}>
      <Suspense fallback={<p className={styles.message}>Loading…</p>}>
        <Dashboard />
      </Suspense>
    </main>
  );
}

async function Dashboard() {
  // This part is different for each visit (it checks who is signed in and the time).
  await connection();
  const user = await getCurrentUser();

  return (
    <>
      <Header user={user} active="expenses" />
      <div className={styles.toolbar}>
        <h2 className={styles.heading}>
          {user.role === "approver" ? "All expenses" : "My expenses"}
        </h2>
        <Link href="/expenses/new" className={styles.newButton}>
          + Submit expense
        </Link>
      </div>
      <Expenses showSubmitter={user.role === "approver"} />
    </>
  );
}

// Supabase's security rules decide which rows come back:
// submitters get their own, approvers get everyone's.
async function Expenses({ showSubmitter }: { showSubmitter: boolean }) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("expenses")
    .select(EXPENSE_COLUMNS)
    .order("created_at", { ascending: false });

  if (error) {
    return <p className={styles.message}>Could not load expenses: {error.message}</p>;
  }

  const expenses = data as unknown as Expense[];
  const total = expenses.reduce((sum, e) => sum + Number(e.amount_php), 0);
  const count = (status: Status) => expenses.filter((e) => e.status === status).length;
  const receiptUrls = await getReceiptUrls(supabase, expenses.map((e) => e.receipt_path));

  return (
    <>
      {showSubmitter && count("pending") > 0 && (
        <Link href="/approvals" className={styles.reviewBanner}>
          <span>
            {count("pending")} {count("pending") === 1 ? "expense is" : "expenses are"} waiting for
            review
          </span>
          <span className={styles.reviewBannerAction}>Go to approval queue →</span>
        </Link>
      )}
      <section className={styles.summary}>
        <div className={styles.card}>
          <span className={styles.cardLabel}>Total</span>
          <span className={styles.cardValue}>{pesos.format(total)}</span>
        </div>
        <div className={styles.card}>
          <span className={styles.cardLabel}>Pending</span>
          <span className={styles.cardValue}>{count("pending")}</span>
        </div>
        <div className={styles.card}>
          <span className={styles.cardLabel}>Approved</span>
          <span className={styles.cardValue}>{count("approved")}</span>
        </div>
        <div className={styles.card}>
          <span className={styles.cardLabel}>Rejected</span>
          <span className={styles.cardValue}>{count("rejected")}</span>
        </div>
      </section>

      {expenses.length === 0 ? (
        <p className={styles.message}>No expenses yet.</p>
      ) : (
        <ul className={styles.list}>
          {expenses.map((e) => (
            <li key={e.id} className={styles.row}>
              {e.receipt_path && receiptUrls.has(e.receipt_path) && (
                <ReceiptThumbnail url={receiptUrls.get(e.receipt_path)!} description={e.description} />
              )}
              <div className={styles.details}>
                <span className={styles.description}>{e.description}</span>
                <span className={styles.meta}>
                  {showSubmitter && e.submitter && `${e.submitter.full_name} · `}
                  {formatDate(e.expense_date)} · {e.category}
                </span>
                {e.status !== "pending" && (
                  <span className={styles.review}>
                    {e.status === "approved" ? "Approved" : "Rejected"} by{" "}
                    {e.reviewer?.full_name ?? "an approver"}
                    {e.reviewed_at && ` · ${formatDateTime(e.reviewed_at)}`}
                    {e.review_comment && (
                      <span className={styles.comment}>“{e.review_comment}”</span>
                    )}
                  </span>
                )}
              </div>
              <div className={styles.right}>
                <span className={styles.amount}>{pesos.format(Number(e.amount_php))}</span>
                <span className={`${styles.badge} ${styles[e.status]}`}>{e.status}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
