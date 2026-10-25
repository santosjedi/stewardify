"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import type { Reminder } from "@/lib/reminders";
import { Spinner } from "../feedback";
import { Icon } from "../icons";
import { markRemindersSeen } from "./actions";
import styles from "./bell.module.css";

// The dates are worked out on the server; this only picks the words.
type Shown = Reminder & { when: string };

const GROUPS: { kind: Reminder["kind"]; title: string }[] = [
  { kind: "review", title: "Due for review" },
  { kind: "revise", title: "To revise" },
  { kind: "decided", title: "New decisions" },
];

// The bell in the header, with a count, and a small panel listing what needs attention.
export function Bell({ reminders }: { reminders: Shown[] }) {
  const [open, setOpen] = useState(false);
  const [saving, startSaving] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const hasNew = reminders.some((r) => r.kind === "decided");

  // Close when clicking elsewhere or pressing Esc.
  useEffect(() => {
    if (!open) return;
    function onClick(event: MouseEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function markRead() {
    setError(null);
    startSaving(async () => {
      const result = await markRemindersSeen();
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div ref={wrapRef} className={styles.wrap}>
      <button
        type="button"
        className={styles.bell}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={`Reminders: ${reminders.length} ${reminders.length === 1 ? "item needs" : "items need"} attention`}
      >
        <Icon name="bell" />
        {reminders.length > 0 && <span className={styles.count}>{reminders.length}</span>}
      </button>

      {open && (
        <div className={styles.panel} role="dialog" aria-label="Reminders">
          <div className={styles.panelHead}>
            <strong>Reminders</strong>
            {hasNew && (
              <button type="button" className={styles.markRead} onClick={markRead} disabled={saving}>
                {saving && <Spinner />}
                Mark as read
              </button>
            )}
          </div>

          {reminders.length === 0 ? (
            <p className={styles.empty}>You&apos;re all caught up. 🎉</p>
          ) : (
            GROUPS.map(({ kind, title }) => {
              const items = reminders.filter((r) => r.kind === kind);
              if (items.length === 0) return null;
              return (
                <div key={kind} className={styles.group}>
                  <span className={styles.groupTitle}>{title}</span>
                  <ul className={styles.list}>
                    {items.map((r) => (
                      <li key={`${kind}-${r.id}`}>
                        <Link href={r.href} className={styles.item} onClick={() => setOpen(false)}>
                          <span
                            className={`${styles.dot} ${
                              r.overdue
                                ? styles.dotOverdue
                                : kind === "decided"
                                  ? r.status === "approved"
                                    ? styles.dotApproved
                                    : styles.dotRejected
                                  : styles.dotSoon
                            }`}
                          />
                          <span className={styles.itemText}>
                            <span className={styles.itemTitle}>{r.title}</span>
                            <span className={styles.itemWhen}>{r.when}</span>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })
          )}
          {error && <p className={styles.error}>{error}</p>}
        </div>
      )}
    </div>
  );
}
