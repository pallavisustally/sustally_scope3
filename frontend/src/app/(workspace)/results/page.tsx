"use client";

import Link from "next/link";
import { FooterNav, PageIntro } from "@/components/PageBits";
import { ResultsCharts } from "@/components/ResultsCharts";
import { useInventory } from "@/components/InventoryProvider";
import type { CategoryResult } from "@/lib/calculate";
import { formatShare, formatTco2e } from "@/lib/numbers";
import { formatReportingYear } from "@/lib/reporting-year";

function StatusPill({ complete, total }: { complete: number; total: number }) {
  if (!total) return <span className="status-pill">No items</span>;
  if (complete === total) return <span className="status-pill" data-tone="ok">Complete</span>;
  if (complete === 0) return <span className="status-pill" data-tone="warn">Not calculated</span>;
  return (
    <span className="status-pill" data-tone="warn">
      {complete}/{total} items
    </span>
  );
}

function CategoryWorking({ category }: { category: CategoryResult }) {
  return (
    <details className="results-detail" open={category.completeCount > 0}>
      <summary>
        <span>
          <strong>
            Category {category.id}
            <span className="results-detail-name">{category.name}</span>
          </strong>
          <span className="results-detail-meta">
            {category.methodLabel} · {category.completeCount}/{category.items.length} items
          </span>
        </span>
        <span className="results-num results-final">{formatTco2e(category.tco2e)} tCO₂e</span>
      </summary>
      <p className="results-formula">{category.methodFormula}</p>
      <div className="results-items">
        {category.items.map((item) => (
          <div key={item.itemId} className="results-item" data-complete={item.complete ? "true" : "false"}>
            <div className="results-item-head">
              <p>
                {item.label}
                {item.supplierVerified ? (
                  <span className="status-pill ml-2" data-tone="ok">
                    Verified by supplier
                  </span>
                ) : null}
              </p>
              <p className="results-num">{formatTco2e(item.tco2e)} tCO₂e</p>
            </div>
            <ul>
              {item.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ul>
            {item.complete && item.factor && !(category.id === 15 && item.method === "investment-specific") ? (
              <p className="results-factor">
                Factor: {item.factor.factor} {item.factor.unit} · {item.factor.source} {item.factor.year}
                {item.secondaryFactor
                  ? ` · secondary ${item.secondaryFactor.factor} ${item.secondaryFactor.unit}`
                  : ""}
              </p>
            ) : null}
            <div className="results-item-actions">
              {item.complete ? (
                <Link href={`/activity?cat=${category.id}`}>Edit inputs</Link>
              ) : (
                <Link href={item.missing.includes("Emission factor") ? `/activity/factors?cat=${category.id}` : `/activity?cat=${category.id}`}>
                  Finish this item
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </details>
  );
}

export default function ResultsPage() {
  const { state, results, savedInventories } = useInventory();
  const ranked = [...results.categories].sort((a, b) => b.tco2e - a.tco2e);
  const incomplete = results.categories.flatMap((category) =>
    category.items
      .filter((item) => !item.complete)
      .map((item) => ({
        categoryId: category.id,
        name: category.name,
        label: item.label,
        missing: item.missing,
      })),
  );

  const companyKey = state.companyName.trim().toLowerCase();
  const yearTotals = new Map<string, number>();
  for (const row of savedInventories) {
    if (!companyKey || row.name.trim().toLowerCase() !== companyKey || !row.year) continue;
    yearTotals.set(row.year, row.totalTco2e);
  }
  if (state.year) yearTotals.set(state.year, results.totalTco2e);
  const yearSeries = [...yearTotals.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const yearMax = Math.max(...yearSeries.map(([, value]) => value), 0);

  return (
    <>
      <PageIntro
        kicker="Report view"
        title="Results"
        body="Each complete activity item is calculated as activity data × emission factor, converted to tCO₂e. Optional labels and classification fields can stay empty. Supplier-specific share and the high reliability score apply after the supplier confirms the row."
      />
      <p className="results-edit-note">
        Note: if you also want to edit values, go to <Link href="/activity">Data collection</Link> and edit them there.
      </p>

      <article className="panel results-masthead">
        <div>
          <p className="text-[13px] text-[var(--muted)]">Scope 3 total</p>
          <p className="results-total">
            {formatTco2e(results.totalTco2e)}
            <span> tCO₂e</span>
          </p>
          <p className="mt-3 text-[13px] text-[var(--muted)]">
            {[state.companyName, state.year ? formatReportingYear(state.year) : "", state.industry].filter(Boolean).join(" · ") || "Add company details in Setup to label this report."}
          </p>
        </div>
        <dl className="results-meta">
          <div>
            <dt>Included categories</dt>
            <dd>{results.includedCount} / 15</dd>
          </div>
          <div>
            <dt>Calculated items</dt>
            <dd>
              {results.completeItems} / {results.totalItems || 0}
            </dd>
          </div>
          <div>
            <dt>Upstream</dt>
            <dd>{formatTco2e(results.upstreamTco2e)} tCO₂e</dd>
          </div>
          <div>
            <dt>Downstream</dt>
            <dd>{formatTco2e(results.downstreamTco2e)} tCO₂e</dd>
          </div>
          <div>
            <dt>Supplier-specific (verified)</dt>
            <dd>{formatShare(results.supplierSharePct)}</dd>
          </div>
          <div>
            <dt>Biogenic CO₂ (reported separately)</dt>
            <dd>{formatTco2e(results.biogenicTco2e)} tCO₂</dd>
          </div>
        </dl>
      </article>
      {results.unverifiedSupplierTco2e > 0 ? (
        <p className="mt-3 text-[13px] text-[var(--muted)]">
          {formatTco2e(results.unverifiedSupplierTco2e)} tCO₂e of company-entered supplier-specific data is not yet verified, so it is excluded from the supplier share and the reliability score of 5.
        </p>
      ) : null}

      {results.includedCount === 0 ? (
        <p className="form-alert mt-4" role="status">
          Select at least one category in Setup, then enter activity data to calculate results.
        </p>
      ) : !results.hasCalculableData ? (
        <div className="form-alert mt-4" role="status">
          <p className="font-semibold">No item is complete enough to calculate yet.</p>
          <p>Fill required activity fields and bind an emission factor. Results stay at 0 until then.</p>
        </div>
      ) : incomplete.length ? (
        <div className="form-alert mt-4" role="status">
          <p className="font-semibold">
            {incomplete.length} item{incomplete.length === 1 ? "" : "s"} still at 0 tCO₂e
          </p>
          <ul>
            {incomplete.slice(0, 6).map((row) => (
              <li key={`${row.categoryId}-${row.label}`}>
                Category {row.categoryId} · {row.label}: {row.missing.join(", ")}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {results.includedCount > 0 ? (
        <div className="panel collection-panel mt-4">
          <div className="collection-scroll">
            <table className="collection-table results-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Method</th>
                  <th>Status</th>
                  <th>Share</th>
                  <th>tCO₂e</th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((category) => (
                  <tr key={category.id}>
                    <td>
                      <p className="collection-cat-id">Category {category.id}</p>
                      <p className="collection-cat-name">{category.name}</p>
                    </td>
                    <td>
                      <p>{category.methodLabel || "—"}</p>
                      <p className="results-quiet">{category.completeCount}/{category.items.length} items</p>
                    </td>
                    <td>
                      <StatusPill complete={category.completeCount} total={category.items.length} />
                    </td>
                    <td>
                      <div className="share-cell">
                        <div className="share-bar" aria-hidden>
                          <span style={{ width: `${Math.max(category.share, category.tco2e > 0 ? 2 : 0)}%` }} />
                        </div>
                        {formatShare(category.share)}
                      </div>
                    </td>
                    <td className="results-num results-final">{formatTco2e(category.tco2e)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4}>Scope 3 total</td>
                  <td className="results-num">{formatTco2e(results.totalTco2e)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      ) : null}

      {results.categories.length ? (
        <div className="mt-4 grid gap-3">
          <h3 className="text-[15px] font-semibold">Calculation working</h3>
          {results.categories.map((category) => (
            <CategoryWorking key={category.id} category={category} />
          ))}
        </div>
      ) : null}

      {results.hasCalculableData ? <ResultsCharts results={results} /> : null}

      {yearSeries.length >= 2 ? (
        <article className="panel mt-4">
          <h3 className="mb-4 text-[15px] font-semibold">Multi-year comparison</h3>
          <div className="flex h-[160px] items-end gap-3">
            {yearSeries.map(([year, value]) => {
              const height = yearMax > 0 ? Math.max((value / yearMax) * 100, value > 0 ? 8 : 2) : 2;
              const current = year === state.year;
              return (
                <div key={year} className="flex min-w-[56px] flex-1 flex-col items-center gap-2">
                  <p className="text-[12px] font-semibold">{formatTco2e(value)}</p>
                  <div
                    className="w-full rounded-t-md bg-[var(--brand)]"
                    style={{ height: `${height}%`, opacity: current ? 1 : 0.45 }}
                    title={`${formatReportingYear(year)}: ${formatTco2e(value)} tCO2e`}
                  />
                  <span className="text-[12px] text-[var(--muted)]">{formatReportingYear(year)}</span>
                </div>
              );
            })}
          </div>
        </article>
      ) : null}

      <FooterNav back="/activity/review" next="/reports" nextLabel="Generate report" />
    </>
  );
}
