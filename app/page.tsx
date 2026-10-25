import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { categoryLabel, EXPENSE_COLUMNS, type Expense, type Status } from "@/lib/expenses";
import { formatDate, formatDateTime, pesos } from "@/lib/format";
import { getReceiptUrls } from "@/lib/receipts";
import { createClient } from "@/lib/supabase/server";
import { weeklySeries } from "@/lib/series";
import { Activity, PreviousFeedback } from "./activity";
import { EmptyState } from "./empty-state";
import { ExpenseDetail, initials } from "./expense-detail";
import { ExpenseList, type ListItem } from "./expense-list";
import { ShowQueuedToast, StatusBadge } from "./feedback";
import { Header } from "./header";
import { categoryIcon, Icon } from "./icons";
import { ReceiptThumbnail } from "./receipt-thumbnail";
import { StatCard } from "./stat-card";
import { VerseCard } from "./verse-card";
import { PageSkeleton } from "./skeleton";
import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.main}>
      <Suspense fallback={<PageSkeleton />}>
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
      <ShowQueuedToast />
      <Header user={user} active="expenses" />
      <VerseCard />
      <div className={styles.toolbar}>
        <h2 className={styles.heading}>
          {user.role === "approver" ? "All expenses" : "My expenses"}
        </h2>
        <Link href="/expenses/new" className={styles.newButton}>
          + Submit expense
        </Link>
      </div>
      <Expenses showSubmitter={user.role === "approver"} userId={user.id} />
    </>
  );
}

// Supabase's security rules decide which rows come back:
// submitters get their own, approvers get everyone's.
async function Expenses({ showSubmitter, userId }: { showSubmitter: boolean; userId: string }) {
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
  const trend = (status?: Status, amount = false) =>
    weeklySeries(expenses, (e) => (status && e.status !== status ? 0 : amount ? Number(e.amount_php) : 1));

  const items: ListItem[] = expenses.map((e) => {
    const receiptUrl = e.receipt_path ? receiptUrls.get(e.receipt_path) : undefined;
    const submitter = e.submitter?.full_name ?? "Unknown";
    return {
      id: e.id,
      status: e.status,
      title: e.description,
      searchText: [e.description, categoryLabel(e), submitter, e.note, e.amount_php].join(" "),
      className: `${styles.row} ${styles[`row_${e.status}`]}`,
      detail: <ExpenseDetail expense={e} receiptUrl={receiptUrl} />,
      row: (
        <>
          <span className={styles.categoryIcon} title={categoryLabel(e)}>
            <Icon name={categoryIcon(e.category)} />
          </span>
          <div className={styles.details}>
            <span className={styles.description}>{e.description}</span>
            <span className={styles.meta}>
              <span className={styles.initials} title={submitter}>
                {initials(submitter)}
              </span>
              {showSubmitter && `${submitter} · `}
              {formatDate(e.expense_date)} · {categoryLabel(e)}
            </span>
            {e.status !== "pending" && (
              <span className={styles.review}>
                {e.status === "approved" ? "Approved" : "Rejected"} by{" "}
                {e.reviewer?.full_name ?? "an approver"}
                {e.reviewed_at && ` · ${formatDateTime(e.reviewed_at)}`}
                {e.review_comment && <span className={styles.comment}>“{e.review_comment}”</span>}
              </span>
            )}
            <PreviousFeedback expense={e} />
            {e.status === "rejected" && e.submitted_by === userId && (
              <Link href={`/expenses/${e.id}/edit`} className={styles.resubmitLink}>
                Edit &amp; resubmit
              </Link>
            )}
            <Activity expense={e} />
          </div>
          {receiptUrl && <ReceiptThumbnail url={receiptUrl} description={e.description} />}
          <div className={styles.right}>
            <span className={styles.amount}>{pesos.format(Number(e.amount_php))}</span>
            <StatusBadge status={e.status} className={`${styles.badge} ${styles[e.status]}`} />
          </div>
        </>
      ),
    };
  });

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
        <StatCard label="Total" value={total} format="pesos" tone="total" icon="wallet" series={trend(undefined, true)} />
        <StatCard label="Pending" value={count("pending")} format="number" tone="pending" icon="hourglass" series={trend("pending")} />
        <StatCard label="Approved" value={count("approved")} format="number" tone="approved" icon="check" series={trend("approved")} />
        <StatCard label="Rejected" value={count("rejected")} format="number" tone="rejected" icon="cross" series={trend("rejected")} />
      </section>

      <ExpenseList
        items={items}
        chips={["pending", "approved", "rejected"]}
        listClassName={styles.list}
        empty={
          <EmptyState
            title="No expenses yet"
            text="When you submit an expense, it will show up here with its status."
            action={
              <Link href="/expenses/new" className={styles.newButton}>
                + Submit your first expense
              </Link>
            }
          />
        }
      />
    </>
  );
}
