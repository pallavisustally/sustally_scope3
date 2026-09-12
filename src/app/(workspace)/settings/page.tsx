"use client";

import { PageIntro } from "@/components/PageBits";
import { useTheme } from "@/components/ThemeProvider";

const THEMES = [
  { id: "dark" as const, label: "Dark", detail: "Default workspace." },
  { id: "light" as const, label: "Light", detail: "Cool grey surfaces." },
];

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();

  return (
    <>
      <PageIntro kicker="Workspace" title="Settings" body="Choose Dark or Light. The choice stays on this device." />

      <section className="panel settings-theme">
        <h3>Theme</h3>
        <p>Dark is the default. Buttons stay the same purple in both themes.</p>
        <div className="settings-theme-grid" role="group" aria-label="Color theme">
          {THEMES.map((option) => (
            <button
              key={option.id}
              type="button"
              className="settings-theme-card"
              data-on={theme === option.id ? "true" : "false"}
              data-preview={option.id}
              aria-pressed={theme === option.id}
              onClick={() => setTheme(option.id)}
            >
              <span className="settings-swatch" aria-hidden>
                <i />
                <i />
                <i />
              </span>
              <strong>{option.label}</strong>
              <span>{option.detail}</span>
            </button>
          ))}
        </div>
      </section>
    </>
  );
}
