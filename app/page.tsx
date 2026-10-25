import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "./auth/actions";
import { ReceiptThumbnail } from "./receipt-thumbnail";
import styles from "./page.module.css";

type Status = "pending" | "approved" | "rejected";

type Expense = {
  id: string;
  expense_date: string;
  description: string;
  category: string;
  amount_php: number;
  status: Status;
  receipt_path: string | null;
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
      <Suspense fallback={<p className={styles.message}>Loading…</p>}>
        <Dashboard />
      </Suspense>
    </main>
  );
}

async function Dashboard() {
  // This part is different for each visit (it checks who is signed in and the time).
  await connection();
  const user = await getCurrentUser();

  return (
    <>
      <header className={styles.header}>
        <h1 className={styles.title}>Stewardify</h1>
        <div className={styles.user}>
          <span className={styles.userName}>{user.fullName}</span>
          <span className={styles.role}>{user.role}</span>
          <form action={signOut}>
            <button type="submit" className={styles.signOut}>
              Sign out
            </button>
          </form>
        </div>
      </header>
      <div className={styles.toolbar}>
        <h2 className={styles.heading}>
          {user.role === "approver" ? "All expenses" : "My expenses"}
        </h2>
        <Link href="/expenses/new" className={styles.newButton}>
          + Submit expense
        </Link>
      </div>
      <Expenses />
    </>
  );
}

// Supabase's security rules decide which rows come back:
// submitters get their own, approvers get everyone's.
async function Expenses() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("expenses")
    .select("id, expense_date, description, category, amount_php, status, receipt_path")
    .order("created_at", { ascending: false });

  if (error) {
    return <p className={styles.message}>Could not load expenses: {error.message}</p>;
  }

  const expenses = data as Expense[];
  const total = expenses.reduce((sum, e) => sum + Number(e.amount_php), 0);
  const count = (status: Status) => expenses.filter((e) => e.status === status).length;

  // Receipts are private, so ask for temporary links (good for 1 hour) to show them.
  const paths = expenses.map((e) => e.receipt_path).filter((p): p is string => Boolean(p));
  const receiptUrls = new Map<string, string>();
  if (paths.length > 0) {
    const { data: signed } = await supabase.storage.from("receipts").createSignedUrls(paths, 60 * 60);
    signed?.forEach((s) => s.path && s.signedUrl && receiptUrls.set(s.path, s.signedUrl));
  }

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
              {e.receipt_path && receiptUrls.has(e.receipt_path) && (
                <ReceiptThumbnail url={receiptUrls.get(e.receipt_path)!} description={e.description} />
              )}
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
