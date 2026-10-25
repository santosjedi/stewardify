import { Suspense } from "react";
import { ApprovalsView } from "./approvals-view";
import styles from "../page.module.css";

export default function ApprovalQueuePage() {
  return (
    <main className={styles.main}>
      <Suspense fallback={<p className={styles.message}>Loading…</p>}>
        <ApprovalsView view="queue" />
      </Suspense>
    </main>
  );
}
