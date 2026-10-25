"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signIn, signUp } from "./actions";
import styles from "./auth.module.css";

// The sign-in and sign-up form. Sign up also asks for a full name.
export function AuthForm({ mode }: { mode: "signin" | "signup" }) {
  const isSignUp = mode === "signup";
  const [state, formAction, pending] = useActionState(isSignUp ? signUp : signIn, null);

  return (
    <main className={styles.main}>
      <form action={formAction} className={styles.card}>
        <h1 className={styles.brand}>Stewardify</h1>
        <h2 className={styles.title}>{isSignUp ? "Create your account" : "Sign in"}</h2>

        {isSignUp && (
          <label className={styles.field}>
            Full name
            <input name="fullName" type="text" autoComplete="name" required />
          </label>
        )}
        <label className={styles.field}>
          Email
          <input name="email" type="email" autoComplete="email" required />
        </label>
        <label className={styles.field}>
          Password
          <input
            name="password"
            type="password"
            autoComplete={isSignUp ? "new-password" : "current-password"}
            minLength={6}
            required
          />
        </label>

        {state?.error && <p className={styles.error}>{state.error}</p>}
        {state?.message && <p className={styles.success}>{state.message}</p>}

        <button type="submit" className={styles.button} disabled={pending}>
          {pending ? "Please wait…" : isSignUp ? "Sign up" : "Sign in"}
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
    </main>
  );
}
