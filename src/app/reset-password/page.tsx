"use client";

import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BrandWordmark, ThemeToggle } from "@/components/Brand";

function ResetForm() {
  const router = useRouter();
  const token = useSearchParams().get("token") || "";
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(token ? "" : "This reset link is missing a token.");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") || "");
    const confirm = String(form.get("confirm") || "");
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(payload.error || "Could not reset the password.");
        return;
      }
      router.push("/dashboard");
      router.refresh();
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
          <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[var(--brand-material)]">Account</p>
          <h1 className="mt-2 text-[34px] font-semibold tracking-[-0.04em]">Choose a new password</h1>
          <p className="mt-2 max-w-[42ch] text-[var(--muted)]">Use at least 8 characters. You will be signed in after it saves.</p>
          {error ? (
            <div className="form-alert mt-6" role="alert">
              <p>{error}</p>
            </div>
          ) : null}
          <div className="field mt-6">
            <label htmlFor="password">New password</label>
            <input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required disabled={!token} />
          </div>
          <div className="field mt-4">
            <label htmlFor="confirm">Confirm password</label>
            <input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={8} required disabled={!token} />
          </div>
          <button type="submit" className="btn btn-primary mt-6 w-full" disabled={busy || !token}>
            {busy ? "Saving…" : "Save password"}
          </button>
        </form>
      </section>
      <aside className="art-panel hidden md:block" />
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetForm />
    </Suspense>
  );
}
