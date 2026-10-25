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
  submitter: { full_name: string } | null;
  reviewer: { full_name: string } | null;
};

// The columns to fetch for an expense, plus the submitter's and reviewer's
// names from profiles (through the "submitted by" and "reviewed by" links).
export const EXPENSE_COLUMNS =
  "id, expense_date, description, category, amount_php, note, status, receipt_path, submitted_by, review_comment, reviewed_at, " +
  "submitter:profiles!expenses_submitted_by_fkey(full_name), " +
  "reviewer:profiles!expenses_reviewed_by_fkey(full_name)";
