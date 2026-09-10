"use client";

import { useInventory } from "@/components/InventoryProvider";
import { SCOPE3_CATEGORIES } from "@/data/protocol";

const STATUS: Record<string, string> = {
  included: "Included",
  not_applicable: "N/A",
  excluded: "Excluded",
};

export function CategoryPicker() {
  const { state, setActiveCategory } = useInventory();

  return (
    <div className="cat-picker" role="tablist" aria-label="Scope 3 categories">
      {SCOPE3_CATEGORIES.map((category) => {
        const status = state.categories[category.id];
        const active = state.activeCategoryId === category.id;
        return (
          <button
            key={category.id}
            type="button"
            role="tab"
            className={active ? "btn btn-primary cat-pick" : "btn btn-ghost cat-pick"}
            data-status={status}
            aria-selected={active}
            onClick={() => setActiveCategory(category.id)}
          >
            <span>
              {category.id}. {category.name}
            </span>
            {status !== "included" ? <em>{STATUS[status]}</em> : null}
          </button>
        );
      })}
    </div>
  );
}
