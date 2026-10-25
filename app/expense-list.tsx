"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from "react";
import type { Status } from "@/lib/expenses";
import { Icon } from "./icons";
import styles from "./page.module.css";

export type ListItem = {
  id: string;
  status: Status;
  title: string;
  searchText: string; // everything the search box should match
  className: string; // how the row looks (set by the page)
  row: ReactNode; // the row itself
  detail: ReactNode; // what the slide-over panel shows
};

const CHIP_LABELS: Record<"all" | Status, string> = {
  all: "All",
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  reimbursed: "Reimbursed",
};

// Clicks on these inside a row do their own thing instead of opening the panel.
const INTERACTIVE = "a, button, input, textarea, select, label, summary, details, form, dialog";

// A list of expenses with filter chips, a search box, and a slide-over
// panel with each expense's details. Filtering only changes what's shown.
export function ExpenseList({
  items,
  chips = [],
  listClassName,
  empty,
}: {
  items: ListItem[];
  chips?: Status[];
  listClassName: string;
  empty: ReactNode;
}) {
  const [filter, setFilter] = useState<"all" | Status>("all");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const shown = useMemo(() => {
    const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
    return items.filter(
      (item) =>
        (filter === "all" || item.status === filter) &&
        words.every((word) => item.searchText.toLowerCase().includes(word))
    );
  }, [items, filter, query]);

  const open = items.find((item) => item.id === openId) ?? null;
  const close = useCallback(() => setOpenId(null), []);

  function onRowClick(event: MouseEvent, id: string) {
    if ((event.target as Element).closest(INTERACTIVE)) return;
    setOpenId(id);
  }

  return (
    <>
      <div className={styles.filters}>
        {chips.length > 0 && (
          <div className={styles.chips} role="group" aria-label="Filter by status">
            {(["all", ...chips] as const).map((chip) => {
              const count = chip === "all" ? items.length : items.filter((i) => i.status === chip).length;
              return (
                <button
                  key={chip}
                  type="button"
                  className={`${styles.chip} ${filter === chip ? styles.chipOn : ""}`}
                  aria-pressed={filter === chip}
                  onClick={() => setFilter(chip)}
                >
                  {CHIP_LABELS[chip]}
                  <span className={styles.chipCount}>{count}</span>
                </button>
              );
            })}
          </div>
        )}
        <label className={styles.search}>
          <Icon name="search" size={16} />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search expenses"
            aria-label="Search expenses"
          />
        </label>
      </div>

      {items.length === 0 ? (
        empty
      ) : shown.length === 0 ? (
        <div className={styles.noMatch}>
          <p>No expenses match{query ? ` “${query}”` : " this filter"}.</p>
          <button
            type="button"
            className={styles.clearButton}
            onClick={() => {
              setFilter("all");
              setQuery("");
            }}
          >
            Clear filters
          </button>
        </div>
      ) : (
        <ul className={listClassName}>
          {shown.map((item) => (
            <li
              key={item.id}
              className={`${styles.listItem} ${item.className}`}
              onClick={(event) => onRowClick(event, item.id)}
            >
              {item.row}
              <button
                type="button"
                className={styles.detailsButton}
                onClick={() => setOpenId(item.id)}
                aria-label={`View details for ${item.title}`}
              >
                <Icon name="chevron" size={18} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <SlideOver item={open} onClose={close} />
    </>
  );
}

// The panel that slides in from the right with one expense's details.
export function SlideOver({
  item,
  onClose,
}: {
  item: Pick<ListItem, "title" | "detail"> | null;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const returnTo = useRef<Element | null>(null);

  useEffect(() => {
    if (!item) return;
    returnTo.current = document.activeElement;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      (returnTo.current as HTMLElement | null)?.focus?.();
    };
  }, [item, onClose]);

  if (!item) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <aside
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-label={`Details for ${item.title}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.panelHeader}>
          <span className={styles.panelEyebrow}>Expense details</span>
          <button ref={closeRef} type="button" className={styles.panelClose} onClick={onClose} aria-label="Close">
            <Icon name="close" size={18} />
          </button>
        </div>
        <div className={styles.panelBody}>{item.detail}</div>
      </aside>
    </div>
  );
}
