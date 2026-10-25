"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { BeforeAfter, ParallaxShape, shapeStyles, TryItDemo } from "./landing-extras";
import { RevealWords } from "./story";
import styles from "./auth.module.css";

// Fades and slides its content in the first time it scrolls into view.
export function Reveal({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (!("IntersectionObserver" in window)) {
      setShown(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={`${styles.reveal} ${shown ? styles.revealed : ""} ${className}`}>
      {children}
    </div>
  );
}

// A sample expense card in the hero. It floats, tilts toward the mouse
// (on computers, not phones), and its badge switches Pending → Approved.
export function ExpenseMockup() {
  const ref = useRef<HTMLDivElement>(null);
  const [approved, setApproved] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setApproved((a) => !a), 3000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const card = ref.current;
    const area = card?.closest<HTMLElement>("[data-tilt-area]");
    if (!card || !area) return;
    const canTilt = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!canTilt || reduceMotion) return;

    let frame = 0;
    function move(event: PointerEvent) {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const box = area!.getBoundingClientRect();
        const x = (event.clientX - box.left) / box.width - 0.5;
        const y = (event.clientY - box.top) / box.height - 0.5;
        card!.style.setProperty("--tilt-x", `${(-y * 8).toFixed(2)}deg`);
        card!.style.setProperty("--tilt-y", `${(x * 10).toFixed(2)}deg`);
      });
    }
    function leave() {
      cancelAnimationFrame(frame);
      card!.style.setProperty("--tilt-x", "0deg");
      card!.style.setProperty("--tilt-y", "0deg");
    }

    area.addEventListener("pointermove", move);
    area.addEventListener("pointerleave", leave);
    return () => {
      cancelAnimationFrame(frame);
      area.removeEventListener("pointermove", move);
      area.removeEventListener("pointerleave", leave);
    };
  }, []);

  return (
    <div className={styles.mockFloat} aria-hidden="true">
      <div ref={ref} className={styles.mock}>
        <div className={styles.mockTop}>
          <span className={styles.mockThumb} />
          <div className={styles.mockText}>
            <span className={styles.mockTitle}>Fare for home visits</span>
            <span className={styles.mockMeta}>Transportation · Oct 25</span>
          </div>
          <div className={styles.mockRight}>
            <span className={styles.mockAmount}>₱350.00</span>
            <span
              key={approved ? "approved" : "pending"}
              className={`${styles.mockBadge} ${approved ? styles.mockApproved : styles.mockPending}`}
            >
              {approved ? "Approved" : "Pending"}
            </span>
          </div>
        </div>
        <div className={styles.mockFooter}>
          <span className={styles.mockAvatar}>MR</span>
          <span>{approved ? "Approved by Finance Admin" : "Waiting for review"}</span>
        </div>
      </div>
    </div>
  );
}

export function TryIt() {
  return (
    <Reveal className={styles.section}>
      <ParallaxShape className={`${shapeStyles.gold} ${shapeStyles.left}`} speed={0.18} />
      <RevealWords text="Try it yourself" className={styles.sectionTitle} />
      <p className={styles.sectionLead}>Be the approver for a moment.</p>
      <TryItDemo />
    </Reveal>
  );
}

export function Compare() {
  return (
    <Reveal className={styles.section}>
      <ParallaxShape className={`${shapeStyles.blue} ${shapeStyles.left}`} speed={0.12} />
      <RevealWords text="See the difference" className={styles.sectionTitle} />
      <p className={styles.sectionLead}>Drag the handle to compare.</p>
      <BeforeAfter />
    </Reveal>
  );
}
