export function IconBell() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 22a2.4 2.4 0 0 0 2.3-1.7H9.7A2.4 2.4 0 0 0 12 22Zm8-4.2c-1.7-1.5-2.8-3.6-2.8-8.1 0-3.4-1.4-5.6-3.2-7C13.2 2.2 12.6 2 12 2s-1.2.2-2 .7C8.2 4.1 6.8 6.3 6.8 9.7c0 4.5-1.1 6.6-2.8 8.1H20Z" />
    </svg>
  );
}

export function IconInfo() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" d="M12 11.2V17" />
      <circle cx="12" cy="7.6" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconHelp() {
  return (
    <svg width="14" height="18" viewBox="0 0 12 19" fill="currentColor" aria-hidden>
      <path d="M4.78 12.75c.02-1.2.15-2.08.41-2.63.26-.55.75-1.15 1.46-1.8.7-.63 1.24-1.22 1.61-1.76.38-.54.56-1.12.56-1.74 0-.75-.25-1.38-.75-1.88S6.88 2.2 5.98 2.2c-.87 0-1.53.25-2 .74-.47.49-.81 1-.1 1.53L2.95 3.55C3.22 2.57 3.84 1.73 4.71 1.04 5.59.35 6.68 0 7.98 0c1.67 0 2.95.46 3.85 1.39.9.92 1.35 2.04 1.35 3.34 0 .8-.17 1.52-.51 2.17-.34.65-.89 1.33-1.64 2.05-.82.78-1.31 1.38-1.48 1.8-.16.42-.26 1.08-.27 2Z" />
      <path d="M5.98 19c-.48 0-.9-.17-1.24-.51A1.68 1.68 0 0 1 4.23 17.25c0-.48.17-.9.51-1.24.34-.34.76-.51 1.24-.51s.9.17 1.24.51c.34.34.51.76.51 1.24s-.17.9-.51 1.24c-.34.34-.76.51-1.24.51Z" />
    </svg>
  );
}

export function IconSun() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path strokeLinecap="round" d="M12 3v2.25M18.364 5.636l-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
    </svg>
  );
}

export function IconMoon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path strokeLinecap="round" d="M21.752 15.002A9.72 9.72 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
    </svg>
  );
}

export function IconAvatar() {
  return (
    <svg width="16" height="16" viewBox="0 -960 960 960" fill="currentColor" aria-hidden>
      <path d="M480-480q-66 0-113-47t-47-113q0-66 47-113t113-47q66 0 113 47t47 113q0 66-47 113t-113 47ZM160-160v-112q0-34 17.5-62.5T224-378q62-31 126-46.5T480-440q66 0 130 15.5T736-378q29 15 46.5 43.5T800-272v112H160Z" />
    </svg>
  );
}

export const NAV_ICONS: Record<string, string> = {
  "/dashboard": "M4 13h7V4H4v9zm9 7h7V4h-7v16zM4 20h7v-5H4v5z",
  "/company": "M4 21V8l8-5 8 5v13H4zm5-2h2v-6h2v6h2V9.4L12 7.2 9 9.4V19z",
  "/categories": "M4 6h16v2.5H4V6zm0 5h16v2.5H4V11zm0 5h11V18.5H4V16z",
  "/activity": "M5 4h14v3.5H5V4zm0 6h9v3.5H5V10zm0 6h14v3.5H5V16z",
  "/activity/method": "M7 4h3v3H7V4zm7 0h3v3h-3V4zM7 17h3v3H7v-3zm7 0h3v3h-3v-3zM10 7v3h4V7M8.5 17v-3h7v3",
  "/activity/factors": "M7 3h10v3H7V3zM5 8h14v13H5V8zm4 3h6v2H9v-2z",
  "/activity/review": "M4 5h16v3H4V5zm0 5h16v10H4V10zm3 3h8v2H7v-2z",
  "/results": "M5 18V9h3v9H5zm5.5 0V5h3v13h-3zM16 18v-6h3v6h-3z",
  "/reports": "M6 3h8.5L19 7.5V21H6V3zm8 1.2V8h3.6",
  "/settings": "M10.1 4.1h3.8l.5 2.1 2 .1 1.5 3.3-1.6 1.2.1 2.2 1.5 1.2-1.5 3.3-2 .1-.5 2.1h-3.8l-.5-2.1-2-.1L6.1 16l1.6-1.2-.1-2.2L6.1 11.4 7.6 8.1l2-.1.5-2.1z",
  "/help": "M12 3a9 9 0 100 18 9 9 0 000-18zm0 14h.01M9.6 9.4a2.4 2.4 0 114.1 1.7c-.7.6-1.6 1.1-1.6 2.1",
};

export function IconChevronLeft() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M15.41 7.41 10.83 12l4.58 4.59L14 18l-6-6 6-6 1.41 1.41z" />
    </svg>
  );
}

export function IconChevronDown() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z" />
    </svg>
  );
}

export function NavGlyph({ href }: { href: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
      <path d={NAV_ICONS[href] ?? NAV_ICONS["/dashboard"]} />
    </svg>
  );
}
