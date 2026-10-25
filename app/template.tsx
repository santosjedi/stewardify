import type { ReactNode } from "react";
import styles from "./feedback.module.css";

// Wraps every page, and is re-created on each page change, so each new page
// fades and slides in. (Next.js re-renders a template on every navigation.)
export default function Template({ children }: { children: ReactNode }) {
  return <div className={styles.pageEnter}>{children}</div>;
}
