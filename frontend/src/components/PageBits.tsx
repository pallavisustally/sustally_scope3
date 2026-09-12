"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useInventory } from "@/components/InventoryProvider";

export function PageIntro({
  kicker,
  title,
  body,
}: {
  kicker?: string;
  title: string;
  body: string;
}) {
  return (
    <div className="page-intro">
      {kicker ? <p className="page-kicker">{kicker}</p> : null}
      <h2 className="page-title">{title}</h2>
      <p className="page-lead">{body}</p>
    </div>
  );
}

export function NoSelectedCategories() {
  const { ready } = useInventory();
  if (!ready) {
    return (
      <PageIntro
        kicker="Data collection"
        title="Loading inventory"
        body="Restoring the working inventory from Payload."
      />
    );
  }
  return (
    <>
      <PageIntro
        kicker="Data collection"
        title="No categories selected"
        body="Select at least one scope 3 category in Setup before entering activity data, methods, or emission factors."
      />
      <FooterNav back="/categories" next="/categories" nextLabel="Select categories" />
    </>
  );
}

export function FooterNav({
  back,
  next,
  nextLabel = "Save & Continue",
  onNext,
  canProceed = true,
  onBlocked,
}: {
  back?: string;
  next: string;
  nextLabel?: string;
  onNext?: () => void;
  canProceed?: boolean;
  onBlocked?: () => void;
}) {
  const router = useRouter();
  return (
    <div className="footer-nav">
      {back ? (
        <Link href={back} className="btn btn-ghost">
          Back
        </Link>
      ) : (
        <span />
      )}
      <button
        type="button"
        className="btn btn-primary"
        onClick={() => {
          if (!canProceed) {
            onBlocked?.();
            return;
          }
          onNext?.();
          router.push(next);
        }}
      >
        {nextLabel}
      </button>
    </div>
  );
}
