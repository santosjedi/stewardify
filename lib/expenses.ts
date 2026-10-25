// Rules shared by the submit form (in the browser) and the server.

export const CATEGORIES = [
  "Transportation",
  "Meals & Food",
  "Office Supplies",
  "Printing & Documents",
  "Venue & Rentals",
  "Utilities",
  "Internet & Mobile Load",
  "Honorarium & Speaker Fees",
  "Outreach & Missions",
  "Scholarships & Benevolence",
  "Equipment",
  "Accommodation",
  "Other",
] as const;

export const MAX_CATEGORY_OTHER = 100;

// How the ministry paid the submitter back ("Reimbursed via").
export const REIMBURSE_METHODS = ["Cash", "GCash", "Maya", "Bank transfer", "Check"] as const;

// How the submitter paid the store ("Paid vendor via"). A different field from the one above.
export const PAID_VENDOR_METHODS = ["Cash", "GCash", "Maya", "Bank transfer", "Card", "Check", "Other"] as const;

// "Paid vendor via" methods that come with a reference / transaction number.
export const METHODS_WITH_REFERENCE = ["GCash", "Maya", "Bank transfer", "Card"];

// Limits for the optional receipt details (the database checks the same ones).
export const DETAIL_LIMITS = {
  or_number: 50,
  vendor_name: 120,
  payment_ref: 100,
  vendor_tin: 20,
  project: 100,
  attendees: 500,
};

// Two expenses with the same OR / Invoice number and vendor may be the same receipt.
// Capital letters and extra spaces don't count. Empty when either is missing.
export function duplicateKey(e: { or_number: string | null; vendor_name: string | null }) {
  const or = e.or_number?.trim().toLowerCase();
  const vendor = e.vendor_name?.trim().toLowerCase();
  return or && vendor ? `${or}|${vendor}` : "";
}

export const RECEIPT_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_RECEIPT_BYTES = 5 * 1024 * 1024; // 5 MB

export type Status = "pending" | "approved" | "rejected" | "reimbursed";

// Approved and reimbursed expenses both count as money spent.
export function isSpent(status: Status) {
  return status === "approved" || status === "reimbursed";
}

export type Expense = {
  id: string;
  expense_date: string;
  description: string;
  category: string;
  category_other: string | null;
  amount_php: number;
  note: string | null;
  status: Status;
  receipt_path: string | null;
  submitted_by: string;
  review_comment: string | null;
  reviewed_at: string | null;
  needed_by: string | null;
  revise_by: string | null;
  or_number: string | null;
  vendor_name: string | null;
  paid_vendor_via: string | null;
  payment_ref: string | null;
  vendor_tin: string | null;
  project: string | null;
  attendees: string | null;
  reimbursed_via: string | null;
  reimbursed_on: string | null;
  reimbursement_ref: string | null;
  reimbursement_note: string | null;
  reimbursed_at: string | null;
  created_at: string;
  submitter: { full_name: string } | null;
  reviewer: { full_name: string } | null;
  reimburser: { full_name: string } | null;
  decisions: Decision[];
};

// One entry in an expense's activity log.
export type Decision = {
  id: number;
  old_status: Status;
  new_status: Status;
  comment: string | null;
  kind: "decision" | "resubmission" | "reimbursement" | "undo_reimbursement";
  details: string | null;
  created_at: string;
  decider: { full_name: string } | null;
};

// The columns to fetch for an expense, plus the submitter's and reviewer's
// names from profiles (through the "submitted by" and "reviewed by" links),
// and its activity log with the name of whoever made each decision.
export const EXPENSE_COLUMNS =
  "id, expense_date, description, category, category_other, amount_php, note, status, receipt_path, submitted_by, review_comment, reviewed_at, needed_by, revise_by, " +
  "or_number, vendor_name, paid_vendor_via, payment_ref, vendor_tin, project, attendees, " +
  "reimbursed_via, reimbursed_on, reimbursement_ref, reimbursement_note, reimbursed_at, created_at, " +
  "submitter:profiles!expenses_submitted_by_fkey(full_name), " +
  "reviewer:profiles!expenses_reviewed_by_fkey(full_name), " +
  "reimburser:profiles!expenses_reimbursed_by_fkey(full_name), " +
  "decisions:expense_decisions(id, old_status, new_status, comment, kind, details, created_at, " +
  "decider:profiles!expense_decisions_decided_by_fkey(full_name))";

// "Meals & Food", or "Other: Gas for generator" when Other was specified.
export function categoryLabel(expense: { category: string; category_other: string | null }) {
  return expense.category === "Other" && expense.category_other
    ? `Other: ${expense.category_other}`
    : expense.category;
}
