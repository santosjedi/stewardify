import Link from "next/link";
import type { CurrentUser } from "@/lib/auth";
import { signOut } from "./auth/actions";
import styles from "./page.module.css";

// The top of every signed-in page: app name, links, and who is signed in.
export function Header({ user, active }: { user: CurrentUser; active: "expenses" | "approvals" }) {
  return (
    <header className={styles.header}>
      <div className={styles.brandRow}>
        <h1 className={styles.title}>Stewardify</h1>
        {user.role === "approver" && (
          <nav className={styles.nav}>
            <Link href="/" className={active === "expenses" ? styles.navActive : styles.navLink}>
              Expenses
            </Link>
            <Link
              href="/approvals"
              className={active === "approvals" ? styles.navActive : styles.navLink}
            >
              Approval queue
            </Link>
          </nav>
        )}
      </div>
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
  );
}
