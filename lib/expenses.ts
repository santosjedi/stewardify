// Rules shared by the submit form (in the browser) and the server.

export const CATEGORIES = ["Transport", "Food", "Supplies", "Other"] as const;

export const RECEIPT_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_RECEIPT_BYTES = 5 * 1024 * 1024; // 5 MB

export type Status = "pending" | "approved" | "rejected";

export type Expense = {
  id: string;
  expense_date: string;
  description: string;
  category: string;
  amount_php: number;
  note: string | null;
  status: Status;
  receipt_path: string | null;
  submitted_by: string;
  review_comment: string | null;
  reviewed_at: string | null;
  created_at: string;
  submitter: { full_name: string } | null;
  reviewer: { full_name: string } | null;
  decisions: Decision[];
};

// One entry in an expense's activity log.
export type Decision = {
  id: number;
  old_status: Status;
  new_status: Status;
  comment: string | null;
  kind: "decision" | "resubmission";
  created_at: string;
  decider: { full_name: string } | null;
};

// The columns to fetch for an expense, plus the submitter's and reviewer's
// names from profiles (through the "submitted by" and "reviewed by" links),
// and its activity log with the name of whoever made each decision.
export const EXPENSE_COLUMNS =
  "id, expense_date, description, category, amount_php, note, status, receipt_path, submitted_by, review_comment, reviewed_at, created_at, " +
  "submitter:profiles!expenses_submitted_by_fkey(full_name), " +
  "reviewer:profiles!expenses_reviewed_by_fkey(full_name), " +
  "decisions:expense_decisions(id, old_status, new_status, comment, kind, created_at, " +
  "decider:profiles!expense_decisions_decided_by_fkey(full_name))";
