import { Suspense } from "react";
import { connection } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { Header } from "../../header";
import { ExpenseForm } from "./expense-form";
import { PageSkeleton } from "../../skeleton";
import styles from "../../page.module.css";

export default function NewExpensePage() {
  return (
    <main className={styles.main}>
      <Suspense fallback={<PageSkeleton cards={0} rows={2} />}>
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

  return (
    <>
      <Header user={user} active="submit" />
      <h1 className={styles.title}>Submit expense</h1>
      <ExpenseForm userId={user.id} today={today} />
    </>
  );
}
