import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { todayISO } from "@/lib/dates";
import { categoryLabel, EXPENSE_COLUMNS, isSpent, type Expense } from "@/lib/expenses";
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
import { DetailsLine, detailsSearchText, DuplicateBadge, duplicateIds } from "../receipt-details";
import { ReceiptThumbnail } from "../receipt-thumbnail";
import { StatCard } from "../stat-card";
import { ChangeDecision } from "./change-decision";
import { MarkReimbursed, UndoReimbursement } from "./reimburse-form";
import { ReviewForm } from "./review-form";
import pageStyles from "../page.module.css";
import styles from "./approvals.module.css";

// The approver's page. "queue" shows pending expenses with Approve/Reject;
// "reimburse" shows approved expenses not yet paid back;
// "history" shows the ones already approved, rejected, or reimbursed.
export async function ApprovalsView({ view }: { view: "queue" | "reimburse" | "history" }) {
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
  const toReimburse = expenses
    .filter((e) => e.status === "approved")
    .sort((a, b) => (a.reviewed_at ?? "").localeCompare(b.reviewed_at ?? ""));
  const today = todayISO();

  const shown = view === "queue" ? pending : view === "reimburse" ? toReimburse : reviewed;
  const receiptUrls = await getReceiptUrls(supabase, shown.map((e) => e.receipt_path));
  // "Approved" spending includes expenses that have since been reimbursed.
  const approved = expenses.filter((e) => isSpent(e.status));
  const amount = (status: string) => (e: Expense) =>
    (status === "approved" ? isSpent(e.status) : e.status === status) ? Number(e.amount_php) : 0;

  // Total owed per submitter, biggest first.
  const owed = new Map<string, { name: string; total: number; count: number }>();
  for (const e of toReimburse) {
    const entry = owed.get(e.submitted_by) ?? { name: e.submitter?.full_name ?? "Unknown", total: 0, count: 0 };
    entry.total += Number(e.amount_php);
    entry.count += 1;
    owed.set(e.submitted_by, entry);
  }
  const owedList = [...owed.values()].sort((a, b) => b.total - a.total);

  const duplicates = duplicateIds(expenses);

  const items: ListItem[] = shown.map((e) => {
    const receiptUrl = e.receipt_path ? receiptUrls.get(e.receipt_path) : undefined;
    const submitter = e.submitter?.full_name ?? "Unknown";
    return {
      id: e.id,
      status: e.status,
      title: e.description,
      searchText: [e.description, categoryLabel(e), submitter, e.note, e.amount_php, e.review_comment, detailsSearchText(e)].join(" "),
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
              {duplicates.has(e.id) && <DuplicateBadge />}
              <DetailsLine expense={e} />
              {e.note && <span className={styles.note}>Note: {e.note}</span>}
              <PreviousFeedback expense={e} />
              <Activity expense={e} />
            </div>
            {receiptUrl && <ReceiptThumbnail url={receiptUrl} description={e.description} />}
            <div className={pageStyles.right}>
              <span className={pageStyles.amount}>{pesos.format(Number(e.amount_php))}</span>
              {view !== "queue" && (
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

          {view !== "queue" && (
            <div className={styles.reviewLine}>
              <p>
                {e.status === "rejected" ? "Rejected" : "Approved"} by{" "}
                {e.reviewer?.full_name ?? "an approver"}
                {e.reviewed_at && ` · ${formatDateTime(e.reviewed_at)}`}
                {e.review_comment && (
                  <span className={pageStyles.comment}> — “{e.review_comment}”</span>
                )}
              </p>
              {e.status === "reimbursed" && (
                <p>
                  Reimbursed via {e.reimbursed_via}
                  {e.reimbursed_on && ` · paid ${formatDate(e.reimbursed_on)}`}
                  {e.reimbursement_ref && ` · Ref ${e.reimbursement_ref}`}
                  {e.reimburser && ` · marked by ${e.reimburser.full_name}`}
                </p>
              )}
              {e.submitted_by === user.id ? (
                view === "reimburse" && (
                  <p className={styles.ownNotice}>
                    This is your own expense, so another approver needs to mark it as reimbursed.
                  </p>
                )
              ) : (
                <div className={styles.actionRow} key={`${e.id}-${e.status}`}>
                  {e.status === "approved" && <MarkReimbursed expenseId={e.id} today={today} />}
                  {e.status === "reimbursed" && <UndoReimbursement expenseId={e.id} />}
                  {view === "history" && e.status !== "reimbursed" && (
                    <ChangeDecision expenseId={e.id} current={e.status} />
                  )}
                </div>
              )}
            </div>
          )}
        </>
      ),
    };
  });

  return (
    <>
      <Header user={user} active={view === "history" ? "history" : "approvals"} />
      <div className={pageStyles.toolbar}>
        <h2 className={pageStyles.heading}>
          {view === "queue" ? "Approval queue" : view === "reimburse" ? "To reimburse" : "History"}
        </h2>
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
          href="/approvals/reimburse"
          className={view === "reimburse" ? styles.tabActive : styles.tab}
        >
          To reimburse ({toReimburse.length})
        </Link>
        <Link
          href="/approvals/history"
          className={view === "history" ? styles.tabActive : styles.tab}
        >
          History ({reviewed.length})
        </Link>
      </nav>

      {view === "reimburse" && owedList.length > 0 && (
        <ul className={styles.owed} aria-label="Total owed per submitter">
          {owedList.map((o) => (
            <li key={o.name} className={styles.owedItem}>
              <span className={pageStyles.initials}>{initials(o.name)}</span>
              <span>
                <strong>{pesos.format(o.total)}</strong>
                <small>
                  owed to {o.name} · {o.count} {o.count === 1 ? "expense" : "expenses"}
                </small>
              </span>
            </li>
          ))}
        </ul>
      )}

      <ExpenseList
        items={items}
        chips={view === "history" ? ["approved", "rejected", "reimbursed"] : []}
        listClassName={styles.list}
        empty={
          view === "queue" ? (
            <EmptyState title="All caught up! 🎉" text="Nothing is waiting for review right now." />
          ) : view === "reimburse" ? (
            <EmptyState title="Nothing to reimburse" text="Approved expenses that still need to be paid back will appear here." />
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
