"use server";

import { refresh } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { CATEGORIES } from "@/lib/expenses";
import { createClient } from "@/lib/supabase/server";

export type BudgetState = { error?: string; saved?: boolean } | null;

// Saves every category's monthly budget. An empty box removes that budget.
// The database's security rules make the final call: approvers only.
export async function saveBudgets(_prev: BudgetState, formData: FormData): Promise<BudgetState> {
  const user = await getCurrentUser();
  if (user.role !== "approver") {
    return { error: "Only approvers can manage budgets." };
  }

  const toSave: { category: string; monthly_amount: string; updated_by: string; updated_at: string }[] = [];
  const toRemove: string[] = [];
  const now = new Date().toISOString();

  for (const category of CATEGORIES) {
    const value = String(formData.get(category) ?? "").trim().replace(/,/g, "");
    if (!value) {
      toRemove.push(category);
      continue;
    }
    if (!/^\d+(\.\d{1,2})?$/.test(value) || Number(value) >= 10_000_000_000) {
      return { error: `Please enter a valid amount for ${category} (0 or more, up to 2 decimal places).` };
    }
    toSave.push({ category, monthly_amount: value, updated_by: user.id, updated_at: now });
  }

  const supabase = await createClient();
  if (toSave.length > 0) {
    const { error } = await supabase.from("category_budgets").upsert(toSave, { onConflict: "category" });
    if (error) return { error: `Could not save budgets: ${error.message}` };
  }
  if (toRemove.length > 0) {
    const { error } = await supabase.from("category_budgets").delete().in("category", toRemove);
    if (error) return { error: `Could not remove budgets: ${error.message}` };
  }

  refresh();
  return { saved: true };
}
