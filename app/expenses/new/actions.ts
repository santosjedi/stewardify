"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isValidDate } from "@/lib/dates";
import { CATEGORIES, MAX_CATEGORY_OTHER } from "@/lib/expenses";

export type SubmitResult = { error: string } | undefined;

type ExpenseFields = {
  expense_date: string;
  description: string;
  category: string;
  category_other: string | null;
  amount_php: string;
  note: string | null;
  needed_by: string | null;
  receiptPath: string;
};

// Reads and checks the form's fields. Used for both new and resubmitted expenses,
// and run here on the server because the browser can't be trusted.
function readFields(formData: FormData, userId: string): { error: string } | ExpenseFields {
  const expenseDate = String(formData.get("expenseDate") ?? "");
  const description = String(formData.get("description") ?? "").trim();
  const category = String(formData.get("category") ?? "");
  const categoryOther = String(formData.get("categoryOther") ?? "").trim();
  const amount = String(formData.get("amount") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  const neededBy = String(formData.get("neededBy") ?? "");
  const receiptPath = String(formData.get("receiptPath") ?? "");

  if (!/^\d{4}-\d{2}-\d{2}$/.test(expenseDate) || isNaN(Date.parse(expenseDate))) {
    return { error: "Please choose a valid date." };
  }
  if (!description) {
    return { error: "Please enter a description." };
  }
  if (description.length > 200) {
    return { error: "Please keep the description under 200 characters." };
  }
  if (!(CATEGORIES as readonly string[]).includes(category)) {
    return { error: "Please choose a category." };
  }
  if (category === "Other" && !categoryOther) {
    return { error: "Please specify what the \"Other\" category is." };
  }
  if (category === "Other" && categoryOther.length > MAX_CATEGORY_OTHER) {
    return { error: `Please keep the category under ${MAX_CATEGORY_OTHER} characters.` };
  }
  // A number with up to 2 decimal places, more than 0.
  if (!/^\d+(\.\d{1,2})?$/.test(amount) || Number(amount) <= 0) {
    return { error: "The amount must be more than ₱0, with up to 2 decimal places." };
  }
  if (Number(amount) >= 10_000_000_000) {
    return { error: "That amount is too large." };
  }
  if (note.length > 1000) {
    return { error: "Please keep the note under 1,000 characters." };
  }
  if (neededBy && !isValidDate(neededBy)) {
    return { error: "Please choose a valid \"Needed by\" date, or leave it empty." };
  }
  if (receiptPath && !receiptPath.startsWith(`${userId}/`)) {
    return { error: "That receipt photo doesn't belong to you." };
  }

  return {
    expense_date: expenseDate,
    description,
    category,
    category_other: category === "Other" ? categoryOther : null,
    amount_php: amount,
    note: note || null,
    needed_by: neededBy || null,
    receiptPath,
  };
}

async function signedInUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) {
    redirect("/login");
  }
  return { supabase, userId };
}

// Saves a new expense.
export async function createExpense(formData: FormData): Promise<SubmitResult> {
  const { supabase, userId } = await signedInUser();
  const fields = readFields(formData, userId);
  if ("error" in fields) {
    return fields;
  }
  const { receiptPath, ...details } = fields;

  const { error } = await supabase.from("expenses").insert({
    ...details,
    receipt_path: receiptPath || null,
    status: "pending",
    submitted_by: userId,
  });

  if (error) {
    return { error: `Could not save the expense: ${error.message}` };
  }

  redirect("/");
}

// Saves the fixes to a rejected expense and sends it back for review.
// The database's security rules make the final call: only the submitter,
// only while it's rejected, and only back to "pending".
export async function resubmitExpense(expenseId: string, formData: FormData): Promise<SubmitResult> {
  const { supabase, userId } = await signedInUser();
  const fields = readFields(formData, userId);
  if ("error" in fields) {
    return fields;
  }
  const { receiptPath, ...details } = fields;

  const { data, error } = await supabase
    .from("expenses")
    .update({
      ...details,
      // A new photo replaces the old one; otherwise the old one stays.
      ...(receiptPath ? { receipt_path: receiptPath } : {}),
      status: "pending",
    })
    .eq("id", expenseId)
    .eq("submitted_by", userId)
    .eq("status", "rejected")
    .select("id");

  if (error) {
    return { error: `Could not resubmit the expense: ${error.message}` };
  }
  if (!data || data.length === 0) {
    return { error: "This expense can't be resubmitted. Only your own rejected expenses can be." };
  }

  redirect("/");
}
