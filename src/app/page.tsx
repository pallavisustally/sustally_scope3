import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AuthBoard } from "@/components/AuthBoard";
import { readSessionToken, SESSION_COOKIE } from "@/lib/auth-session";

export default async function LoginPage() {
  const session = await readSessionToken((await cookies()).get(SESSION_COOKIE)?.value);
  if (session) redirect("/dashboard");

  return (
    <Suspense>
      <AuthBoard />
    </Suspense>
  );
}
