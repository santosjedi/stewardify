"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import styles from "./landing-extras.module.css";

function reducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// Mouse-only effects are skipped on touch screens and for reduced-motion users.
function mouseEffectsAllowed() {
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches && !reducedMotion();
}

// ---------- 1. Cursor spotlight ----------

// A soft glow that follows the mouse across its parent (the hero panel).
export function Spotlight() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const glow = ref.current;
    const area = glow?.parentElement;
    if (!glow || !area || !mouseEffectsAllowed()) return;

    let frame = 0;
    function move(event: PointerEvent) {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const box = area!.getBoundingClientRect();
        glow!.style.setProperty("--spot-x", `${event.clientX - box.left}px`);
        glow!.style.setProperty("--spot-y", `${event.clientY - box.top}px`);
        glow!.classList.add(styles.spotlightOn);
      });
    }
    function leave() {
      cancelAnimationFrame(frame);
      glow!.classList.remove(styles.spotlightOn);
    }

    area.addEventListener("pointermove", move);
    area.addEventListener("pointerleave", leave);
    return () => {
      cancelAnimationFrame(frame);
      area.removeEventListener("pointermove", move);
      area.removeEventListener("pointerleave", leave);
    };
  }, []);

  return <div ref={ref} className={styles.spotlight} aria-hidden="true" />;
}

// ---------- 2. Typewriter subheading ----------

const PHRASES = ["for church treasurers", "for ministry volunteers", "for missions teams"];

export function Typewriter() {
  const [index, setIndex] = useState(0);
  const [length, setLength] = useState(PHRASES[0].length);
  const [deleting, setDeleting] = useState(false);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    setAnimate(!reducedMotion());
  }, []);

  useEffect(() => {
    const phrase = PHRASES[index];

    // Reduced motion: no typing, just switch the whole phrase every few seconds.
    if (!animate) {
      const timer = setTimeout(() => {
        const next = (index + 1) % PHRASES.length;
        setIndex(next);
        setLength(PHRASES[next].length);
      }, 3000);
      return () => clearTimeout(timer);
    }

    let delay = deleting ? 35 : 70;
    if (!deleting && length === phrase.length) delay = 1800;
    if (deleting && length === 0) delay = 300;

    const timer = setTimeout(() => {
      if (!deleting && length === phrase.length) {
        setDeleting(true);
      } else if (deleting && length === 0) {
        setDeleting(false);
        setIndex((index + 1) % PHRASES.length);
      } else {
        setLength(length + (deleting ? -1 : 1));
      }
    }, delay);
    return () => clearTimeout(timer);
  }, [index, length, deleting, animate]);

  return (
    <p className={styles.typewriter}>
      <span className={styles.srOnly}>
        Built for church treasurers, ministry volunteers, and missions teams.
      </span>
      <span aria-hidden="true">
        Built <span className={styles.typed}>{PHRASES[index].slice(0, length)}</span>
        {animate && <span className={styles.caret} />}
      </span>
    </p>
  );
}

// ---------- 4. Magnetic "Get started" button ----------

// Pulls a little toward the mouse when it comes near.
export function MagneticButton({ href, children }: { href: string; children: ReactNode }) {
  const ref = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const button = ref.current;
    if (!button || !mouseEffectsAllowed()) return;

    let frame = 0;
    function move(event: PointerEvent) {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const box = button!.getBoundingClientRect();
        const dx = event.clientX - (box.left + box.width / 2);
        const dy = event.clientY - (box.top + box.height / 2);
        const near = Math.hypot(dx, dy) < 110;
        button!.style.setProperty("--pull-x", near ? `${dx * 0.25}px` : "0px");
        button!.style.setProperty("--pull-y", near ? `${dy * 0.3}px` : "0px");
      });
    }

    window.addEventListener("pointermove", move);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", move);
    };
  }, []);

  return (
    <Link ref={ref} href={href} className={styles.magnetic}>
      {children}
    </Link>
  );
}

// ---------- 3. Try-it demo ----------

type DemoStatus = "pending" | "approved" | "rejected";

// A pretend expense card: click Approve or Reject to see what happens.
// Nothing here is saved anywhere.
export function TryItDemo() {
  const [status, setStatus] = useState<DemoStatus>("pending");

  return (
    <div className={styles.demo}>
      <div className={styles.demoCard}>
        <div className={styles.demoTop}>
          <div className={styles.demoText}>
            <span className={styles.demoTitle}>Snacks for youth fellowship</span>
            <span className={styles.demoMeta}>Meals &amp; Food · Submitted by Ana</span>
          </div>
          <div className={styles.demoRight}>
            <span className={styles.demoAmount}>₱1,250.00</span>
            <span key={status} className={`${styles.demoBadge} ${styles[`demo_${status}`]}`}>
              {status === "pending" ? "Pending" : status === "approved" ? "Approved" : "Rejected"}
            </span>
          </div>
        </div>

        <div className={styles.demoButtons}>
          {status === "pending" ? (
            <>
              <button type="button" className={styles.demoReject} onClick={() => setStatus("rejected")}>
                Reject
              </button>
              <button type="button" className={styles.demoApprove} onClick={() => setStatus("approved")}>
                Approve
              </button>
            </>
          ) : (
            <button type="button" className={styles.demoReset} onClick={() => setStatus("pending")}>
              Try again
            </button>
          )}
        </div>
      </div>
      <p className={styles.demoNote}>Just a demo. Nothing is saved.</p>
    </div>
  );
}

// ---------- 5. Before/after slider ----------

export function BeforeAfter() {
  const [position, setPosition] = useState(50);

  return (
    <div className={styles.compare} style={{ "--pos": `${position}%` } as CSSProperties}>
      {/* With Stewardify (underneath) */}
      <div className={styles.after} aria-hidden="true">
        <span className={`${styles.compareLabel} ${styles.labelRight}`}>With Stewardify</span>
        <div className={styles.dash}>
          <div className={styles.dashStats}>
            <span>
              <small>Pending</small>₱1,600
            </span>
            <span>
              <small>Approved</small>₱8,450
            </span>
          </div>
          {[
            ["Fare for home visits", "Approved", styles.dashApproved],
            ["Printing for Sunday bulletin", "Pending", styles.dashPending],
            ["Venue for youth camp", "Approved", styles.dashApproved],
          ].map(([title, badge, badgeClass]) => (
            <div key={title} className={styles.dashRow}>
              <span className={styles.dashThumb} />
              <span className={styles.dashTitle}>{title}</span>
              <span className={`${styles.dashBadge} ${badgeClass}`}>{badge}</span>
            </div>
          ))}
        </div>
      </div>

      {/* The old way (on top, cut off at the slider) */}
      <div className={styles.before} aria-hidden="true">
        <span className={styles.compareLabel}>The old way</span>
        <div className={styles.mess}>
          <span className={`${styles.receipt} ${styles.r1}`}>OR #0231 ₱350?</span>
          <span className={`${styles.receipt} ${styles.r2}`}>lost receipt 😩</span>
          <span className={`${styles.receipt} ${styles.r3}`}>₱1,2__ (faded)</span>
          <div className={styles.chat}>
            <span className={styles.bubble}>Did you get my receipt?</span>
            <span className={`${styles.bubble} ${styles.bubbleMe}`}>Which one? 🤔</span>
            <span className={styles.bubble}>Sent it in the GC last week</span>
            <span className={`${styles.bubble} ${styles.bubbleMe}`}>Who approved this?</span>
          </div>
        </div>
      </div>

      <div className={styles.handle} aria-hidden="true">
        <span className={styles.handleKnob}>⇆</span>
      </div>

      <input
        type="range"
        min={0}
        max={100}
        value={position}
        onChange={(event) => setPosition(Number(event.target.value))}
        className={styles.compareRange}
        aria-label="Slide to compare the old way with Stewardify"
      />
    </div>
  );
}

// ---------- 6 & 8. Parallax shapes and the scroll-progress bar ----------

// A soft decorative shape that scrolls a little slower than the page.
export function ParallaxShape({ className, speed = 0.15 }: { className: string; speed?: number }) {
  return (
    <span
      className={`${styles.shape} ${className}`}
      data-parallax={speed}
      aria-hidden="true"
    />
  );
}

export const shapeStyles = {
  gold: styles.shapeGold,
  blue: styles.shapeBlue,
  left: styles.shapeLeft,
  right: styles.shapeRight,
};

// The gold progress bar at the top, plus moving the parallax shapes.
// One scroll listener does both, at most once per frame.
export function ScrollEffects() {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const bar = barRef.current;
    const shapes = Array.from(document.querySelectorAll<HTMLElement>("[data-parallax]"));
    const moveShapes = !reducedMotion();

    let frame = 0;
    function update() {
      frame = 0;
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const progress = scrollable > 0 ? window.scrollY / scrollable : 0;
      bar?.style.setProperty("--progress", progress.toFixed(4));

      if (moveShapes) {
        for (const shape of shapes) {
          const speed = Number(shape.dataset.parallax);
          const box = shape.parentElement!.getBoundingClientRect();
          shape.style.setProperty("--parallax", `${(box.top * -speed).toFixed(1)}px`);
        }
      }
    }
    function onScroll() {
      if (!frame) frame = requestAnimationFrame(update);
    }

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return <div ref={barRef} className={styles.progress} aria-hidden="true" />;
}
