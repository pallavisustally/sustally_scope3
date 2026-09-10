"use client";

import { PageIntro } from "@/components/PageBits";
import { ThemeToggle } from "@/components/Brand";

export default function SettingsPage() {
  return (
    <>
      <PageIntro
        kicker="Workspace"
        title="Settings"
        body="Theme lives here for now. Company profile is edited on Company Setup. Authentication and Payload admin will connect later."
      />
      <div className="panel flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Appearance</h3>
          <p className="text-[13px] text-[var(--muted)]">Light uses cool grey surfaces. Dark uses #121212 / #171717 / #1E1E1E. Buttons stay #8E4DFF in both.</p>
        </div>
        <ThemeToggle />
      </div>
    </>
  );
}
