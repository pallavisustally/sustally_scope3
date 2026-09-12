"use client";

import { FormulaHint } from "@/components/FormulaHint";
import { useInventory } from "@/components/InventoryProvider";
import { FooterNav, NoSelectedCategories, PageIntro } from "@/components/PageBits";
import { fieldsFor, itemLabel } from "@/data/fields";
import { includedCategories } from "@/data/protocol";
import { formatTco2e } from "@/lib/numbers";

function factorLine(factor: { factor: string; unit: string; source: string; year: string } | undefined, empty: string) {
  if (!factor) return empty;
  return `${factor.factor} ${factor.unit} · ${factor.source} (${factor.year})`;
}

export default function ReviewPage() {
  const { state, results } = useInventory();
  const selected = includedCategories(state.categories);
  if (selected.length === 0) return <NoSelectedCategories />;

  return (
    <>
      <PageIntro
        kicker="Selected categories"
        title="Review and calculate"
        body="Check inputs, methods, and emission factors. Calculate on this page uses the same engine as Results: activity data × emission factor, converted to tCO₂e."
      />
      <div className="grid gap-4">
        {selected.map((category) => {
          const entry = state.entries[category.id];
          if (!entry) return null;
          const method = category.methods.find((row) => row.id === entry.method);
          const fields = fieldsFor(category.id, entry.method);
          const categoryResult = results.categories.find((row) => row.id === category.id);
          return (
            <article key={category.id} className="panel has-formula">
              <FormulaHint categoryId={category.id} />
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[12px] font-semibold text-[var(--brand)]">Category {category.id}</p>
                  <h3 className="mt-1 text-[16px] font-semibold">{category.name}</h3>
                </div>
                <p className="text-[15px] font-semibold">
                  {formatTco2e(categoryResult?.tco2e ?? 0)} tCO₂e
                </p>
              </div>
              <div className="mt-4 grid gap-4">
                <p className="text-[13px] text-[var(--muted)]">Method: {method?.label ?? entry.method}</p>
                {entry.items.map((item, index) => {
                  const itemResult = categoryResult?.items.find((row) => row.itemId === item.id);
                  const conversion = itemResult?.spendConversion;
                  return (
                    <div key={item.id} className="item-card">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <p className="text-[13px] font-semibold">
                          Item {index + 1}: {itemLabel(item.values)}
                        </p>
                        <p className="text-[13px] font-semibold">{formatTco2e(itemResult?.tco2e ?? 0)} tCO₂e</p>
                      </div>
                      <dl className="grid gap-3">
                        {fields.map((field) => (
                          <div key={field.id} className="grid grid-cols-[180px_1fr] gap-4 border-b border-[var(--line)] pb-2 last:border-0">
                            <dt className="text-[13px] text-[var(--muted)]">{field.label}</dt>
                            <dd className="font-medium">{item.values[field.id] || "—"}</dd>
                          </div>
                        ))}
                        <div className="grid grid-cols-[180px_1fr] gap-4">
                          <dt className="text-[13px] text-[var(--muted)]">
                            {entry.method === "hybrid" ? "Supplier-specific factor" : "Emission factor"}
                          </dt>
                          <dd className="font-medium">{factorLine(itemResult?.factor, "Not selected")}</dd>
                        </div>
                        {entry.method === "hybrid" ? (
                          <div className="grid grid-cols-[180px_1fr] gap-4">
                            <dt className="text-[13px] text-[var(--muted)]">Secondary factor</dt>
                            <dd className="font-medium">{factorLine(itemResult?.secondaryFactor, "Not selected")}</dd>
                          </div>
                        ) : null}
                        {itemResult?.steps?.length ? (
                          <div className="grid grid-cols-[180px_1fr] gap-4">
                            <dt className="text-[13px] text-[var(--muted)]">Calculation</dt>
                            <dd className="font-medium">
                              {itemResult.steps.map((step) => (
                                <p key={step} className="mb-1 last:mb-0">
                                  {step}
                                </p>
                              ))}
                            </dd>
                          </div>
                        ) : null}
                        {itemResult && (itemResult.supplierTco2e > 0 || itemResult.secondaryTco2e > 0) ? (
                          <div className="grid grid-cols-[180px_1fr] gap-4">
                            <dt className="text-[13px] text-[var(--muted)]">Split</dt>
                            <dd className="font-medium">
                              Supplier {formatTco2e(itemResult.supplierTco2e)} tCO₂e · secondary {formatTco2e(itemResult.secondaryTco2e)} tCO₂e
                            </dd>
                          </div>
                        ) : null}
                        {conversion ? (
                          <div className="grid grid-cols-[180px_1fr] gap-4">
                            <dt className="text-[13px] text-[var(--muted)]">Currency conversion</dt>
                            <dd className="font-medium">
                              {conversion.from} → {conversion.to} at {conversion.rate} · converted spend {formatTco2e(conversion.amount)}
                            </dd>
                          </div>
                        ) : null}
                        {itemResult && itemResult.biogenicTco2e > 0 ? (
                          <div className="grid grid-cols-[180px_1fr] gap-4">
                            <dt className="text-[13px] text-[var(--muted)]">Biogenic CO₂</dt>
                            <dd className="font-medium">{formatTco2e(itemResult.biogenicTco2e)} tCO₂ (not in scope 3 total)</dd>
                          </div>
                        ) : null}
                      </dl>
                      {itemResult && !itemResult.complete ? (
                        <p className="mt-3 text-[13px] text-[var(--muted)]">
                          Incomplete: {itemResult.missing.join(", ")}.
                        </p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </article>
          );
        })}
        <p className="rounded-xl bg-[var(--surface-2)] px-4 py-3 text-[13px] text-[var(--muted)]">
          Calculated emissions: {formatTco2e(results.totalTco2e)} tCO₂e from {results.completeItems} complete
          {results.completeItems === 1 ? " item" : " items"}
          {results.totalItems !== results.completeItems
            ? ` · ${results.totalItems - results.completeItems} still missing required inputs`
            : ""}
          {results.biogenicTco2e > 0 ? ` · biogenic CO₂ ${formatTco2e(results.biogenicTco2e)} tCO₂ reported separately` : ""}
          .
        </p>
      </div>
      <FooterNav back="/activity" next="/results" nextLabel="Calculate" />
    </>
  );
}
