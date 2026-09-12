"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

const ThemeContext = createContext<{
  theme: Theme;
  toggle: () => void;
  setTheme: (next: Theme) => void;
}>({ theme: "dark", toggle: () => {}, setTheme: () => {} });

function applyTheme(next: Theme) {
  document.documentElement.setAttribute("data-theme", next);
  window.localStorage.setItem("sustally-theme", next);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");

  useEffect(() => {
    const stored = window.localStorage.getItem("sustally-theme");
    const next = stored === "light" ? "light" : "dark";
    setThemeState(next);
    document.documentElement.setAttribute("data-theme", next);
  }, []);

  const setTheme = (next: Theme) => {
    setThemeState(next);
    applyTheme(next);
  };

  const toggle = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return <ThemeContext.Provider value={{ theme, toggle, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
