import { Suspense } from "react";
import { connection } from "next/server";
import { supabase } from "@/lib/supabase";
import styles from "./page.module.css";

type Status = "pending" | "approved" | "rejected";

type Expense = {
  id: string;
  expense_date: string;
  description: string;
  category: string;
  amount_php: number;
  status: Status;
};

// ₱1,200.00
const pesos = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });

// Oct 25, 2026 (UTC so the date never shifts by a day)
function formatDate(isoDate: string) {
  return new Date(isoDate).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default function Home() {
  return (
    <main className={styles.main}>
      <h1 className={styles.title}>Stewardify</h1>
      <Suspense fallback={<p className={styles.message}>Loading expenses…</p>}>
        <Expenses />
      </Suspense>
    </main>
  );
}

async function Expenses() {
  // Load fresh data on every visit instead of a saved copy.
  await connection();

  const { data, error } = await supabase
    .from("expenses")
    .select("id, expense_date, description, category, amount_php, status")
    .order("expense_date", { ascending: false });

  if (error) {
    return <p className={styles.message}>Could not load expenses: {error.message}</p>;
  }

  const expenses = data as Expense[];
  const total = expenses.reduce((sum, e) => sum + Number(e.amount_php), 0);
  const count = (status: Status) => expenses.filter((e) => e.status === status).length;

  return (
    <>
      <section className={styles.summary}>
        <div className={styles.card}>
          <span className={styles.cardLabel}>Total</span>
          <span className={styles.cardValue}>{pesos.format(total)}</span>
        </div>
        <div className={styles.card}>
          <span className={styles.cardLabel}>Pending</span>
          <span className={styles.cardValue}>{count("pending")}</span>
        </div>
        <div className={styles.card}>
          <span className={styles.cardLabel}>Approved</span>
          <span className={styles.cardValue}>{count("approved")}</span>
        </div>
        <div className={styles.card}>
          <span className={styles.cardLabel}>Rejected</span>
          <span className={styles.cardValue}>{count("rejected")}</span>
        </div>
      </section>

      {expenses.length === 0 ? (
        <p className={styles.message}>No expenses yet.</p>
      ) : (
        <ul className={styles.list}>
          {expenses.map((e) => (
            <li key={e.id} className={styles.row}>
              <div className={styles.details}>
                <span className={styles.description}>{e.description}</span>
                <span className={styles.meta}>
                  {formatDate(e.expense_date)} · {e.category}
                </span>
              </div>
              <div className={styles.right}>
                <span className={styles.amount}>{pesos.format(Number(e.amount_php))}</span>
                <span className={`${styles.badge} ${styles[e.status]}`}>{e.status}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
