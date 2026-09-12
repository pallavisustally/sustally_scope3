import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AppShell } from "@/components/AppShell";
import { CurrentUserProvider } from "@/components/CurrentUser";
import { InventoryProvider } from "@/components/InventoryProvider";
import { readSessionToken, SESSION_COOKIE } from "@/lib/auth-session";
import { findUserById } from "@/lib/auth-store";

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = await readSessionToken(token);
  if (!session) redirect("/");
  const user = await findUserById(session.userId);
  if (!user) redirect("/");

  return (
    <Suspense>
      <CurrentUserProvider user={user}>
        <InventoryProvider>
          <AppShell>{children}</AppShell>
        </InventoryProvider>
      </CurrentUserProvider>
    </Suspense>
  );
}
