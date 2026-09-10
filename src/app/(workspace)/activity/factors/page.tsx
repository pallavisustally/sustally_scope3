"use client";

import { CategoryPicker } from "@/components/CategoryPicker";
import { useInventory } from "@/components/InventoryProvider";
import { FooterNav, PageIntro } from "@/components/PageBits";
import { itemLabel } from "@/data/fields";
import { factorsForCategory, getCategory, SAMPLE_FACTORS } from "@/data/protocol";
import { useEffect, useMemo, useState } from "react";

export default function FactorsPage() {
  const { state, setItemFactor } = useInventory();
  const category = getCategory(state.activeCategoryId);
  const entry = state.entries[category.id];
  const [itemId, setItemId] = useState(entry?.items[0]?.id ?? "");
  useEffect(() => {
    setItemId((current) => (entry?.items.some((item) => item.id === current) ? current : entry?.items[0]?.id ?? ""));
  }, [category.id, entry?.items]);
  if (!entry) return null;
  const selectedItem = entry.items.find((item) => item.id === itemId) ?? entry.items[0];
  const rows = useMemo(() => factorsForCategory(category.id), [category.id]);
  const selected = SAMPLE_FACTORS.find((row) => row.id === selectedItem?.factorId);

  return (
    <>
      <PageIntro
        kicker={`Category ${category.id}`}
        title="Select emission factors"
        body="Bind a factor to each activity item. Source, year, region, and factor type are stored for the report. These rows are sample data."
      />
      <CategoryPicker />
      <div className="panel overflow-x-auto">
        <div className="mb-4 flex flex-wrap gap-3">
          <div className="field min-w-[220px] flex-1">
            <label htmlFor="item">Activity item</label>
            <select
              id="item"
              value={selectedItem?.id ?? ""}
              onChange={(event) => setItemId(event.target.value)}
            >
              {entry.items.map((item, index) => (
                <option key={item.id} value={item.id}>
                  Item {index + 1}: {itemLabel(item.values)}
                </option>
              ))}
            </select>
          </div>
          <div className="field min-w-[220px] flex-1">
            <label htmlFor="search">Search</label>
            <input id="search" placeholder="Steel, freight, electricity..." />
          </div>
        </div>
        <table className="w-full text-left text-[13px]">
          <thead className="text-[var(--muted)]">
            <tr>
              <th className="pb-3 font-semibold">Factor</th>
              <th className="pb-3 font-semibold">Source</th>
              <th className="pb-3 font-semibold">Year</th>
              <th className="pb-3 font-semibold">Region</th>
              <th className="pb-3 font-semibold">Type</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className="cursor-pointer border-t border-[var(--line)]"
                onClick={() => selectedItem && setItemFactor(category.id, selectedItem.id, row.id)}
              >
                <td className="py-3">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="factor"
                      checked={selectedItem?.factorId === row.id}
                      onChange={() => selectedItem && setItemFactor(category.id, selectedItem.id, row.id)}
                    />
                    {row.factor} {row.unit}
                  </label>
                </td>
                <td>{row.source}</td>
                <td>{row.year}</td>
                <td>{row.region}</td>
                <td>{row.type}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {selected ? (
          <p className="mt-4 rounded-xl bg-[var(--surface-2)] px-4 py-3 text-[13px] text-[var(--muted)]">
            Selected for {itemLabel(selectedItem?.values ?? {})}: {selected.factor} {selected.unit} · {selected.source} (
            {selected.year}) · {selected.region} · {selected.type}.
          </p>
        ) : null}
      </div>
      <FooterNav back="/activity/method" next="/activity/review" />
    </>
  );
}
