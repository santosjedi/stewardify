import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { budgetLines, recommendations, type Budget, type BudgetLine, type Recommendation } from "@/lib/budgets";
import { pesos } from "@/lib/format";
import {
  monthLabel,
  monthProjection,
  recentMonths,
  spendingByCategory,
  spendingByMonth,
  todayInManila,
  type SpendingRow,
} from "@/lib/spending";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "../empty-state";
import { Header } from "../header";
import { categoryIcon, Icon } from "../icons";
import { PageSkeleton } from "../skeleton";
import pageStyles from "../page.module.css";
import styles from "./dashboard.module.css";

const MONTHS_SHOWN = 6;

export default function DashboardPage() {
  return (
    <main className={pageStyles.main}>
      <Suspense fallback={<PageSkeleton cards={0} />}>
        <Dashboard />
      </Suspense>
    </main>
  );
}

async function Dashboard() {
  await connection();
  const user = await getCurrentUser();
  if (user.role !== "approver") {
    redirect("/");
  }

  // Approvers can read every expense (the database's security rules decide this).
  const supabase = await createClient();
  const [{ data, error }, { data: budgetRows, error: budgetError }] = await Promise.all([
    supabase.from("expenses").select("amount_php, category, expense_date, status"),
    supabase.from("category_budgets").select("category, monthly_amount"),
  ]);

  if (error) {
    return <p className={pageStyles.message}>Could not load expenses: {error.message}</p>;
  }

  const rows = data as SpendingRow[];
  const today = todayInManila(new Date());
  const months = recentMonths(today, MONTHS_SHOWN);
  const byMonth = spendingByMonth(rows, months);
  const byCategory = spendingByCategory(rows, months);
  const projection = monthProjection(rows, today);
  const range = `${monthLabel(months[0], true)} – ${monthLabel(months[months.length - 1], true)}`;
  const budgets = (budgetRows ?? []) as Budget[];
  const lines = budgetLines(rows, budgets, today);
  const advice = recommendations(rows, budgets, today, (n) => pesos.format(n));

  return (
    <>
      <Header user={user} active="dashboard" />
      <div className={pageStyles.toolbar}>
        <h2 className={pageStyles.heading}>Dashboard</h2>
      </div>
      <p className={styles.scope}>
        Spending means <strong>approved</strong> expenses (including ones already reimbursed), counted by
        their expense date. Pending and rejected expenses aren&apos;t included.
      </p>

      <Projection projection={projection} />

      <div className={styles.grid}>
        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <h3>Budget this month</h3>
            <Link href="/budgets" className={styles.panelLink}>
              Manage budgets →
            </Link>
          </div>
          {budgetError ? (
            <p className={styles.math}>Budgets aren&apos;t available yet: {budgetError.message}</p>
          ) : lines.length === 0 ? (
            <EmptyState
              title="No budgets set"
              text="Set monthly budgets per category to see spending against them here."
              action={
                <Link href="/budgets" className={pageStyles.newButton}>
                  Set budgets
                </Link>
              }
            />
          ) : (
            <BudgetBars lines={lines} />
          )}
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <h3>Recommendations</h3>
            <span>Based only on your approved expenses and budgets</span>
          </div>
          {advice.length === 0 ? (
            <p className={styles.math}>
              Nothing to flag right now. Recommendations appear when a category nears or passes its budget,
              is on pace to pass it, has stayed under budget for 2 months, or has spending without a budget.
            </p>
          ) : (
            <Recommendations items={advice} />
          )}
        </section>
      </div>

      <div className={styles.grid}>
        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <h3>Spending by month</h3>
            <span>{range}</span>
          </div>
          <MonthChart data={byMonth} />
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <h3>Spending by category</h3>
            <span>{range}</span>
          </div>
          {byCategory.length === 0 ? (
            <EmptyState title="No approved spending yet" text="Categories will appear here once expenses are approved." />
          ) : (
            <CategoryChart data={byCategory} />
          )}
        </section>
      </div>
    </>
  );
}

function Projection({ projection: p }: { projection: ReturnType<typeof monthProjection> }) {
  const month = monthLabel(p.thisMonth);
  const fullMonth = new Date(`${p.thisMonth}-01T00:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    timeZone: "UTC",
  });

  return (
    <section className={styles.projection}>
      <span className={styles.projectionIcon}>
        <Icon name="trend" size={22} />
      </span>
      <div className={styles.projectionBody}>
        <span className={styles.projectionLabel}>{fullMonth} projection</span>
        {p.spentSoFar > 0 ? (
          <p className={styles.projectionText}>
            At this pace, you&apos;ll spend about <strong>{pesos.format(p.projected)}</strong> this month.
          </p>
        ) : (
          <p className={styles.projectionText}>No approved spending dated this month yet, so there&apos;s no pace to project from.</p>
        )}
        <p className={styles.math}>
          How it&apos;s worked out: {pesos.format(p.spentSoFar)} approved so far ({month} 1–{p.daysSoFar}) ÷{" "}
          {p.daysSoFar} {p.daysSoFar === 1 ? "day" : "days"} = {pesos.format(p.perDay)} per day × {p.daysInMonth}{" "}
          days in {fullMonth} ≈ {pesos.format(p.projected)}. It assumes the rest of the month continues at the
          same daily pace, so it&apos;s rough early in the month.
        </p>
        <ul className={styles.facts}>
          <li>
            <span>Approved so far</span>
            <strong>{pesos.format(p.spentSoFar)}</strong>
          </li>
          <li>
            <span>Still pending this month</span>
            <strong>{pesos.format(p.pendingThisMonth)}</strong>
          </li>
          <li>
            <span>Last month ({monthLabel(p.lastMonth)}), approved</span>
            <strong>{pesos.format(p.lastMonthTotal)}</strong>
          </li>
        </ul>
      </div>
    </section>
  );
}

// Vertical bars, one per month, scaled to the biggest month.
function MonthChart({ data }: { data: { month: string; total: number }[] }) {
  const max = Math.max(...data.map((d) => d.total), 1);
  return (
    <div className={styles.months} role="img" aria-label={data.map((d) => `${monthLabel(d.month, true)}: ${pesos.format(d.total)}`).join(", ")}>
      {data.map((d) => (
        <div key={d.month} className={styles.monthCol}>
          <span className={styles.monthValue}>{d.total > 0 ? pesos.format(d.total) : "—"}</span>
          <div className={styles.monthBarArea}>
            <div className={styles.monthBar} style={{ height: `${(d.total / max) * 100}%` }} />
          </div>
          <span className={styles.monthName}>{monthLabel(d.month)}</span>
        </div>
      ))}
    </div>
  );
}

// Horizontal bars, one per category, biggest first.
function CategoryChart({ data }: { data: { category: string; total: number }[] }) {
  const max = Math.max(...data.map((d) => d.total), 1);
  const sum = data.reduce((total, d) => total + d.total, 0);
  return (
    <ul className={styles.categories}>
      {data.map((d) => (
        <li key={d.category} className={styles.categoryRow}>
          <span className={styles.categoryName}>
            <span className={styles.categoryIcon}>
              <Icon name={categoryIcon(d.category)} size={16} />
            </span>
            {d.category}
          </span>
          <div className={styles.categoryBarArea}>
            <div className={styles.categoryBar} style={{ width: `${(d.total / max) * 100}%` }} />
          </div>
          <span className={styles.categoryValue}>
            {pesos.format(d.total)}
            <small>{Math.round((d.total / sum) * 100)}%</small>
          </span>
        </li>
      ))}
    </ul>
  );
}

const BAR_TONE: Record<BudgetLine["tone"], string> = {
  green: styles.barGreen,
  amber: styles.barAmber,
  red: styles.barRed,
};

// Each budget as a progress bar: green under 75%, amber 75–100%, red over 100%.
function BudgetBars({ lines }: { lines: BudgetLine[] }) {
  return (
    <ul className={styles.budgets}>
      {lines.map((line) => {
        const percent = Number.isFinite(line.percent) ? Math.round(line.percent) : null;
        return (
          <li key={line.category} className={`${styles.budgetRow} ${BAR_TONE[line.tone]}`}>
            <div className={styles.budgetTop}>
              <span className={styles.categoryName}>
                <span className={styles.categoryIcon}>
                  <Icon name={categoryIcon(line.category)} size={16} />
                </span>
                {line.category}
              </span>
              <span className={styles.budgetPercent}>{percent === null ? "No budget amount" : `${percent}%`}</span>
            </div>
            <div
              className={styles.budgetTrack}
              role="progressbar"
              aria-label={`${line.category} budget used`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.min(percent ?? 100, 100)}
            >
              <div className={styles.budgetFill} style={{ width: `${Math.min(percent ?? 100, 100)}%` }} />
            </div>
            <span className={styles.budgetNumbers}>
              {pesos.format(line.spent)} of {pesos.format(line.budget)}
              {line.spent > line.budget
                ? ` · ${pesos.format(line.spent - line.budget)} over`
                : ` · ${pesos.format(line.budget - line.spent)} left`}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

const ADVICE_TONE: Record<Recommendation["tone"], string> = {
  red: styles.adviceRed,
  amber: styles.adviceAmber,
  blue: styles.adviceBlue,
};

function Recommendations({ items }: { items: Recommendation[] }) {
  return (
    <ul className={styles.advice}>
      {items.map((item) => (
        <li key={item.title} className={`${styles.adviceItem} ${ADVICE_TONE[item.tone]}`}>
          <span className={styles.adviceIcon}>
            <Icon name="lightbulb" size={18} />
          </span>
          <div className={styles.adviceBody}>
            <strong>{item.title}.</strong>
            <span>{item.advice}</span>
            <ul className={styles.adviceNumbers}>
              {item.numbers.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          </div>
        </li>
      ))}
    </ul>
  );
}
