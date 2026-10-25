import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { todayISO } from "@/lib/dates";
import { categoryLabel, EXPENSE_COLUMNS, isSpent, type Expense, type Status } from "@/lib/expenses";
import { formatDate, formatDateTime, pesos } from "@/lib/format";
import { getReceiptUrls } from "@/lib/receipts";
import { getReminders } from "@/lib/reminders";
import { createClient } from "@/lib/supabase/server";
import { weeklySeries } from "@/lib/series";
import { Activity, PreviousFeedback } from "./activity";
import { DueChip } from "./due-chip";
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
  const { reviewThisWeek, reviseThisWeek } = await getReminders(user);

  return (
    <>
      <ShowQueuedToast />
      <Header user={user} active="expenses" />
      <VerseCard />
      {reviewThisWeek > 0 && (
        <Link href="/calendar" className={styles.dueBanner}>
          <span>
            You have {reviewThisWeek} {reviewThisWeek === 1 ? "expense" : "expenses"} due for review this week.
          </span>
          <span className={styles.reviewBannerAction}>See calendar →</span>
        </Link>
      )}
      {reviseThisWeek > 0 && (
        <Link href="/calendar" className={styles.dueBanner}>
          <span>
            You have {reviseThisWeek} rejected {reviseThisWeek === 1 ? "expense" : "expenses"} to revise this
            week.
          </span>
          <span className={styles.reviewBannerAction}>See calendar →</span>
        </Link>
      )}
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
  // "Approved" includes expenses that have since been reimbursed.
  const matches = (e: Expense, status: Status) => (status === "approved" ? isSpent(e.status) : e.status === status);
  const count = (status: Status) => expenses.filter((e) => matches(e, status)).length;
  const receiptUrls = await getReceiptUrls(supabase, expenses.map((e) => e.receipt_path));
  const trend = (status?: Status, amount = false) =>
    weeklySeries(expenses, (e) => (status && !matches(e, status) ? 0 : amount ? Number(e.amount_php) : 1));

  // Reimbursement summary for the signed-in person's own expenses.
  const thisMonth = todayISO().slice(0, 7);
  const mine = expenses.filter((e) => e.submitted_by === userId);
  const awaiting = mine.filter((e) => e.status === "approved");
  const reimbursedThisMonth = mine.filter(
    (e) => e.status === "reimbursed" && e.reimbursed_on?.startsWith(thisMonth)
  );
  const sum = (list: Expense[]) => list.reduce((total, e) => total + Number(e.amount_php), 0);

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
            <DueChip expense={e} />
            {e.status !== "pending" && (
              <span className={styles.review}>
                {e.status === "rejected" ? "Rejected" : "Approved"} by{" "}
                {e.reviewer?.full_name ?? "an approver"}
                {e.reviewed_at && ` · ${formatDateTime(e.reviewed_at)}`}
                {e.review_comment && <span className={styles.comment}>“{e.review_comment}”</span>}
              </span>
            )}
            {e.status === "reimbursed" && (
              <span className={styles.review}>
                Reimbursed via {e.reimbursed_via}
                {e.reimbursed_on && ` · paid ${formatDate(e.reimbursed_on)}`}
                {e.reimbursement_ref && ` · Ref ${e.reimbursement_ref}`}
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
      <section className={styles.summaryTwo}>
        <StatCard
          label="Awaiting reimbursement"
          value={sum(awaiting)}
          format="pesos"
          tone="approved"
          icon="hourglass"
          series={weeklySeries(mine, (e) => (e.status === "approved" ? Number(e.amount_php) : 0))}
        />
        <StatCard
          label="Reimbursed this month"
          value={sum(reimbursedThisMonth)}
          format="pesos"
          tone="reimbursed"
          icon="wallet"
          series={weeklySeries(mine, (e) => (e.status === "reimbursed" ? Number(e.amount_php) : 0))}
        />
      </section>

      <ExpenseList
        items={items}
        chips={["pending", "approved", "rejected", "reimbursed"]}
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
