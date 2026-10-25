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
