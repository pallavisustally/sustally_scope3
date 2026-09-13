import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AuthBoard } from "@/components/AuthBoard";
import { readAuth } from "@/lib/require-user";

export default async function LoginPage() {
  const auth = await readAuth();
  if (auth.status === "ok") redirect("/dashboard");
  if (auth.status === "invalid") redirect("/api/auth/signout");

  return (
    <Suspense>
      <AuthBoard />
    </Suspense>
  );
}
