"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Spinner } from "../feedback";
import { Logo } from "../logo";
import { signIn, signUp } from "./actions";
import { Compare, ExpenseMockup, Reveal, TryIt } from "./landing";
import { MagneticButton, ScrollEffects, Spotlight, Typewriter } from "./landing-extras";
import { FeatureStrip, FinalCta, LogoStrip, QuoteScene, StackedSteps, StoryScene, TwoSides } from "./story";
import styles from "./auth.module.css";

// The sign-in and sign-up page (also the landing page): a welcome panel next to
// the form, then "How it works" and the features. Sign up also asks for a full name.
export function AuthForm({ mode }: { mode: "signin" | "signup" }) {
  const isSignUp = mode === "signup";
  const [state, formAction, pending] = useActionState(isSignUp ? signUp : signIn, null);

  return (
    <main className={styles.page}>
      <ScrollEffects />
      <Reveal className={styles.main}>
        <section className={styles.hero} data-tilt-area>
          <Spotlight />
          <div className={styles.brand}>
            <Logo />
            <span className={styles.brandName}>Stewardify</span>
          </div>
          <h1 className={styles.headline}>
            Simple, honest expense tracking <span className={styles.accent}>for ministries.</span>
          </h1>
          <Typewriter />
          <MagneticButton href={isSignUp ? "#auth-form" : "/signup"}>Get started</MagneticButton>
          <ExpenseMockup />
        </section>

        <form id="auth-form" action={formAction} className={styles.card}>
          <div className={styles.cardHeading}>
            <h2 className={styles.title}>{isSignUp ? "Create your account" : "Welcome back"}</h2>
            <p className={styles.subtitle}>
              {isSignUp ? "It only takes a moment." : "Sign in to continue to Stewardify."}
            </p>
          </div>

          {isSignUp && (
            <label className={styles.field}>
              Full name
              <input name="fullName" type="text" autoComplete="name" placeholder="Juan dela Cruz" required />
            </label>
          )}
          <label className={styles.field}>
            Email
            <input name="email" type="email" autoComplete="email" placeholder="you@example.com" required />
          </label>
          <label className={styles.field}>
            Password
            <input
              name="password"
              type="password"
              autoComplete={isSignUp ? "new-password" : "current-password"}
              placeholder={isSignUp ? "At least 6 characters" : "Your password"}
              minLength={6}
              required
            />
          </label>

          {state?.error && <p className={styles.error}>{state.error}</p>}
          {state?.message && <p className={styles.success}>{state.message}</p>}

          <button type="submit" className={styles.button} disabled={pending}>
            {pending ? (
                <>
                  <Spinner />
                  Please wait…
                </>
              ) : isSignUp ? (
                "Create account"
              ) : (
                "Sign in"
              )}
          </button>

          <p className={styles.switch}>
            {isSignUp ? (
              <>
                Already have an account? <Link href="/login">Sign in</Link>
              </>
            ) : (
              <>
                New here? <Link href="/signup">Create an account</Link>
              </>
            )}
          </p>
        </form>
      </Reveal>

      <StoryScene />
      <TwoSides />
      <StackedSteps />
      <TryIt />
      <FeatureStrip />
      <Compare />
      <QuoteScene />
      <LogoStrip />
      <FinalCta />

      <footer className={styles.footer}>Stewardify · Simple expense tracking for ministries</footer>
    </main>
  );
}
