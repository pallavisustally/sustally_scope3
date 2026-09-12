"use client";

import { useState } from "react";
import { FormulaHint } from "@/components/FormulaHint";
import { FooterNav, PageIntro } from "@/components/PageBits";
import { useInventory } from "@/components/InventoryProvider";
import { SCOPE3_CATEGORIES } from "@/data/protocol";

const TABS = [
  { id: "all", label: "All 15 categories" },
  { id: "upstream", label: "Upstream 1–8" },
  { id: "downstream", label: "Downstream 9–15" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function CategoriesPage() {
  const { state, setCategory } = useInventory();
  const [tab, setTab] = useState<TabId>("all");
  const visible = tab === "all" ? SCOPE3_CATEGORIES : SCOPE3_CATEGORIES.filter((c) => c.stream === tab);

  return (
    <>
      <PageIntro
        kicker="Step 3"
        title="Select scope 3 categories"
        body="Companies shall account for all 15 categories. Select the categories that apply to this inventory. Selections stay in place when you switch between All, Upstream, and Downstream, and when you go back to continue later."
      />
      <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Category streams">
        {TABS.map((option) => (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={tab === option.id}
            className={tab === option.id ? "btn btn-primary" : "btn btn-ghost"}
            onClick={() => setTab(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>
      <div className="cat-grid">
        {visible.map((category) => {
          const included = state.categories[category.id] === "included";
          return (
            <article key={category.id} className="panel cat-card" data-on={included ? "true" : "false"}>
              <FormulaHint categoryId={category.id} />
              <p className="text-[12px] font-semibold text-[var(--brand)]">Category {category.id}</p>
              <h3 className="mt-1 text-[15px] font-semibold leading-snug">{category.name}</h3>
              <p className="cat-summary">{category.summary}</p>
              <label className="cat-check">
                <input
                  type="checkbox"
                  checked={included}
                  aria-label={`Include category ${category.id}, ${category.name}`}
                  onChange={() => setCategory(category.id, included ? "excluded" : "included")}
                />
              </label>
            </article>
          );
        })}
      </div>
      <FooterNav back="/company" next="/activity" />
    </>
  );
}
