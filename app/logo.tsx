import styles from "./page.module.css";

// Stewardify's mark: a small sprout in a rounded green square.
export function Logo() {
  return (
    <span className={styles.logo} aria-hidden="true">
      <svg
        viewBox="0 0 24 24"
        width="18"
        height="18"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 20v-8" />
        <path d="M12 12c0-4 3-6.5 7-6.5 0 4-3 6.5-7 6.5z" />
        <path d="M12 14.5c0-3.2-2.5-5.5-6-5.5 0 3.2 2.5 5.5 6 5.5z" />
      </svg>
    </span>
  );
}
