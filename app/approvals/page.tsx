import { Suspense } from "react";
import { ApprovalsView } from "./approvals-view";
import { PageSkeleton } from "../skeleton";
import styles from "../page.module.css";

export default function ApprovalQueuePage() {
  return (
    <main className={styles.main}>
      <Suspense fallback={<PageSkeleton cards={2} />}>
        <ApprovalsView view="queue" />
      </Suspense>
    </main>
  );
}
