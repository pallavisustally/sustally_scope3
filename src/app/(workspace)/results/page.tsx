"use client";

import { FooterNav, PageIntro } from "@/components/PageBits";
import { useInventory } from "@/components/InventoryProvider";
import { SCOPE3_CATEGORIES } from "@/data/protocol";

const BARS = [72, 48, 31, 40, 22, 18, 14, 8, 36, 10, 55, 28, 6, 4, 12];

export default function ResultsPage() {
  const { state } = useInventory();
  const included = SCOPE3_CATEGORIES.filter((c) => state.categories[c.id] === "included").length;

  return (
    <>
      <PageIntro
        kicker="Inventory view"
        title="Results and analytics"
        body="Category-wise layout for a Scope 3 inventory. Figures below are sample placeholders so the dashboard can be reviewed. They are not calculated from activity data."
      />
      <div className="grid gap-3 md:grid-cols-3">
        <article className="panel">
          <p className="text-[13px] text-[var(--muted)]">Sample total</p>
          <p className="mt-1 text-[28px] font-semibold tracking-[-0.04em]">1,245,320</p>
          <p className="text-[13px] text-[var(--muted)]">tCO₂e · preview only</p>
        </article>
        <article className="panel">
          <p className="text-[13px] text-[var(--muted)]">Categories included</p>
          <p className="mt-1 text-[28px] font-semibold tracking-[-0.04em]">
            {included} / 15
          </p>
          <p className="text-[13px] text-[var(--muted)]">Remainder are excluded or not applicable</p>
        </article>
        <article className="panel">
          <p className="text-[13px] text-[var(--muted)]">Data quality</p>
          <p className="mt-1 text-[28px] font-semibold tracking-[-0.04em]">—</p>
          <p className="text-[13px] text-[var(--muted)]">Technology, time, geography, completeness, reliability</p>
        </article>
      </div>
      <div className="mt-4 workspace-split">
        <article className="panel">
          <h3 className="mb-4 text-[15px] font-semibold">Emissions by category</h3>
          <div className="flex h-[200px] items-end gap-2">
            {BARS.map((height, index) => (
              <div key={index} className="flex flex-1 flex-col items-center gap-2">
                <div className="w-full rounded-t-md bg-[var(--brand)]" style={{ height: `${height}%`, opacity: 0.35 + height / 200 }} />
                <span className="text-[10px] text-[var(--muted)]">{index + 1}</span>
              </div>
            ))}
          </div>
        </article>
        <article className="panel">
          <h3 className="mb-4 text-[15px] font-semibold">Emission share</h3>
          <div
            className="mx-auto h-[160px] w-[160px] rounded-full"
            style={{
              background: "conic-gradient(#8E4DFF 0 38%, #7E57C2 38% 61%, #c19dff 61% 82%, #eceff8 82% 100%)",
            }}
          />
          <ul className="mt-4 space-y-1 text-[13px] text-[var(--muted)]">
            <li>Cat 1 · 38%</li>
            <li>Cat 11 · 23%</li>
            <li>Cat 4 · 21%</li>
            <li>Other · 18%</li>
          </ul>
        </article>
      </div>
      <FooterNav back="/activity/review" next="/reports" nextLabel="Generate report" />
    </>
  );
}
