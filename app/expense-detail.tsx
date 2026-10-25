import { categoryLabel, type Expense } from "@/lib/expenses";
import { formatDate, formatDateTime, pesos } from "@/lib/format";
import { Activity, PreviousFeedback } from "./activity";
import { categoryIcon, Icon } from "./icons";
import styles from "./page.module.css";

// "Jedidiah Gabrielle Santos" → "JS"
export function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

const STATUS_CLASS = {
  pending: styles.pending,
  approved: styles.approved,
  rejected: styles.rejected,
  reimbursed: styles.reimbursed,
};

// What the slide-over panel shows for one expense.
export function ExpenseDetail({ expense: e, receiptUrl }: { expense: Expense; receiptUrl?: string }) {
  return (
    <div className={styles.detail}>
      <div className={styles.detailTop}>
        <span className={styles.categoryIcon}>
          <Icon name={categoryIcon(e.category)} />
        </span>
        <span className={`${styles.badge} ${STATUS_CLASS[e.status]}`}>{e.status}</span>
      </div>
      <h2 className={styles.detailTitle}>{e.description}</h2>
      <p className={styles.detailAmount}>{pesos.format(Number(e.amount_php))}</p>

      <dl className={styles.detailFacts}>
        <div>
          <dt>Date</dt>
          <dd>{formatDate(e.expense_date)}</dd>
        </div>
        <div>
          <dt>Category</dt>
          <dd>{categoryLabel(e)}</dd>
        </div>
        <div>
          <dt>Submitted by</dt>
          <dd className={styles.detailPerson}>
            <span className={styles.initials}>{initials(e.submitter?.full_name ?? "?")}</span>
            {e.submitter?.full_name ?? "Unknown"}
          </dd>
        </div>
        {e.needed_by && (
          <div>
            <dt>Needed by</dt>
            <dd>{formatDate(e.needed_by)}</dd>
          </div>
        )}
        {e.revise_by && (
          <div>
            <dt>Revise by</dt>
            <dd>{formatDate(e.revise_by)}</dd>
          </div>
        )}
        {e.status === "reimbursed" && (
          <>
            <div>
              <dt>Reimbursed via</dt>
              <dd>{e.reimbursed_via}</dd>
            </div>
            <div>
              <dt>Paid on</dt>
              <dd>{e.reimbursed_on && formatDate(e.reimbursed_on)}</dd>
            </div>
            {e.reimbursement_ref && (
              <div>
                <dt>Reference</dt>
                <dd>{e.reimbursement_ref}</dd>
              </div>
            )}
            <div>
              <dt>Marked by</dt>
              <dd>
                {e.reimburser?.full_name ?? "An approver"}
                {e.reimbursed_at && <small> · {formatDateTime(e.reimbursed_at)}</small>}
              </dd>
            </div>
          </>
        )}
        {e.status !== "pending" && (
          <div>
            <dt>{e.status === "rejected" ? "Rejected by" : "Approved by"}</dt>
            <dd>
              {e.reviewer?.full_name ?? "An approver"}
              {e.reviewed_at && <small> · {formatDateTime(e.reviewed_at)}</small>}
            </dd>
          </div>
        )}
      </dl>

      {e.note && (
        <div className={styles.detailBlock}>
          <h3>Note</h3>
          <p>{e.note}</p>
        </div>
      )}
      {e.reimbursement_note && (
        <div className={styles.detailBlock}>
          <h3>Reimbursement note</h3>
          <p>{e.reimbursement_note}</p>
        </div>
      )}
      {e.review_comment && (
        <div className={styles.detailBlock}>
          <h3>Review comment</h3>
          <p className={styles.comment}>“{e.review_comment}”</p>
        </div>
      )}
      <PreviousFeedback expense={e} />

      <div className={styles.detailBlock}>
        <h3>Receipt</h3>
        {receiptUrl ? (
          <a href={receiptUrl} target="_blank" rel="noreferrer" className={styles.detailReceipt}>
            <img src={receiptUrl} alt={`Receipt for ${e.description}`} />
            <span>Open full size ↗</span>
          </a>
        ) : (
          <p className={styles.detailMuted}>No receipt photo was attached.</p>
        )}
      </div>

      <div className={styles.detailBlock}>
        <h3>Activity</h3>
        {(e.decisions ?? []).length > 0 ? (
          <Activity expense={e} open />
        ) : (
          <p className={styles.detailMuted}>
            Submitted {formatDateTime(e.created_at)}. No decisions yet.
          </p>
        )}
      </div>
    </div>
  );
}
