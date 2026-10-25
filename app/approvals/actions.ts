"use server";

import { refresh } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { isValidDate } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

export type ReviewState = { error: string } | null;

// Approves or rejects one expense. The database's security rules make the final call:
// only approvers, only pending expenses, and never their own.
export async function reviewExpense(_prev: ReviewState, formData: FormData): Promise<ReviewState> {
  const expenseId = String(formData.get("expenseId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const comment = String(formData.get("comment") ?? "").trim();
  const reviseBy = String(formData.get("reviseBy") ?? "");

  if (decision !== "approved" && decision !== "rejected") {
    return { error: "Please choose Approve or Reject." };
  }
  if (decision === "rejected" && reviseBy && !isValidDate(reviseBy)) {
    return { error: "Please choose a valid \"Revise by\" date, or leave it empty." };
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
    .update({
      status: decision,
      review_comment: comment || null,
      // Only kept for rejections (the database clears it otherwise).
      ...(decision === "rejected" && reviseBy ? { revise_by: reviseBy } : {}),
    })
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

const STATUSES = ["pending", "approved", "rejected"];

// Changes a decision that was already made: to approved, rejected, or back to pending.
// The database's security rules make the final call: only approvers, never their own
// expenses. The database also records each change in the activity log.
export async function changeDecision(_prev: ReviewState, formData: FormData): Promise<ReviewState> {
  const expenseId = String(formData.get("expenseId") ?? "");
  const fromStatus = String(formData.get("fromStatus") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const comment = String(formData.get("comment") ?? "").trim();
  const reviseBy = String(formData.get("reviseBy") ?? "");

  if (decision === "rejected" && reviseBy && !isValidDate(reviseBy)) {
    return { error: "Please choose a valid \"Revise by\" date, or leave it empty." };
  }
  if (!STATUSES.includes(decision) || !STATUSES.includes(fromStatus)) {
    return { error: "Please choose a new decision." };
  }
  if (decision === fromStatus) {
    return { error: `This expense is already ${decision}. Please choose a different decision.` };
  }
  if (decision === "rejected" && !comment) {
    return { error: "Please add a short comment explaining why it's rejected." };
  }
  if (comment.length > 500) {
    return { error: "Please keep the comment under 500 characters." };
  }

  const user = await getCurrentUser();
  if (user.role !== "approver") {
    return { error: "Only approvers can change decisions." };
  }

  // Only update it if it still has the status the approver saw, so two
  // approvers can't overwrite each other without noticing.
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("expenses")
    .update({
      status: decision,
      review_comment: comment || null,
      ...(decision === "rejected" && reviseBy ? { revise_by: reviseBy } : {}),
    })
    .eq("id", expenseId)
    .eq("status", fromStatus)
    .select("id");

  if (error) {
    return { error: `Could not save the change: ${error.message}` };
  }
  if (!data || data.length === 0) {
    return {
      error: "This expense couldn't be changed. Someone may have just changed it, or it's your own.",
    };
  }

  refresh();
  return null;
}
