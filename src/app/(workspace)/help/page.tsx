import { PageIntro } from "@/components/PageBits";

export default function HelpPage() {
  return (
    <>
      <PageIntro
        kicker="Workspace"
        title="Help and support"
        body="This product follows two GHG Protocol documents: the Corporate Value Chain (Scope 3) Standard and the Technical Guidance for Calculating Scope 3 Emissions."
      />
      <div className="grid gap-3">
        <article className="panel">
          <h3 className="font-semibold">Accounting standard</h3>
          <p className="mt-1 text-[14px] text-[var(--muted)]">
            Principles, organizational boundary, 15 categories, exclusions, data quality, and public reporting requirements.
          </p>
        </article>
        <article className="panel">
          <h3 className="font-semibold">Calculation guidance</h3>
          <p className="mt-1 text-[14px] text-[var(--muted)]">
            Decision trees, activity data, emission factors, and formulas for each category. Not executed in this UI pass.
          </p>
        </article>
      </div>
    </>
  );
}
