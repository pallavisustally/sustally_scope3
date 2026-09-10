"use client";

import Link from "next/link";
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

export function UserChip() {
  return (
    <Link href="/settings" className="icon-chip" aria-label="Account">
      <IconAvatar />
    </Link>
  );
}
