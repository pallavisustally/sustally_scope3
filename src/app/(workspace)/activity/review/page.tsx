"use client";

import { FormulaHint } from "@/components/FormulaHint";
import { useInventory } from "@/components/InventoryProvider";
import { FooterNav, PageIntro } from "@/components/PageBits";
import { fieldsFor, itemLabel } from "@/data/fields";
import { SAMPLE_FACTORS, SCOPE3_CATEGORIES } from "@/data/protocol";

const STATUS: Record<string, string> = {
  included: "Included",
  not_applicable: "Not applicable",
  excluded: "Excluded",
};

export default function ReviewPage() {
  const { state } = useInventory();

  return (
    <>
      <PageIntro
        kicker="All categories"
        title="Review and calculate"
        body="Check inputs, methods, and emission factors for every category. The Calculate action is present for the journey. It does not run a GHG engine yet."
      />
      <div className="grid gap-4">
        {SCOPE3_CATEGORIES.map((category) => {
          const status = state.categories[category.id];
          const entry = state.entries[category.id];
          if (!entry) return null;
          const method = category.methods.find((row) => row.id === entry.method);
          const fields = fieldsFor(category.id, entry.method);
          return (
            <article key={category.id} className="panel has-formula">
              <FormulaHint categoryId={category.id} />
              <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <p className="text-[12px] font-semibold text-[var(--brand)]">Category {category.id}</p>
                  <h3 className="mt-1 text-[16px] font-semibold">{category.name}</h3>
                </div>
                <p className="text-[13px] text-[var(--muted)]">{STATUS[status]}</p>
              </div>
              {status !== "included" ? (
                <p className="text-[14px] text-[var(--muted)]">
                  {state.justifications[category.id] || "Justification required for this status."}
                </p>
              ) : null}
              {status === "included" || entry.items.some((item) => Object.values(item.values).some(Boolean)) ? (
                <div className="mt-4 grid gap-4">
                  <p className="text-[13px] text-[var(--muted)]">Method: {method?.label ?? entry.method}</p>
                  {entry.items.map((item, index) => {
                    const factor = SAMPLE_FACTORS.find((row) => row.id === item.factorId);
                    return (
                      <div key={item.id} className="item-card">
                        <p className="mb-3 text-[13px] font-semibold">
                          Item {index + 1}: {itemLabel(item.values)}
                        </p>
                        <dl className="grid gap-3">
                          {fields.map((field) => (
                            <div key={field.id} className="grid grid-cols-[180px_1fr] gap-4 border-b border-[var(--line)] pb-2 last:border-0">
                              <dt className="text-[13px] text-[var(--muted)]">{field.label}</dt>
                              <dd className="font-medium">{item.values[field.id] || "—"}</dd>
                            </div>
                          ))}
                          <div className="grid grid-cols-[180px_1fr] gap-4">
                            <dt className="text-[13px] text-[var(--muted)]">Emission factor</dt>
                            <dd className="font-medium">
                              {factor ? `${factor.factor} ${factor.unit} · ${factor.source} (${factor.year})` : "—"}
                            </dd>
                          </div>
                        </dl>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </article>
          );
        })}
        <p className="rounded-xl bg-[var(--surface-2)] px-4 py-3 text-[13px] text-[var(--muted)]">
          Calculated emissions: not calculated in this UI pass.
        </p>
      </div>
      <FooterNav back="/activity/factors" next="/results" nextLabel="Calculate" />
    </>
  );
}
