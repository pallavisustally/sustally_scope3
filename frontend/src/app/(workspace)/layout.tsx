import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AppShell } from "@/components/AppShell";
import { CurrentUserProvider } from "@/components/CurrentUser";
import { InventoryProvider } from "@/components/InventoryProvider";
import { readAuth } from "@/lib/require-user";

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const auth = await readAuth();
  if (auth.status === "invalid") redirect("/api/auth/signout");
  if (auth.status === "anon") redirect("/");
  if (auth.status === "unavailable") {
    return (
      <main className="grid min-h-screen place-items-center px-6 text-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.04em]">Account service is waking up</h1>
          <p className="mt-2 max-w-[42ch] text-[var(--muted)]">Refresh in a moment. Your sign-in is still saved.</p>
        </div>
      </main>
    );
  }

  return (
    <Suspense>
      <CurrentUserProvider user={auth.user}>
        <InventoryProvider>
          <AppShell>{children}</AppShell>
        </InventoryProvider>
      </CurrentUserProvider>
    </Suspense>
  );
}
