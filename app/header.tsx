import Link from "next/link";
import type { CurrentUser } from "@/lib/auth";
import { signOut } from "./auth/actions";
import { initials } from "./expense-detail";
import { Icon } from "./icons";
import { Logo } from "./logo";
import styles from "./page.module.css";

export type Page = "expenses" | "submit" | "dashboard" | "approvals" | "history";

// "Good morning" / "Good afternoon" / "Good evening", by Philippine time.
function greeting(now: Date) {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: false, timeZone: "Asia/Manila" }).format(now)
  );
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

// The sidebar (a bottom bar on phones) and the friendly page header.
// Only pages that exist are listed; approvers also get the queue and history.
export function Header({ user, active }: { user: CurrentUser; active: Page }) {
  const now = new Date();
  const today = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Manila",
  });
  const firstName = user.fullName.trim().split(/\s+/)[0];

  const links: { page: Page; href: string; label: string; icon: string }[] = [
    { page: "expenses", href: "/", label: "My Expenses", icon: "list" },
    { page: "submit", href: "/expenses/new", label: "Submit", icon: "plus" },
  ];
  if (user.role === "approver") {
    links.push(
      { page: "dashboard", href: "/dashboard", label: "Dashboard", icon: "chart" },
      { page: "approvals", href: "/approvals", label: "Approval Queue", icon: "inbox" },
      { page: "history", href: "/approvals/history", label: "History", icon: "history" }
    );
  }

  return (
    <>
      <nav className={styles.sidebar} aria-label="Main">
        <Link href="/" className={styles.sidebarBrand}>
          <Logo />
          <span className={styles.brandName}>Stewardify</span>
        </Link>
        <ul className={styles.sidebarLinks}>
          {links.map((link) => (
            <li key={link.page}>
              <Link
                href={link.href}
                className={`${styles.sidebarLink} ${active === link.page ? styles.sidebarActive : ""}`}
                aria-current={active === link.page ? "page" : undefined}
              >
                <Icon name={link.icon} />
                <span>{link.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <header className={styles.header}>
        <div className={styles.greeting}>
          <p className={styles.today}>{today}</p>
          <h1 className={styles.hello}>
            {greeting(now)}, <span className={styles.helloName}>{firstName}</span>
          </h1>
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
    </>
  );
}
