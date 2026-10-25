import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { categoryLabel, EXPENSE_COLUMNS, type Expense } from "@/lib/expenses";
import { formatDate, formatDateTime, pesos } from "@/lib/format";
import { getReceiptUrls } from "@/lib/receipts";
import { weeklySeries } from "@/lib/series";
import { createClient } from "@/lib/supabase/server";
import { Activity, PreviousFeedback } from "../activity";
import { DueChip } from "../due-chip";
import { EmptyState } from "../empty-state";
import { ExpenseDetail, initials } from "../expense-detail";
import { ExpenseList, type ListItem } from "../expense-list";
import { StatusBadge } from "../feedback";
import { Header } from "../header";
import { categoryIcon, Icon } from "../icons";
import { ReceiptThumbnail } from "../receipt-thumbnail";
import { StatCard } from "../stat-card";
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
  const approved = expenses.filter((e) => e.status === "approved");
  const amount = (status: string) => (e: Expense) => (e.status === status ? Number(e.amount_php) : 0);

  const items: ListItem[] = shown.map((e) => {
    const receiptUrl = e.receipt_path ? receiptUrls.get(e.receipt_path) : undefined;
    const submitter = e.submitter?.full_name ?? "Unknown";
    return {
      id: e.id,
      status: e.status,
      title: e.description,
      searchText: [e.description, categoryLabel(e), submitter, e.note, e.amount_php, e.review_comment].join(" "),
      className: `${styles.item} ${pageStyles[`row_${e.status}`]}`,
      detail: <ExpenseDetail expense={e} receiptUrl={receiptUrl} />,
      row: (
        <>
          <div className={styles.top}>
            <span className={pageStyles.categoryIcon} title={categoryLabel(e)}>
              <Icon name={categoryIcon(e.category)} />
            </span>
            <div className={pageStyles.details}>
              <span className={pageStyles.description}>{e.description}</span>
              <span className={pageStyles.meta}>
                <span className={pageStyles.initials} title={submitter}>
                  {initials(submitter)}
                </span>
                {submitter} · {formatDate(e.expense_date)} · {categoryLabel(e)}
              </span>
              <DueChip expense={e} />
              {e.note && <span className={styles.note}>Note: {e.note}</span>}
              <PreviousFeedback expense={e} />
              <Activity expense={e} />
            </div>
            {receiptUrl && <ReceiptThumbnail url={receiptUrl} description={e.description} />}
            <div className={pageStyles.right}>
              <span className={pageStyles.amount}>{pesos.format(Number(e.amount_php))}</span>
              {view === "history" && (
                <StatusBadge status={e.status} className={`${pageStyles.badge} ${pageStyles[e.status]}`} />
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
        </>
      ),
    };
  });

  return (
    <>
      <Header user={user} active={view === "queue" ? "approvals" : "history"} />
      <div className={pageStyles.toolbar}>
        <h2 className={pageStyles.heading}>{view === "queue" ? "Approval queue" : "History"}</h2>
      </div>

      <section className={styles.summary}>
        <StatCard
          label="Total pending"
          value={sum(pending)}
          format="pesos"
          tone="pending"
          icon="hourglass"
          series={weeklySeries(expenses, amount("pending"))}
        />
        <StatCard
          label="Total approved"
          value={sum(approved)}
          format="pesos"
          tone="approved"
          icon="check"
          series={weeklySeries(expenses, amount("approved"))}
        />
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

      <ExpenseList
        items={items}
        chips={view === "history" ? ["approved", "rejected"] : []}
        listClassName={styles.list}
        empty={
          view === "queue" ? (
            <EmptyState title="All caught up! 🎉" text="Nothing is waiting for review right now." />
          ) : (
            <EmptyState
              title="No decisions yet"
              text="Approved and rejected expenses will appear here, with their activity."
            />
          )
        }
      />
    </>
  );
}
