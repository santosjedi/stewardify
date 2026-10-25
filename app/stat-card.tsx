import { CountUp } from "./feedback";
import { Icon } from "./icons";
import styles from "./page.module.css";

type Tone = "total" | "pending" | "approved" | "rejected" | "reimbursed";

const TONE_CLASS: Record<Tone, string> = {
  total: styles.toneTotal,
  pending: styles.tonePending,
  approved: styles.toneApproved,
  rejected: styles.toneRejected,
  reimbursed: styles.toneReimbursed,
};

// A tiny trend line for the last few weeks.
function Sparkline({ values }: { values: number[] }) {
  const width = 100;
  const height = 28;
  const max = Math.max(...values, 1);
  const step = width / Math.max(values.length - 1, 1);
  const points = values.map((v, i) => `${(i * step).toFixed(1)},${(height - 3 - (v / max) * (height - 6)).toFixed(1)}`);

  return (
    <svg
      className={styles.sparkline}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <polyline points={`0,${height} ${points.join(" ")} ${width},${height}`} className={styles.sparkFill} />
      <polyline points={points.join(" ")} className={styles.sparkLine} />
    </svg>
  );
}

// A colorful stat card: icon, label, a number that counts up, and a trend line.
export function StatCard({
  label,
  value,
  format,
  tone,
  icon,
  series,
}: {
  label: string;
  value: number;
  format: "pesos" | "number";
  tone: Tone;
  icon: string;
  series: number[];
}) {
  return (
    <div className={`${styles.card} ${TONE_CLASS[tone]}`}>
      <div className={styles.cardTop}>
        <span className={styles.cardIcon}>
          <Icon name={icon} size={18} />
        </span>
        <span className={styles.cardLabel}>{label}</span>
      </div>
      <span className={styles.cardValue}>
        <CountUp value={value} format={format} />
      </span>
      <Sparkline values={series} />
    </div>
  );
}
