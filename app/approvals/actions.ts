"use server";

import { refresh } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { isValidDate } from "@/lib/dates";
import { REIMBURSE_METHODS } from "@/lib/expenses";
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

// Records that an approved expense was paid back outside the app (no money moves here).
// The database's security rules make the final call: approvers only, never their own
// expenses, and only from "approved". It also records who marked it and when.
export async function markReimbursed(_prev: ReviewState, formData: FormData): Promise<ReviewState> {
  const expenseId = String(formData.get("expenseId") ?? "");
  const via = String(formData.get("via") ?? "");
  const paidOn = String(formData.get("paidOn") ?? "");
  const reference = String(formData.get("reference") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();

  if (!(REIMBURSE_METHODS as readonly string[]).includes(via)) {
    return { error: "Please choose how it was reimbursed." };
  }
  if (!isValidDate(paidOn)) {
    return { error: "Please choose the payment date." };
  }
  if (reference.length > 100) {
    return { error: "Please keep the reference number under 100 characters." };
  }
  if (note.length > 500) {
    return { error: "Please keep the note under 500 characters." };
  }

  const user = await getCurrentUser();
  if (user.role !== "approver") {
    return { error: "Only approvers can mark expenses as reimbursed." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("expenses")
    .update({
      status: "reimbursed",
      reimbursed_via: via,
      reimbursed_on: paidOn,
      reimbursement_ref: reference || null,
      reimbursement_note: note || null,
    })
    .eq("id", expenseId)
    .eq("status", "approved")
    .select("id");

  if (error) {
    return { error: `Could not save the reimbursement: ${error.message}` };
  }
  if (!data || data.length === 0) {
    return { error: "This expense couldn't be marked. It may have just changed, or it's your own." };
  }

  refresh();
  return null;
}

// Undo a reimbursement (back to "approved"), e.g. after a misclick. Logged with the reason.
export async function undoReimbursement(_prev: ReviewState, formData: FormData): Promise<ReviewState> {
  const expenseId = String(formData.get("expenseId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();

  if (reason.length > 500) {
    return { error: "Please keep the reason under 500 characters." };
  }

  const user = await getCurrentUser();
  if (user.role !== "approver") {
    return { error: "Only approvers can undo a reimbursement." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("expenses")
    // The reason travels in the note field; the database logs it, then clears the details.
    .update({ status: "approved", reimbursement_note: reason || null })
    .eq("id", expenseId)
    .eq("status", "reimbursed")
    .select("id");

  if (error) {
    return { error: `Could not undo the reimbursement: ${error.message}` };
  }
  if (!data || data.length === 0) {
    return { error: "This expense couldn't be changed. It may have just changed, or it's your own." };
  }

  refresh();
  return null;
}
