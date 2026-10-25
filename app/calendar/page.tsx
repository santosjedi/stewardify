import { Suspense } from "react";
import { connection } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { dueTone, todayISO } from "@/lib/dates";
import { EXPENSE_COLUMNS, type Expense } from "@/lib/expenses";
import { pesos } from "@/lib/format";
import { getReceiptUrls } from "@/lib/receipts";
import { createClient } from "@/lib/supabase/server";
import { ExpenseDetail } from "../expense-detail";
import { Header } from "../header";
import { PageSkeleton } from "../skeleton";
import { CalendarGrid, type CalendarItem } from "./calendar-grid";
import pageStyles from "../page.module.css";

export default function CalendarPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  return (
    <main className={pageStyles.main}>
      <Suspense fallback={<PageSkeleton cards={0} />}>
        <Calendar searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

function shiftMonth(month: string, by: number) {
  const [y, m] = month.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1 + by, 1));
  return date.toISOString().slice(0, 7);
}

// The weeks of a month, Sunday first, including the days from the
// neighboring months that fill out the first and last weeks.
function monthWeeks(month: string) {
  const [y, m] = month.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const start = new Date(Date.UTC(y, m - 1, 1 - first.getUTCDay()));
  const weeks: { date: string; inMonth: boolean }[][] = [];
  const cursor = new Date(start);
  do {
    const week = [];
    for (let i = 0; i < 7; i++) {
      week.push({ date: cursor.toISOString().slice(0, 10), inMonth: cursor.getUTCMonth() === m - 1 });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    weeks.push(week);
  } while (cursor.getUTCMonth() === m - 1);
  return weeks;
}

async function Calendar({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  await connection();
  const user = await getCurrentUser();
  const today = todayISO();
  const requested = (await searchParams).month;
  const month = requested && /^\d{4}-(0[1-9]|1[0-2])$/.test(requested) ? requested : today.slice(0, 7);

  // Security rules decide which expenses come back (own, or all for approvers).
  const supabase = await createClient();
  const { data, error } = await supabase.from("expenses").select(EXPENSE_COLUMNS);
  if (error) {
    return <p className={pageStyles.message}>Could not load expenses: {error.message}</p>;
  }
  const expenses = data as unknown as Expense[];

  // Approvers: pending expenses on their "Needed by" date.
  // Everyone: their own rejected expenses on their "Revise by" date.
  const dated = expenses.flatMap((e) => {
    if (user.role === "approver" && e.status === "pending" && e.needed_by) {
      return [{ expense: e, date: e.needed_by, kind: "Needed by" }];
    }
    if (e.submitted_by === user.id && e.status === "rejected" && e.revise_by) {
      return [{ expense: e, date: e.revise_by, kind: "Revise by" }];
    }
    return [];
  });

  const receiptUrls = await getReceiptUrls(supabase, dated.map((d) => d.expense.receipt_path));
  const items: CalendarItem[] = dated
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(({ expense: e, date, kind }) => ({
      id: e.id,
      date,
      kind,
      title: e.description,
      amount: pesos.format(Number(e.amount_php)),
      who: e.submitter?.full_name ?? "Unknown",
      tone: dueTone(date, today),
      detail: (
        <ExpenseDetail
          expense={e}
          receiptUrl={e.receipt_path ? receiptUrls.get(e.receipt_path) : undefined}
        />
      ),
    }));

  const title = new Date(`${month}-01T00:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  return (
    <>
      <Header user={user} active="calendar" />
      <div className={pageStyles.toolbar}>
        <h2 className={pageStyles.heading}>Calendar</h2>
      </div>
      <CalendarGrid
        title={title}
        month={month}
        prevHref={`/calendar?month=${shiftMonth(month, -1)}`}
        nextHref={`/calendar?month=${shiftMonth(month, 1)}`}
        thisMonthHref={`/calendar?month=${today.slice(0, 7)}`}
        today={today}
        weeks={monthWeeks(month)}
        items={items}
        intro={
          user.role === "approver"
            ? "Pending expenses on their “Needed by” dates, plus your own rejected expenses on their “Revise by” dates."
            : "Your rejected expenses on their “Revise by” dates."
        }
      />
    </>
  );
}
