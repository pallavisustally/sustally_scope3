"use client";

import { useState } from "react";
import { FormulaHint } from "@/components/FormulaHint";
import { FooterNav, PageIntro } from "@/components/PageBits";
import { useInventory } from "@/components/InventoryProvider";
import { SCOPE3_CATEGORIES, type Inclusion } from "@/data/protocol";

const STATES: { id: Inclusion; label: string }[] = [
  { id: "included", label: "Included" },
  { id: "not_applicable", label: "Not applicable" },
  { id: "excluded", label: "Excluded" },
];

export default function CategoriesPage() {
  const { state, setCategory, setJustification } = useInventory();
  const [stream, setStream] = useState<"upstream" | "downstream">("upstream");
  const visible = SCOPE3_CATEGORIES.filter((c) => c.stream === stream);

  return (
    <>
      <PageIntro
        kicker="Step 3"
        title="Select scope 3 categories"
        body="Companies shall account for all 15 categories and disclose and justify any exclusions. Use Not applicable when the activity does not exist. Use Excluded when it exists but is omitted from this inventory."
      />
      <div className="mb-4 flex gap-2">
        <button type="button" className={stream === "upstream" ? "btn btn-primary" : "btn btn-ghost"} onClick={() => setStream("upstream")}>
          Upstream 1–8
        </button>
        <button type="button" className={stream === "downstream" ? "btn btn-primary" : "btn btn-ghost"} onClick={() => setStream("downstream")}>
          Downstream 9–15
        </button>
      </div>
      <div className="cat-grid">
        {visible.map((category) => {
          const status = state.categories[category.id];
          return (
            <article key={category.id} className="panel cat-card">
              <FormulaHint categoryId={category.id} />
              <p className="text-[12px] font-semibold text-[var(--brand)]">Category {category.id}</p>
              <h3 className="mt-1 text-[15px] font-semibold leading-snug">{category.name}</h3>
              <p className="cat-summary">{category.summary}</p>
              <div className="cat-status">
                {STATES.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className={status === option.id ? "btn btn-primary cat-chip" : "btn btn-ghost cat-chip"}
                    onClick={() => setCategory(category.id, option.id)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              {status !== "included" ? (
                <div className="field mt-3">
                  <label htmlFor={`why-${category.id}`}>Justification</label>
                  <textarea
                    id={`why-${category.id}`}
                    value={state.justifications[category.id] ?? ""}
                    onChange={(e) => setJustification(category.id, e.target.value)}
                    placeholder="Required for not applicable and excluded categories."
                  />
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
      <FooterNav back="/company" next="/activity" nextLabel="Continue" />
    </>
  );
}
