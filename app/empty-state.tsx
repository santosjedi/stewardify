import type { ReactNode } from "react";
import styles from "./page.module.css";

// A friendly "nothing here yet" message with a small drawing of a receipt.
export function EmptyState({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
  return (
    <div className={styles.empty}>
      <svg className={styles.emptyArt} viewBox="0 0 120 100" aria-hidden="true">
        <circle cx="60" cy="52" r="40" fill="#cee1d9" />
        <path d="M42 22h36v58l-6-4-6 4-6-4-6 4-6-4-6 4V22z" fill="#ffffff" stroke="#255c4d" strokeWidth="2.5" strokeLinejoin="round" />
        <path d="M50 36h20M50 46h20M50 56h12" stroke="#255c4d" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M88 20l2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5z" fill="#3d91e0" />
        <circle cx="30" cy="34" r="3" fill="#3d91e0" />
      </svg>
      <h3 className={styles.emptyTitle}>{title}</h3>
      <p className={styles.emptyText}>{text}</p>
      {action}
    </div>
  );
}
