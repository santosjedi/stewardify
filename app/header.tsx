import Link from "next/link";
import type { CurrentUser } from "@/lib/auth";
import { signOut } from "./auth/actions";
import { Logo } from "./logo";
import styles from "./page.module.css";

// "Jedidiah Gabrielle Santos" → "JS"
function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

// The top of every signed-in page: app name, links, and who is signed in.
export function Header({ user, active }: { user: CurrentUser; active: "expenses" | "approvals" }) {
  return (
    <header className={styles.header}>
      <div className={styles.brandRow}>
        <Link href="/" className={styles.brand}>
          <Logo />
          <span className={styles.brandName}>Stewardify</span>
        </Link>
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
        <span className={styles.avatar} aria-hidden="true">
          {initials(user.fullName)}
        </span>
        <span className={styles.userText}>
          <span className={styles.userName}>{user.fullName}</span>
          <span className={styles.role}>{user.role}</span>
        </span>
        <form action={signOut}>
          <button type="submit" className={styles.signOut}>
            Sign out
          </button>
        </form>
      </div>
    </header>
  );
}
