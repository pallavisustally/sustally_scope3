import Link from "next/link";

const STEPS = [
  { n: "01", title: "Company setup", href: "/company", copy: "Reporting year, industry, and organizational boundary." },
  { n: "02", title: "Select categories", href: "/categories", copy: "All 15 GHG Protocol categories. Exclude only with justification." },
  { n: "03", title: "Activity data", href: "/activity", copy: "Enter items for all 15 categories. Fields follow the chosen method." },
  { n: "04", title: "Method and factors", href: "/activity/method", copy: "Pick a protocol method and bind an emission factor." },
  { n: "05", title: "Review", href: "/activity/review", copy: "Check inputs. Calculations are not run in this shell." },
  { n: "06", title: "Results and report", href: "/results", copy: "Sample visuals, then a GHG Protocol-aligned report outline." },
];

export default function DashboardPage() {
  return (
    <>
      <div className="page-intro">
        <p className="page-kicker">Workspace</p>
        <h2 className="page-title">Scope 3 inventory</h2>
        <p className="page-lead">Set up the company, choose categories, enter activity data, and review a sample report outline. This pass is a visual shell only.</p>
      </div>
      <div className="workspace-grid">
        {STEPS.map((step) => (
          <Link key={step.href} href={step.href} className="panel dash-card hover:border-[var(--brand)]">
            <p className="text-[12px] font-medium text-[var(--brand)]">{step.n}</p>
            <h3 className="mt-3 text-[18px] font-medium">{step.title}</h3>
            <p className="mt-2 text-[14px] text-[var(--muted)]">{step.copy}</p>
          </Link>
        ))}
      </div>
    </>
  );
}
