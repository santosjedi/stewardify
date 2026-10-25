"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CATEGORIES } from "@/lib/expenses";

export type SubmitResult = { error: string } | undefined;

// Saves a new expense. Checks everything again here, because the browser can't be trusted.
export async function createExpense(formData: FormData): Promise<SubmitResult> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) {
    redirect("/login");
  }

  const expenseDate = String(formData.get("expenseDate") ?? "");
  const description = String(formData.get("description") ?? "").trim();
  const category = String(formData.get("category") ?? "");
  const amount = String(formData.get("amount") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
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
  if (receiptPath && !receiptPath.startsWith(`${userId}/`)) {
    return { error: "That receipt photo doesn't belong to you." };
  }

  const { error } = await supabase.from("expenses").insert({
    expense_date: expenseDate,
    description,
    category,
    amount_php: amount,
    note: note || null,
    receipt_path: receiptPath || null,
    status: "pending",
    submitted_by: userId,
  });

  if (error) {
    return { error: `Could not save the expense: ${error.message}` };
  }

  redirect("/");
}
