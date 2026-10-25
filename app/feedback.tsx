"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { pesos } from "@/lib/format";
import styles from "./feedback.module.css";

type Origin = { x: number; y: number };
type ToastEvent = { message: string; confetti?: Origin };

const EVENT = "stewardify:toast";
const QUEUE_KEY = "stewardify:queued-toast";

function reducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// Show a toast message now (and optionally a confetti burst from a point on screen).
export function notify(message: string, confetti?: Origin) {
  window.dispatchEvent(new CustomEvent<ToastEvent>(EVENT, { detail: { message, confetti } }));
}

// For saves that move to another page: remember the message, and show it on the
// page we land on (see ShowQueuedToast). Cleared again if the save fails.
export function queueToast(message: string) {
  try {
    sessionStorage.setItem(QUEUE_KEY, message);
  } catch {}
}

export function clearQueuedToast() {
  try {
    sessionStorage.removeItem(QUEUE_KEY);
  } catch {}
}

// Put on the page people land on after a save; shows the remembered message once.
export function ShowQueuedToast() {
  useEffect(() => {
    let message: string | null = null;
    try {
      message = sessionStorage.getItem(QUEUE_KEY);
      sessionStorage.removeItem(QUEUE_KEY);
    } catch {}
    if (message) notify(message);
  }, []);
  return null;
}

const CONFETTI_COLORS = ["#fcc715", "#2483c5", "#16303d", "#f4923d", "#166534"];

type Toast = { id: number; message: string };
type Burst = { id: number; origin: Origin; pieces: CSSProperties[] };

function makePieces(): CSSProperties[] {
  return Array.from({ length: 26 }, (_, i) => {
    const angle = (Math.PI * 2 * i) / 26 + Math.random() * 0.4;
    const distance = 60 + Math.random() * 70;
    return {
      "--dx": `${Math.cos(angle) * distance}px`,
      "--dy": `${Math.sin(angle) * distance - 40}px`,
      "--spin": `${Math.random() * 540 - 270}deg`,
      "--delay": `${Math.random() * 80}ms`,
      background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    } as CSSProperties;
  });
}

// Lives in the root layout, so messages survive moving between pages.
export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [bursts, setBursts] = useState<Burst[]>([]);
  const nextId = useRef(1);

  useEffect(() => {
    function onToast(event: Event) {
      const { message, confetti } = (event as CustomEvent<ToastEvent>).detail;
      const id = nextId.current++;
      setToasts((list) => [...list, { id, message }]);
      setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 3200);

      if (confetti && !reducedMotion()) {
        setBursts((list) => [...list, { id, origin: confetti, pieces: makePieces() }]);
        setTimeout(() => setBursts((list) => list.filter((b) => b.id !== id)), 1400);
      }
    }
    window.addEventListener(EVENT, onToast);
    return () => window.removeEventListener(EVENT, onToast);
  }, []);

  return (
    <>
      <div className={styles.toasts} role="status" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={styles.toast}>
            <span className={styles.toastIcon} aria-hidden="true">
              ✓
            </span>
            {toast.message}
          </div>
        ))}
      </div>
      {bursts.map((burst) => (
        <div
          key={burst.id}
          className={styles.burst}
          style={{ left: burst.origin.x, top: burst.origin.y }}
          aria-hidden="true"
        >
          {burst.pieces.map((piece, i) => (
            <span key={i} className={styles.piece} style={piece} />
          ))}
        </div>
      ))}
    </>
  );
}

// The middle of an element on screen, for starting a confetti burst there.
export function centerOf(element: Element | null): Origin | undefined {
  if (!element) return undefined;
  const box = element.getBoundingClientRect();
  return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
}

// A stat number that counts up from 0 when the page loads.
export function CountUp({ value, format }: { value: number; format: "pesos" | "number" }) {
  const [shown, setShown] = useState(value);

  useEffect(() => {
    if (reducedMotion() || value === 0) {
      setShown(value);
      return;
    }
    const duration = 900;
    const start = performance.now();
    let frame = 0;
    function step(now: number) {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(value * eased);
      if (t < 1) frame = requestAnimationFrame(step);
    }
    setShown(0);
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return <>{format === "pesos" ? pesos.format(shown) : Math.round(shown)}</>;
}

// A status badge that pops softly when its status changes.
export function StatusBadge({ status, className }: { status: string; className: string }) {
  const previous = useRef(status);
  const [changes, setChanges] = useState(0);

  useEffect(() => {
    if (previous.current !== status) {
      previous.current = status;
      setChanges((n) => n + 1);
    }
  }, [status]);

  return (
    <span key={changes} className={`${className} ${changes > 0 ? styles.badgeChanged : ""}`}>
      {status}
    </span>
  );
}

// A small spinning circle for buttons while they save.
export function Spinner() {
  return <span className={styles.spinner} aria-hidden="true" />;
}
