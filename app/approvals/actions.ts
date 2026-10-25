"use server";

import { refresh } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type ReviewState = { error: string } | null;

// Approves or rejects one expense. The database's security rules make the final call:
// only approvers, only pending expenses, and never their own.
export async function reviewExpense(_prev: ReviewState, formData: FormData): Promise<ReviewState> {
  const expenseId = String(formData.get("expenseId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const comment = String(formData.get("comment") ?? "").trim();

  if (decision !== "approved" && decision !== "rejected") {
    return { error: "Please choose Approve or Reject." };
  }
  if (decision === "rejected" && !comment) {
    return { error: "Please add a short comment explaining why it's rejected." };
  }
  if (comment.length > 500) {
    return { error: "Please keep the comment under 500 characters." };
  }

  const user = await getCurrentUser();
  if (user.role !== "approver") {
    return { error: "Only approvers can review expenses." };
  }

  // The database fills in who reviewed it and when.
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("expenses")
    .update({ status: decision, review_comment: comment || null })
    .eq("id", expenseId)
    .eq("status", "pending")
    .select("id");

  if (error) {
    return { error: `Could not save the decision: ${error.message}` };
  }
  if (!data || data.length === 0) {
    return { error: "This expense couldn't be updated. It may already be reviewed, or it's your own." };
  }

  // Reload the page so the expense moves from the queue to the history.
  refresh();
  return null;
}
