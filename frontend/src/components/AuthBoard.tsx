"use client";

import { FormEvent, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BrandWordmark, ThemeToggle } from "@/components/Brand";

type Mode = "signin" | "signup" | "forgot";

function safeNext(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/dashboard";
  return value;
}

function field(form: FormData, name: string) {
  return String(form.get(name) || "").trim();
}

async function postAuth(url: string, body: Record<string, string>) {
  return fetch(url, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function AuthBoard() {
  const searchParams = useSearchParams();
  const next = safeNext(searchParams.get("next"));
  const [mode, setMode] = useState<Mode>("signin");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const title = useMemo(() => {
    if (mode === "signup") return "Create a Sustally account";
    if (mode === "forgot") return "Reset your password";
    return "Sign in to Sustally";
  }, [mode]);

  const showMode = (nextMode: Mode) => {
    setMode(nextMode);
    setError("");
    setNotice("");
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    const form = new FormData(event.currentTarget);

    try {
      if (mode === "signup") {
        const password = String(form.get("password") || "");
        const confirm = String(form.get("confirm") || "");
        if (password !== confirm) {
          setError("Passwords do not match.");
          return;
        }
        const response = await postAuth("/api/auth/signup", {
          firstName: field(form, "firstName"),
          lastName: field(form, "lastName"),
          email: field(form, "email"),
          phone: field(form, "phone"),
          password,
        });
        const payload = (await response.json()) as { error?: string };
        if (!response.ok) {
          setError(payload.error || "Could not create the account.");
          return;
        }
        window.location.assign(next);
        return;
      }

      if (mode === "forgot") {
        const response = await postAuth("/api/auth/forgot", { identifier: field(form, "identifier") });
        const payload = (await response.json()) as { error?: string; message?: string };
        if (!response.ok) {
          setError(payload.error || "Could not send the reset email.");
          return;
        }
        setNotice(payload.message || "If an account matches, a reset link is on the way.");
        return;
      }

      const response = await postAuth("/api/auth/signin", {
        identifier: field(form, "identifier"),
        password: String(form.get("password") || ""),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(payload.error || "Could not sign in.");
        return;
      }
      window.location.assign(next);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-split">
      <section className="relative flex flex-col px-8 py-6 md:px-14 md:py-8">
        <div className="flex items-center justify-between">
          <BrandWordmark className="brand-mark-login" />
          <ThemeToggle />
        </div>
        <form onSubmit={(event) => void submit(event)} className="mx-auto my-auto w-full max-w-[420px] py-10">
          <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[var(--brand-material)]">
            {mode === "signup" ? "Join" : mode === "forgot" ? "Account" : "Welcome"}
          </p>
          <h1 className="mt-2 text-[34px] font-semibold tracking-[-0.04em]">{title}</h1>
          <p className="mt-2 max-w-[42ch] text-[var(--muted)]">
            {mode === "signup"
              ? "First name, last name, email, phone, and a password. Sign in later with email or phone."
              : mode === "forgot"
                ? "Enter the email or phone on the account. We send a reset link to the email on file."
                : "Sign in with the email or phone and password from sign up."}
          </p>

          <div className="mt-6" />

          {error ? (
            <div className="form-alert" role="alert">
              <p>{error}</p>
            </div>
          ) : null}
          {notice ? (
            <div className="form-alert" data-tone="ok" role="status">
              <p>{notice}</p>
            </div>
          ) : null}

          {mode === "signup" ? (
            <>
              <div className="auth-name-row">
                <div className="field">
                  <label htmlFor="firstName">First name</label>
                  <input id="firstName" name="firstName" autoComplete="given-name" required />
                </div>
                <div className="field">
                  <label htmlFor="lastName">Last name</label>
                  <input id="lastName" name="lastName" autoComplete="family-name" required />
                </div>
              </div>
              <div className="field mt-4">
                <label htmlFor="email">Email</label>
                <input id="email" name="email" type="email" autoComplete="email" placeholder="e.g. jane.doe@company.com" required />
              </div>
              <div className="field mt-4">
                <label htmlFor="phone">Phone number</label>
                <input id="phone" name="phone" type="tel" autoComplete="tel" placeholder="e.g. +91 98765 43210" required />
              </div>
              <div className="field mt-4">
                <label htmlFor="password">Password</label>
                <input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
              </div>
              <div className="field mt-4">
                <label htmlFor="confirm">Confirm password</label>
                <input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={8} required />
              </div>
            </>
          ) : mode === "forgot" ? (
            <div className="field">
              <label htmlFor="identifier">Email or phone number</label>
              <input id="identifier" name="identifier" autoComplete="username" required />
            </div>
          ) : (
            <>
              <div className="field">
                <label htmlFor="identifier">Email or phone number</label>
                <input id="identifier" name="identifier" autoComplete="username" placeholder="Email or phone" required />
              </div>
              <div className="field mt-4">
                <label htmlFor="password">Password</label>
                <input id="password" name="password" type="password" autoComplete="current-password" required />
              </div>
            </>
          )}

          <button type="submit" className="btn btn-primary mt-6 w-full" disabled={busy}>
            {busy ? "Please wait…" : mode === "signup" ? "Create account" : mode === "forgot" ? "Send reset link" : "Sign in"}
          </button>

          {mode === "signin" ? (
            <>
              <p className="mt-4 text-center text-[13px] text-[var(--muted)]">
                <button type="button" className="auth-text-btn" onClick={() => showMode("forgot")}>
                  Forgot password?
                </button>
              </p>
              <p className="auth-switch-note">
                New user?{" "}
                <button type="button" className="auth-text-btn" onClick={() => showMode("signup")}>
                  Sign up
                </button>
              </p>
            </>
          ) : (
            <p className="mt-4 text-center text-[13px] text-[var(--muted)]">
              {mode === "signup" ? (
                <>
                  Already have an account?{" "}
                  <button type="button" className="auth-text-btn" onClick={() => showMode("signin")}>
                    Sign in
                  </button>
                </>
              ) : (
                <button type="button" className="auth-text-btn" onClick={() => showMode("signin")}>
                  Back to sign in
                </button>
              )}
            </p>
          )}
        </form>
      </section>
      <aside className="art-panel hidden items-end p-12 md:flex">
        <div className="relative z-10 max-w-[36ch]">
          <OrbitalArt />
          <p className="mt-10 text-[13px] font-semibold uppercase tracking-[0.18em] text-[#c19dff]">Measure today</p>
          <h2 className="mt-2 text-[40px] font-semibold leading-[1.1] tracking-[-0.04em]">A cleaner tomorrow.</h2>
          <p className="mt-3 text-[15px] text-[#d9d0f0]">
            Track your scope 3 emissions. Make informed decisions. Build a sustainable future.
          </p>
        </div>
      </aside>
    </div>
  );
}

function OrbitalArt() {
  return (
    <svg viewBox="0 0 320 220" className="h-[180px] w-[280px]" aria-hidden>
      <ellipse cx="170" cy="118" rx="110" ry="34" fill="none" stroke="#8E4DFF" strokeWidth="3" opacity="0.35" />
      <ellipse cx="170" cy="118" rx="110" ry="34" fill="none" stroke="#C19DFF" strokeWidth="2" transform="rotate(28 170 118)" />
      <ellipse cx="170" cy="118" rx="110" ry="34" fill="none" stroke="#7E57C2" strokeWidth="2" transform="rotate(-24 170 118)" opacity="0.8" />
      <circle cx="170" cy="118" r="42" fill="#8E4DFF" />
      <circle cx="170" cy="118" r="18" fill="#1E1E1E" />
      <circle cx="248" cy="92" r="7" fill="#C19DFF" />
      <circle cx="96" cy="140" r="5" fill="#7E57C2" />
    </svg>
  );
}
