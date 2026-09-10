"use client";

import { CategoryPicker } from "@/components/CategoryPicker";
import { useInventory } from "@/components/InventoryProvider";
import { FooterNav, PageIntro } from "@/components/PageBits";
import { getCategory } from "@/data/protocol";

export default function MethodPage() {
  const { state, setCategoryMethod } = useInventory();
  const category = getCategory(state.activeCategoryId);
  const entry = state.entries[category.id];
  if (!entry) return null;

  return (
    <>
      <PageIntro
        kicker={`Category ${category.id}`}
        title="Choose a calculation method"
        body={`Methods below follow the GHG Protocol Technical Calculation Guidance for ${category.name.toLowerCase()}. Ranked from most to least specific. More specific is not always more accurate.`}
      />
      <CategoryPicker />
      <div className="grid gap-3">
        {category.methods.map((method) => (
          <button
            key={method.id}
            type="button"
            className="choice panel !p-5"
            data-on={entry.method === method.id ? "true" : "false"}
            onClick={() => setCategoryMethod(category.id, method.id)}
          >
            <span>
              <strong className="block text-[16px]">{method.label}</strong>
              <span className="text-[13px] text-[var(--muted)]">{method.detail}</span>
            </span>
          </button>
        ))}
      </div>
      <FooterNav back="/activity" next="/activity/factors" nextLabel="Continue" />
    </>
  );
}
