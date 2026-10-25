import { duplicateKey, type Expense } from "@/lib/expenses";
import styles from "./page.module.css";

// Which expenses share an OR / Invoice number and vendor with another one.
// Only useful for approvers, who can see everyone's expenses.
export function duplicateIds(expenses: Expense[]) {
  const counts = new Map<string, number>();
  for (const e of expenses) {
    const key = duplicateKey(e);
    if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return new Set(expenses.filter((e) => (counts.get(duplicateKey(e)) ?? 0) > 1).map((e) => e.id));
}

export function DuplicateBadge() {
  return (
    <span className={styles.duplicate} title="Another expense has the same OR / Invoice number and vendor">
      Possible duplicate
    </span>
  );
}

// A short line with the receipt details, for approvers checking the queue.
export function DetailsLine({ expense: e }: { expense: Expense }) {
  const parts = [
    e.vendor_name,
    e.or_number && `OR/Invoice ${e.or_number}`,
    e.paid_vendor_via && `Paid vendor via ${e.paid_vendor_via}${e.payment_ref ? ` (Ref ${e.payment_ref})` : ""}`,
    e.vendor_tin && `TIN ${e.vendor_tin}`,
    e.project && `Project: ${e.project}`,
  ].filter(Boolean);

  if (parts.length === 0 && !e.attendees) return null;
  return (
    <span className={styles.detailsLine}>
      {parts.join(" · ")}
      {e.attendees && (
        <>
          {parts.length > 0 && <br />}
          Attendees: {e.attendees}
        </>
      )}
    </span>
  );
}

// Text the search box should also match.
export function detailsSearchText(e: Expense) {
  return [e.or_number, e.vendor_name, e.payment_ref, e.project].filter(Boolean).join(" ");
}
