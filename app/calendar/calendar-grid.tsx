"use client";

import Link from "next/link";
import { useCallback, useState, type ReactNode } from "react";
import type { DueTone } from "@/lib/dates";
import { SlideOver } from "../expense-list";
import styles from "./calendar.module.css";

export type CalendarItem = {
  id: string;
  date: string;
  kind: string; // "Needed by" or "Revise by"
  title: string;
  amount: string;
  who: string;
  tone: DueTone;
  detail: ReactNode;
};

const TONE_CLASS: Record<DueTone, string> = {
  overdue: styles.overdue,
  soon: styles.soon,
  later: styles.later,
};

const TONE_LABEL: Record<DueTone, string> = {
  overdue: "Overdue",
  soon: "Due within 3 days",
  later: "Coming up",
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// A month grid with the dated expenses on it, and the same list underneath.
// Clicking an item opens its details in the side panel.
export function CalendarGrid({
  title,
  month,
  prevHref,
  nextHref,
  thisMonthHref,
  today,
  weeks,
  items,
  intro,
}: {
  title: string;
  month: string;
  prevHref: string;
  nextHref: string;
  thisMonthHref: string;
  today: string;
  weeks: { date: string; inMonth: boolean }[][];
  items: CalendarItem[];
  intro: string;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const close = useCallback(() => setOpenId(null), []);
  const open = items.find((item) => item.id === openId) ?? null;
  const inMonth = items.filter((item) => item.date.startsWith(month));

  const byDate = new Map<string, CalendarItem[]>();
  for (const item of items) {
    byDate.set(item.date, [...(byDate.get(item.date) ?? []), item]);
  }

  return (
    <>
      <p className={styles.intro}>{intro}</p>

      <div className={styles.calendar}>
        <div className={styles.bar}>
          <Link href={prevHref} className={styles.navButton} aria-label="Previous month">
            ‹
          </Link>
          <h3 className={styles.month}>{title}</h3>
          <Link href={nextHref} className={styles.navButton} aria-label="Next month">
            ›
          </Link>
          {!today.startsWith(month) && (
            <Link href={thisMonthHref} className={styles.todayButton}>
              Today
            </Link>
          )}
        </div>

        <div className={styles.grid} role="grid" aria-label={title}>
          {WEEKDAYS.map((day) => (
            <div key={day} className={styles.weekday} role="columnheader">
              {day}
            </div>
          ))}
          {weeks.flat().map(({ date, inMonth: inThisMonth }) => {
            const dayItems = byDate.get(date) ?? [];
            return (
              <div
                key={date}
                role="gridcell"
                className={`${styles.day} ${inThisMonth ? "" : styles.otherMonth} ${date === today ? styles.today : ""}`}
              >
                <span className={styles.dayNumber}>{Number(date.slice(8))}</span>
                {dayItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`${styles.item} ${TONE_CLASS[item.tone]}`}
                    onClick={() => setOpenId(item.id)}
                    title={`${item.kind}: ${item.title} (${item.amount})`}
                  >
                    <span className={styles.itemDot} />
                    <span className={styles.itemText}>{item.title}</span>
                  </button>
                ))}
              </div>
            );
          })}
        </div>

        <div className={styles.legend}>
          {(["overdue", "soon", "later"] as const).map((tone) => (
            <span key={tone} className={styles.legendItem}>
              <span className={`${styles.legendDot} ${TONE_CLASS[tone]}`} />
              {TONE_LABEL[tone]}
            </span>
          ))}
        </div>
      </div>

      <h3 className={styles.agendaTitle}>This month</h3>
      {inMonth.length === 0 ? (
        <p className={styles.agendaEmpty}>Nothing is due this month.</p>
      ) : (
        <ul className={styles.agenda}>
          {inMonth.map((item) => (
            <li key={item.id}>
              <button type="button" className={`${styles.agendaItem} ${TONE_CLASS[item.tone]}`} onClick={() => setOpenId(item.id)}>
                <span className={styles.agendaDate}>
                  {new Date(`${item.date}T00:00:00Z`).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    timeZone: "UTC",
                  })}
                </span>
                <span className={styles.agendaMain}>
                  <strong>{item.title}</strong>
                  <small>
                    {item.kind} · {item.who} · {item.amount}
                  </small>
                </span>
                <span className={styles.agendaTone}>{TONE_LABEL[item.tone]}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <SlideOver item={open} onClose={close} />
    </>
  );
}
