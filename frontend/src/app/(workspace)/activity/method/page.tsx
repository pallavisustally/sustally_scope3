"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function MethodPage() {
  return (
    <Suspense>
      <MethodRedirect />
    </Suspense>
  );
}

function MethodRedirect() {
  const router = useRouter();
  const cat = useSearchParams().get("cat");

  useEffect(() => {
    router.replace(cat ? `/activity?cat=${cat}` : "/activity");
  }, [cat, router]);

  return null;
}
