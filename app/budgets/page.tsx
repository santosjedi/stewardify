import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { CATEGORIES } from "@/lib/expenses";
import { pesos } from "@/lib/format";
import { todayInManila } from "@/lib/spending";
import { createClient } from "@/lib/supabase/server";
import { Header } from "../header";
import { PageSkeleton } from "../skeleton";
import { BudgetForm } from "./budget-form";
import pageStyles from "../page.module.css";
import styles from "./budgets.module.css";

export default function BudgetsPage() {
  return (
    <main className={pageStyles.main}>
      <Suspense fallback={<PageSkeleton cards={0} />}>
        <Budgets />
      </Suspense>
    </main>
  );
}

async function Budgets() {
  await connection();
  const user = await getCurrentUser();
  if (user.role !== "approver") {
    redirect("/");
  }

  const today = todayInManila(new Date());
  const month = `${today.year}-${String(today.month).padStart(2, "0")}`;
  const nextMonth = new Date(Date.UTC(today.year, today.month, 1)).toISOString().slice(0, 10);

  const supabase = await createClient();
  const [{ data: budgets, error }, { data: spending }] = await Promise.all([
    supabase.from("category_budgets").select("category, monthly_amount"),
    supabase
      .from("expenses")
      .select("category, amount_php")
      .in("status", ["approved", "reimbursed"])
      .gte("expense_date", `${month}-01`)
      .lt("expense_date", nextMonth),
  ]);

  if (error) {
    return <p className={pageStyles.message}>Could not load budgets: {error.message}</p>;
  }

  const budgetFor = new Map((budgets ?? []).map((b) => [b.category, Number(b.monthly_amount)]));
  const spentFor = new Map<string, number>();
  for (const row of spending ?? []) {
    spentFor.set(row.category, (spentFor.get(row.category) ?? 0) + Number(row.amount_php));
  }

  const rows = CATEGORIES.map((category) => ({
    category,
    budget: budgetFor.has(category) ? budgetFor.get(category)!.toFixed(2) : "",
    spentThisMonth: pesos.format(spentFor.get(category) ?? 0),
  }));

  return (
    <>
      <Header user={user} active="budgets" />
      <div className={pageStyles.toolbar}>
        <h2 className={pageStyles.heading}>Budgets</h2>
      </div>
      <p className={styles.intro}>
        Set a monthly budget for each category. The Dashboard compares each month&apos;s approved spending
        with these amounts. Only approvers can see and change budgets.
      </p>
      {/* Re-created after saving, so the boxes show what was saved. */}
      <BudgetForm key={rows.map((r) => r.budget).join("|")} rows={rows} />
    </>
  );
}
