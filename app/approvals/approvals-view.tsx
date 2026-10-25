import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { categoryLabel, EXPENSE_COLUMNS, type Expense } from "@/lib/expenses";
import { formatDate, formatDateTime, pesos } from "@/lib/format";
import { getReceiptUrls } from "@/lib/receipts";
import { createClient } from "@/lib/supabase/server";
import { Activity, PreviousFeedback } from "../activity";
import { Header } from "../header";
import { ReceiptThumbnail } from "../receipt-thumbnail";
import { ChangeDecision } from "./change-decision";
import { ReviewForm } from "./review-form";
import pageStyles from "../page.module.css";
import styles from "./approvals.module.css";

// The approver's page. "queue" shows pending expenses with Approve/Reject;
// "history" shows the ones already approved or rejected.
export async function ApprovalsView({ view }: { view: "queue" | "history" }) {
  await connection();
  const user = await getCurrentUser();
  if (user.role !== "approver") {
    redirect("/");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("expenses")
    .select(EXPENSE_COLUMNS)
    .order("created_at", { ascending: true });

  if (error) {
    return <p className={pageStyles.message}>Could not load expenses: {error.message}</p>;
  }

  const expenses = data as unknown as Expense[];
  const pending = expenses.filter((e) => e.status === "pending");
  const reviewed = expenses
    .filter((e) => e.status !== "pending")
    .sort((a, b) => (b.reviewed_at ?? "").localeCompare(a.reviewed_at ?? ""));
  const sum = (list: Expense[]) => list.reduce((total, e) => total + Number(e.amount_php), 0);

  const shown = view === "queue" ? pending : reviewed;
  const receiptUrls = await getReceiptUrls(supabase, shown.map((e) => e.receipt_path));

  return (
    <>
      <Header user={user} active="approvals" />
      <div className={pageStyles.toolbar}>
        <h2 className={pageStyles.heading}>Approval queue</h2>
      </div>

      <section className={styles.summary}>
        <div className={`${pageStyles.card} ${pageStyles.cardPending}`}>
          <span className={pageStyles.cardLabel}>Total pending</span>
          <span className={pageStyles.cardValue}>{pesos.format(sum(pending))}</span>
        </div>
        <div className={`${pageStyles.card} ${pageStyles.cardApproved}`}>
          <span className={pageStyles.cardLabel}>Total approved</span>
          <span className={pageStyles.cardValue}>
            {pesos.format(sum(expenses.filter((e) => e.status === "approved")))}
          </span>
        </div>
      </section>

      <nav className={styles.tabs}>
        <Link href="/approvals" className={view === "queue" ? styles.tabActive : styles.tab}>
          Queue ({pending.length})
        </Link>
        <Link
          href="/approvals/history"
          className={view === "history" ? styles.tabActive : styles.tab}
        >
          History ({reviewed.length})
        </Link>
      </nav>

      {shown.length === 0 ? (
        <p className={pageStyles.message}>
          {view === "queue" ? "Nothing waiting for review. 🎉" : "No reviewed expenses yet."}
        </p>
      ) : (
        <ul className={styles.list}>
          {shown.map((e) => (
            <li key={e.id} className={styles.item}>
              <div className={styles.top}>
                {e.receipt_path && receiptUrls.has(e.receipt_path) && (
                  <ReceiptThumbnail url={receiptUrls.get(e.receipt_path)!} description={e.description} />
                )}
                <div className={pageStyles.details}>
                  <span className={pageStyles.description}>{e.description}</span>
                  <span className={pageStyles.meta}>
                    {e.submitter?.full_name ?? "Unknown"} · {formatDate(e.expense_date)} · {categoryLabel(e)}
                  </span>
                  {e.note && <span className={styles.note}>Note: {e.note}</span>}
                  <PreviousFeedback expense={e} />
                  <Activity expense={e} />
                </div>
                <div className={pageStyles.right}>
                  <span className={pageStyles.amount}>{pesos.format(Number(e.amount_php))}</span>
                  {view === "history" && (
                    <span className={`${pageStyles.badge} ${pageStyles[e.status]}`}>{e.status}</span>
                  )}
                </div>
              </div>

              {view === "queue" &&
                (e.submitted_by === user.id ? (
                  <p className={styles.ownNotice}>
                    This is your own expense, so another approver needs to review it.
                  </p>
                ) : (
                  <ReviewForm expenseId={e.id} />
                ))}

              {view === "history" && (
                <div className={styles.reviewLine}>
                  <p>
                    {e.status === "approved" ? "Approved" : "Rejected"} by{" "}
                    {e.reviewer?.full_name ?? "an approver"}
                    {e.reviewed_at && ` · ${formatDateTime(e.reviewed_at)}`}
                    {e.review_comment && (
                      <span className={pageStyles.comment}> — “{e.review_comment}”</span>
                    )}
                  </p>
                  {e.submitted_by !== user.id && (
                    <ChangeDecision key={`${e.id}-${e.status}`} expenseId={e.id} current={e.status} />
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
