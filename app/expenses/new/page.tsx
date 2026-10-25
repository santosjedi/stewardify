import { Suspense } from "react";
import { connection } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { ExpenseForm } from "./expense-form";
import styles from "../../page.module.css";

export default function NewExpensePage() {
  return (
    <main className={styles.main}>
      <h1 className={styles.title}>Submit expense</h1>
      <Suspense fallback={<p className={styles.message}>Loading…</p>}>
        <NewExpense />
      </Suspense>
    </main>
  );
}

async function NewExpense() {
  // Different for each visit: who is signed in, and today's date.
  await connection();
  const user = await getCurrentUser();

  // Today in the Philippines, as YYYY-MM-DD, to fill in the date field.
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date());

  return <ExpenseForm userId={user.id} today={today} />;
}
