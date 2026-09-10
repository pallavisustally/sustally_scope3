import Link from "next/link";

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

export function FooterNav({ back, next, nextLabel = "Save & Continue" }: { back?: string; next: string; nextLabel?: string }) {
  return (
    <div className="footer-nav">
      {back ? (
        <Link href={back} className="btn btn-ghost">
          Back
        </Link>
      ) : (
        <span />
      )}
      <Link href={next} className="btn btn-primary">
        {nextLabel}
      </Link>
    </div>
  );
}
