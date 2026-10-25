import styles from "./page.module.css";

// Stewardify's mark: a two-leaf sprout growing up out of an open coin, drawn with
// thick round-ended strokes. Growth from the resources we're given.
// The same drawing is used for the browser-tab icon (app/icon.svg).
const COIN =
  "M26.4 34.4 C19.6 36.6 16.8 44 19.4 50.6 C22.2 57.4 30.8 60.4 37.6 57.6 " +
  "C44.6 54.6 47.8 46.6 45 39.8 C43.8 37 41.4 35 38.2 34.2";
const STEM = "M32.2 46.4 C31.4 40.2 33.2 31 32.5 17";
const LEAF_LEFT = "M32 27.6 C25 28.2 19.4 23.8 18.4 16.6 C25.6 16.4 30.8 20.6 32 27.6";
const LEAF_RIGHT = "M32.6 22 C40 22.6 46 17 47 8.6 C38.6 8.8 33.6 14 32.6 22";

const LINE = { fill: "none", strokeWidth: 4.4, strokeLinecap: "round", strokeLinejoin: "round" } as const;

// Evergreen on light backgrounds; white on the dark header band.
export function Logo({ size = 34, onDark = false }: { size?: number; onDark?: boolean }) {
  const color = onDark ? "#ffffff" : "var(--onboard-primary)";
  return (
    <span className={styles.logo} aria-hidden="true">
      <svg viewBox="0 0 64 64" width={size} height={size}>
        <path d={COIN} {...LINE} stroke={color} />
        <path d={STEM} {...LINE} stroke={color} />
        <path d={LEAF_LEFT} {...LINE} stroke={color} />
        <path d={LEAF_RIGHT} {...LINE} stroke="var(--onboard-accent)" />
      </svg>
    </span>
  );
}
