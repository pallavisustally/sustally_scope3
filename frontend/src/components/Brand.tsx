"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "./ThemeProvider";
import { IconAvatar, IconMoon, IconSun } from "./NavIcons";

export function BrandWordmark({ className = "" }: { className?: string }) {
  return (
    <>
      <img src="/brand/typemark-black.svg" alt="Sustally" className={`logo-light brand-mark ${className}`} />
      <img src="/brand/typemark-white.svg" alt="Sustally" className={`logo-dark brand-mark ${className}`} />
    </>
  );
}

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button type="button" className="icon-chip" onClick={toggle} aria-label="Toggle color theme">
      {theme === "dark" ? <IconMoon /> : <IconSun />}
    </button>
  );
}

type Me = { firstName: string; lastName: string; email: string };

export function UserChip() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<Me | null>(null);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((response) => response.json() as Promise<{ user?: Me | null }>)
      .then((payload) => setUser(payload.user ?? null))
      .catch(() => setUser(null));
  }, []);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const initials = user ? `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.toUpperCase() : "";

  const signOut = async () => {
    await fetch("/api/auth/signout", { method: "POST" });
    router.push("/");
    router.refresh();
  };

  return (
    <div className="account-wrap" ref={root}>
      <button
        type="button"
        className="icon-chip"
        aria-label={user ? `${user.firstName} ${user.lastName}` : "Account"}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {initials || <IconAvatar />}
      </button>
      {open ? (
        <div className="account-panel" role="dialog" aria-label="Account">
          {user ? (
            <>
              <p>
                {user.firstName} {user.lastName}
                <span>{user.email}</span>
              </p>
              <button type="button" onClick={() => void signOut()}>
                Sign out
              </button>
            </>
          ) : (
            <p>
              Account
              <span>Sign in to see your profile.</span>
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
