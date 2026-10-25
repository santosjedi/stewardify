"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { BeforeAfter, ParallaxShape, shapeStyles, TryItDemo } from "./landing-extras";
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

const STEPS = [
  { title: "Submit", text: "Add the date, amount, and a photo of the receipt." },
  { title: "Review", text: "An approver checks it and approves or asks for a fix." },
  { title: "Done", text: "Everyone can see where each expense stands." },
];

export function HowItWorks() {
  return (
    <Reveal className={styles.section}>
      <ParallaxShape className={`${shapeStyles.blue} ${shapeStyles.right}`} speed={0.12} />
      <h2 className={styles.sectionTitle}>How it works</h2>
      <ol className={styles.steps}>
        {STEPS.map((step, index) => (
          <li key={step.title} className={styles.step}>
            <span className={styles.stepNumber}>{index + 1}</span>
            <h3 className={styles.stepTitle}>{step.title}</h3>
            <p className={styles.stepText}>{step.text}</p>
          </li>
        ))}
      </ol>
    </Reveal>
  );
}

// Simple line icons, drawn in the brand blue.
const ICONS: Record<string, ReactNode> = {
  receipt: (
    <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3zM9 8h6M9 12h6M9 16h3" />
  ),
  check: <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM8 12.5l2.5 2.5L16 9.5" />,
  clock: <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2" />,
  shield: <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3zM9 12l2 2 4-4" />,
};

const FEATURES = [
  { icon: "receipt", title: "Receipt photos", text: "Snap a receipt and attach it. Photos stay private." },
  { icon: "check", title: "One-click approvals", text: "Approvers see everything waiting, with notes and receipts." },
  { icon: "clock", title: "Clear activity", text: "Every decision and change is logged with who and when." },
  { icon: "shield", title: "Safe by design", text: "People only see what they should, enforced by the database." },
];

export function Features() {
  return (
    <Reveal className={styles.section}>
      <ParallaxShape className={`${shapeStyles.gold} ${shapeStyles.right}`} speed={0.15} />
      <h2 className={styles.sectionTitle}>Made for ministry teams</h2>
      <div className={styles.features}>
        {FEATURES.map((feature) => (
          <div key={feature.title} className={styles.feature}>
            <span className={styles.featureIcon}>
              <svg
                viewBox="0 0 24 24"
                width="22"
                height="22"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                {ICONS[feature.icon]}
              </svg>
            </span>
            <h3 className={styles.featureTitle}>{feature.title}</h3>
            <p className={styles.featureText}>{feature.text}</p>
          </div>
        ))}
      </div>
    </Reveal>
  );
}

export function TryIt() {
  return (
    <Reveal className={styles.section}>
      <ParallaxShape className={`${shapeStyles.gold} ${shapeStyles.left}`} speed={0.18} />
      <h2 className={styles.sectionTitle}>Try it yourself</h2>
      <p className={styles.sectionLead}>Be the approver for a moment.</p>
      <TryItDemo />
    </Reveal>
  );
}

export function Compare() {
  return (
    <Reveal className={styles.section}>
      <ParallaxShape className={`${shapeStyles.blue} ${shapeStyles.left}`} speed={0.12} />
      <h2 className={styles.sectionTitle}>See the difference</h2>
      <p className={styles.sectionLead}>Drag the handle to compare.</p>
      <BeforeAfter />
    </Reveal>
  );
}
