"use client";

import { useEffect } from "react";
import { useInventory } from "@/components/InventoryProvider";
import { includedCategories } from "@/data/protocol";

export function CategoryPicker() {
  const { state, setActiveCategory } = useInventory();
  const selected = includedCategories(state.categories);

  useEffect(() => {
    if (state.categories[state.activeCategoryId] === "included") return;
    const first = includedCategories(state.categories)[0];
    if (first) setActiveCategory(first.id);
  }, [state.categories, state.activeCategoryId, setActiveCategory]);

  if (selected.length === 0) return null;

  return (
    <div className="cat-picker" role="tablist" aria-label="Selected scope 3 categories">
      {selected.map((category) => {
        const active = state.activeCategoryId === category.id;
        return (
          <button
            key={category.id}
            type="button"
            role="tab"
            className={active ? "btn btn-primary cat-pick" : "btn btn-ghost cat-pick"}
            aria-selected={active}
            onClick={() => setActiveCategory(category.id)}
          >
            {category.id}. {category.name}
          </button>
        );
      })}
    </div>
  );
}
