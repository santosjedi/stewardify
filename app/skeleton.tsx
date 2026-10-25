import styles from "./feedback.module.css";

// A shimmering placeholder shown while a page's expenses load.
// "cards" is how many stat cards the page has (4 on the list, 2 in approvals, 0 for forms).
export function PageSkeleton({ cards = 4, rows = 3 }: { cards?: number; rows?: number }) {
  return (
    <div className={styles.skeleton} aria-busy="true">
      <span className={styles.srOnly}>Loading…</span>
      <div className={`${styles.bone} ${styles.boneHeader}`} />
      <div className={`${styles.bone} ${styles.boneTitle}`} />
      {cards > 0 && (
        <div
          className={styles.boneCards}
          style={cards === 2 ? { gridTemplateColumns: "1fr 1fr" } : undefined}
        >
          {Array.from({ length: cards }, (_, i) => (
            <div key={i} className={`${styles.bone} ${styles.boneCard}`} />
          ))}
        </div>
      )}
      <div className={styles.boneList}>
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className={styles.boneRow}>
            <div className={`${styles.bone} ${styles.boneThumb}`} />
            <div className={styles.boneLines}>
              <div className={`${styles.bone} ${styles.boneLine}`} />
              <div className={`${styles.bone} ${styles.boneLine} ${styles.boneShort}`} />
            </div>
            <div className={`${styles.bone} ${styles.boneAmount}`} />
          </div>
        ))}
      </div>
    </div>
  );
}
