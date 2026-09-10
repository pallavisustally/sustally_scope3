"use client";

import { useRouter } from "next/navigation";
import { FormEvent } from "react";
import { BrandWordmark, ThemeToggle } from "@/components/Brand";

export default function LoginPage() {
  const router = useRouter();

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    router.push("/dashboard");
  };

  return (
    <div className="login-split">
      <section className="relative flex flex-col px-8 py-6 md:px-14 md:py-8">
        <div className="flex items-center justify-between">
          <BrandWordmark className="brand-mark-login" />
          <ThemeToggle />
        </div>
        <form onSubmit={onSubmit} className="mx-auto my-auto w-full max-w-[420px] py-10">
          <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[var(--brand-material)]">Welcome</p>
          <h1 className="mt-2 text-[34px] font-semibold tracking-[-0.04em]">Sign in to Sustally</h1>
          <p className="mt-2 max-w-[40ch] text-[var(--muted)]">
            Measure. Manage. Report your value chain emissions under the GHG Protocol Scope 3 Standard.
          </p>
          <div className="mt-8 flex flex-col gap-4">
            <div className="field">
              <label htmlFor="email">Email address</label>
              <input id="email" type="email" defaultValue="jane.doe@company.com" autoComplete="email" />
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <input id="password" type="password" defaultValue="••••••••" autoComplete="current-password" />
            </div>
            <button type="submit" className="btn btn-primary w-full">
              Sign in
            </button>
            <p className="text-center text-[13px] text-[var(--muted)]">or continue with</p>
            <button type="button" className="btn btn-ghost w-full" disabled>
              Sign in with Google
            </button>
            <p className="text-center text-[13px] text-[var(--muted)]">
              Don&apos;t have an account? <span className="text-[var(--brand)]">Request access</span>
            </p>
          </div>
        </form>
        <p className="text-[12px] text-[var(--muted)]">A basic visual shell. No authentication or calculations yet.</p>
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
