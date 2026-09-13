"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "./ThemeProvider";
import { useCurrentUser } from "./CurrentUser";
import { IconAvatar, IconMoon, IconSun } from "./NavIcons";

export function BrandWordmark({ className = "" }: { className?: string }) {
  return (
    <span className="brand-wordmark" role="img" aria-label="Sustally">
      <img src="/brand/typemark-black.svg" alt="" className={`logo-light brand-mark ${className}`} />
      <img src="/brand/typemark-white.svg" alt="" className={`logo-dark brand-mark ${className}`} />
    </span>
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

export function UserChip() {
  const user = useCurrentUser();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

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
    await fetch("/api/auth/signout", { method: "POST", credentials: "include" });
    window.location.assign("/");
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
