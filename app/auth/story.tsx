"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { MagneticButton } from "./landing-extras";
import styles from "./story.module.css";

function reducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// True once the element has scrolled into view (and stays true).
function useInView<T extends Element>(threshold = 0.2) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (!("IntersectionObserver" in window)) {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold }
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [threshold]);

  return [ref, inView] as const;
}

// Calls onProgress with how far the page has scrolled through a tall section,
// from 0 (its top reaches the top of the screen) to 1 (its bottom reaches the bottom).
function useScrollProgress(ref: React.RefObject<HTMLElement | null>, onProgress: (p: number) => void) {
  const callback = useRef(onProgress);
  callback.current = onProgress;

  useEffect(() => {
    let frame = 0;
    function update() {
      frame = 0;
      const element = ref.current;
      if (!element) return;
      const box = element.getBoundingClientRect();
      const distance = box.height - window.innerHeight;
      const p = distance > 0 ? Math.min(Math.max(-box.top / distance, 0), 1) : 0;
      callback.current(p);
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
  }, [ref]);
}

// ---------- 6. Headlines that reveal word by word ----------

export function RevealWords({ text, className = "" }: { text: string; className?: string }) {
  const [ref, inView] = useInView<HTMLHeadingElement>(0.4);
  const words = text.split(" ");

  return (
    <h2 ref={ref} className={`${styles.words} ${inView ? styles.wordsIn : ""} ${className}`} aria-label={text}>
      {words.map((word, i) => (
        <span key={i} className={styles.word} style={{ "--i": i } as CSSProperties} aria-hidden="true">
          {word}
        </span>
      ))}
    </h2>
  );
}

// ---------- Logo strip: "Imagine your ministry here" ----------

// Fictional organizations, each with a simple drawn mark. Shown muted,
// in full color on hover.
const LOGOS: { name: string; color: string; mark: ReactNode }[] = [
  {
    name: "Lighthouse Fellowship",
    color: "#255c4d",
    mark: <path d="M10 21h4l-1-12h-2l-1 12zM9 9h6M12 5v4M12 5 8 3M12 5l4-2M6 21h12" />,
  },
  {
    name: "Harvest Missions",
    color: "#1d6fb8",
    mark: <path d="M12 21V9M12 9c-3 0-5-2-5-5 3 0 5 2 5 5zm0 0c3 0 5-2 5-5-3 0-5 2-5 5zM12 15c-3 0-5-2-5-5 3 0 5 2 5 5zm0 0c3 0 5-2 5-5-3 0-5 2-5 5z" />,
  },
  {
    name: "Living Waters Church",
    color: "#2f7562",
    mark: <path d="M12 3c3 4 6 7 6 11a6 6 0 0 1-12 0c0-4 3-7 6-11zM9 15a3 3 0 0 0 3 3" />,
  },
  {
    name: "Mustard Seed Scholars",
    color: "#5c7a3e",
    mark: <path d="M12 21v-6M12 15c-4 0-6-3-6-7 4 0 6 3 6 7zm0 0c4 0 6-3 6-7-4 0-6 3-6 7zM9 21h6" />,
  },
  {
    name: "Cornerstone Youth",
    color: "#183129",
    mark: <path d="M4 20h16M6 20V10l6-6 6 6v10M10 20v-5h4v5" />,
  },
];

export function LogoStrip() {
  // The logos are shown twice so the strip can loop without a gap.
  return (
    <section className={styles.logoSection}>
      <RevealWords text="Imagine your ministry here" className={styles.sceneTitle} />
      <div className={styles.logoStrip}>
        <ul className={styles.srOnly}>
          {LOGOS.map((logo) => (
            <li key={logo.name}>{logo.name}</li>
          ))}
        </ul>
        <div className={styles.logoTrack} aria-hidden="true">
          {[...LOGOS, ...LOGOS].map((logo, i) => (
            <span key={i} className={styles.logo} style={{ "--brand": logo.color } as CSSProperties}>
              <svg
                viewBox="0 0 24 24"
                width="26"
                height="26"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={styles.logoMark}
              >
                {logo.mark}
              </svg>
              <span className={styles.logoName}>{logo.name}</span>
            </span>
          ))}
        </div>
      </div>
      <p className={styles.logoCaption}>Sample organizations for demonstration.</p>

      <ul className={styles.trust}>
        <li className={styles.trustBadge}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3zM9.5 12.5l1.8 1.8 3.2-3.6" />
          </svg>
          Role-based access
        </li>
        <li className={styles.trustBadge}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 12a9 9 0 1 0 3-6.7M3 4v4h4M12 8v4l3 2" />
          </svg>
          Full activity history
        </li>
        <li className={styles.trustBadge}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M6 11h12v10H6V11zM8.5 11V8a3.5 3.5 0 0 1 7 0v3M12 15v2" />
          </svg>
          Secure receipt storage
        </li>
      </ul>
    </section>
  );
}

// ---------- 2. Pinned story: one expense travels through 3 stages ----------

const STAGES = [
  {
    label: "Submitted",
    badge: "Pending",
    badgeClass: styles.pending,
    title: "It starts with a receipt",
    text: "A volunteer adds the date, the amount, and a photo of the receipt. It takes about a minute.",
  },
  {
    label: "Under review",
    badge: "In review",
    badgeClass: styles.review,
    title: "An approver takes a look",
    text: "It lands in the approval queue with the note and receipt, so nothing gets lost in a group chat.",
  },
  {
    label: "Approved",
    badge: "Approved",
    badgeClass: styles.approved,
    title: "Everyone sees it's done",
    text: "The decision is recorded with who and when. The volunteer knows right away.",
  },
];

export function StoryScene() {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState(0);
  const [pinned, setPinned] = useState(true);

  useEffect(() => {
    setPinned(!reducedMotion());
  }, []);

  useScrollProgress(sectionRef, (p) => {
    stageRef.current?.style.setProperty("--p", p.toFixed(3));
    setStage(Math.min(STAGES.length - 1, Math.floor(p * STAGES.length)));
  });

  // Reduced motion: no pinning; the three stages are simply listed.
  if (!pinned) {
    return (
      <section className={styles.storyStatic}>
        <RevealWords text="Follow one expense" className={styles.sceneTitle} />
        {STAGES.map((s) => (
          <div key={s.label} className={styles.storyStaticItem}>
            <span className={`${styles.storyBadge} ${s.badgeClass}`}>{s.badge}</span>
            <h3>{s.title}</h3>
            <p>{s.text}</p>
          </div>
        ))}
      </section>
    );
  }

  const current = STAGES[stage];

  return (
    <section ref={sectionRef} className={styles.story}>
      <div ref={stageRef} className={styles.storySticky}>
        <div className={styles.storyText}>
          <span className={styles.eyebrow}>Follow one expense</span>
          <div className={styles.storyTexts}>
            {STAGES.map((s, i) => (
              <div key={s.label} className={`${styles.storyStep} ${i === stage ? styles.storyStepOn : ""}`}>
                <h3 className={styles.storyTitle}>{s.title}</h3>
                <p className={styles.storyBody}>{s.text}</p>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.storyTrack}>
          <div className={styles.storyStations}>
            {STAGES.map((s, i) => (
              <span key={s.label} className={`${styles.station} ${i <= stage ? styles.stationOn : ""}`}>
                <span className={styles.stationDot} />
                {s.label}
              </span>
            ))}
          </div>
          <div className={styles.storyLine}>
            <span className={styles.storyLineFill} />
          </div>
          <div className={styles.travel}>
            <div className={styles.storyCard} aria-hidden="true">
              <div className={styles.storyCardTop}>
                <span className={styles.storyThumb} />
                <span className={styles.storyCardText}>
                  <strong>Fare for home visits</strong>
                  <small>Transportation · ₱350.00</small>
                </span>
              </div>
              <span key={current.badge} className={`${styles.storyBadge} ${current.badgeClass}`}>
                {current.badge}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------- 3. Two sides: submitters and approvers ----------

const SIDES = [
  {
    who: "For submitters",
    title: "Send it in, then get on with ministry",
    points: ["Snap the receipt", "See when it's approved", "Fix and resubmit if needed"],
    from: styles.fromLeft,
    tone: styles.sideLight,
  },
  {
    who: "For approvers",
    title: "Everything you need to decide",
    points: ["One queue for everything", "Notes and receipts side by side", "A clear record of every decision"],
    from: styles.fromRight,
    tone: styles.sideDark,
  },
];

export function TwoSides() {
  const [ref, inView] = useInView<HTMLDivElement>(0.25);

  return (
    <section className={styles.scene}>
      <RevealWords text="Made for both sides of the table" className={styles.sceneTitle} />
      <div ref={ref} className={`${styles.sides} ${inView ? styles.sidesIn : ""}`}>
        {SIDES.map((side) => (
          <div key={side.who} className={`${styles.side} ${side.from} ${side.tone}`}>
            <span className={styles.sideWho}>{side.who}</span>
            <h3 className={styles.sideTitle}>{side.title}</h3>
            <ul className={styles.sidePoints}>
              {side.points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

// ---------- 5. Stacked card deck: how it works ----------

const STEPS = [
  { title: "Submit", text: "Add the date, amount, category, and a photo of the receipt." },
  { title: "Review", text: "An approver approves it, or rejects it with a short note on what to fix." },
  { title: "Resolve", text: "Approved expenses are settled; rejected ones can be fixed and sent back." },
  { title: "Remember", text: "Every step is kept in the activity timeline, for full transparency." },
];

export function StackedSteps() {
  return (
    <section className={styles.scene}>
      <RevealWords text="How it works" className={styles.sceneTitle} />
      <ol className={styles.deck}>
        {STEPS.map((step, i) => (
          <li key={step.title} className={styles.deckCard} style={{ "--i": i } as CSSProperties}>
            <span className={styles.deckNumber}>{i + 1}</span>
            <div>
              <h3 className={styles.deckTitle}>{step.title}</h3>
              <p className={styles.deckText}>{step.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

// ---------- 4. Horizontal strip of feature cards ----------

const ICONS: Record<string, ReactNode> = {
  receipt: <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3zM9 8h6M9 12h6M9 16h3" />,
  check: <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM8 12.5l2.5 2.5L16 9.5" />,
  clock: <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2" />,
  shield: <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3zM9 12l2 2 4-4" />,
  redo: <path d="M4 12a8 8 0 0 1 14-5.3M20 4v5h-5M20 12a8 8 0 0 1-14 5.3M4 20v-5h5" />,
  tag: <path d="M3 12V4h8l10 10-8 8L3 12zM7.5 7.5h.01" />,
};

const FEATURES = [
  { icon: "receipt", title: "Receipt photos", text: "Drag in a photo. It stays private to the people who need it." },
  { icon: "check", title: "One-click approvals", text: "Approve or reject from one queue, with notes and receipts." },
  { icon: "redo", title: "Fix & resubmit", text: "Rejected? Make the fix and send it back in a few taps." },
  { icon: "clock", title: "Activity timeline", text: "Every decision and change is logged with who and when." },
  { icon: "tag", title: "13 categories", text: "From transportation to honorariums, with “Other” for the rest." },
  { icon: "shield", title: "Safe by design", text: "People only see what they should, enforced by the database." },
];

export function FeatureStrip() {
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [scrollDriven, setScrollDriven] = useState(false);

  // On computers, the strip moves sideways as you scroll down.
  // On phones (and with reduced motion) it's a normal swipeable row.
  useEffect(() => {
    const query = window.matchMedia("(min-width: 761px)");
    const decide = () => setScrollDriven(query.matches && !reducedMotion());
    decide();
    query.addEventListener("change", decide);
    return () => query.removeEventListener("change", decide);
  }, []);

  // Make the section tall enough to scroll the whole strip past.
  useEffect(() => {
    const section = sectionRef.current;
    const track = trackRef.current;
    if (!section || !track) return;
    if (!scrollDriven) {
      section.style.height = "";
      return;
    }
    function size() {
      const extra = track!.scrollWidth - track!.parentElement!.clientWidth;
      section!.style.height = `${window.innerHeight + Math.max(extra, 0)}px`;
    }
    size();
    window.addEventListener("resize", size);
    return () => window.removeEventListener("resize", size);
  }, [scrollDriven]);

  useScrollProgress(sectionRef, (p) => {
    const track = trackRef.current;
    if (!track || !scrollDriven) return;
    const extra = track.scrollWidth - track.parentElement!.clientWidth;
    track.style.transform = `translateX(${(-p * Math.max(extra, 0)).toFixed(1)}px)`;
  });

  return (
    <section ref={sectionRef} className={`${styles.strip} ${scrollDriven ? styles.stripPinned : ""}`}>
      <div className={styles.stripSticky}>
        <RevealWords text="Everything in one place" className={styles.sceneTitle} />
        <div className={styles.stripWindow}>
          <div
            ref={trackRef}
            className={styles.stripTrack}
            style={scrollDriven ? undefined : { transform: "none" }}
          >
            {FEATURES.map((feature) => (
              <div key={feature.title} className={styles.stripCard}>
                <span className={styles.stripIcon}>
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
                <h3 className={styles.stripTitle}>{feature.title}</h3>
                <p className={styles.stripText}>{feature.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------- 7. Full-width scripture quote with a slowly zooming background ----------

export function QuoteScene() {
  return (
    <section className={styles.quote}>
      <div className={styles.quoteBackground} aria-hidden="true" />
      <figure className={styles.quoteInner}>
        <blockquote className={styles.quoteText}>
          “Now it is required that those who have been given a trust must prove faithful.”
        </blockquote>
        <figcaption className={styles.quoteSource}>1 Corinthians 4:2</figcaption>
      </figure>
    </section>
  );
}

// ---------- Final call to action ----------

export function FinalCta() {
  return (
    <section className={styles.cta}>
      <RevealWords text="Ready to steward well?" className={styles.ctaTitle} />
      <p className={styles.ctaText}>Set up your ministry&apos;s expense approvals in minutes.</p>
      <MagneticButton href="/signup">Try it now</MagneticButton>
    </section>
  );
}
