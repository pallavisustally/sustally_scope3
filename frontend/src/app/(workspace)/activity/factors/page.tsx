"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useInventory } from "@/components/InventoryProvider";
import { FooterNav, NoSelectedCategories, PageIntro } from "@/components/PageBits";
import { itemLabel } from "@/data/fields";
import { factorsForCategory, includedCategories } from "@/data/protocol";
import { factorGaps, factorsReady, hybridFactorNeeds, methodNeedsFactor } from "@/lib/validate-activity";

export default function FactorsPage() {
  return (
    <Suspense>
      <FactorsPageInner />
    </Suspense>
  );
}

function FactorsPageInner() {
  const searchParams = useSearchParams();
  const requestedId = Number(searchParams.get("cat"));
  const { state, setActiveCategory, setItemFactor, setSecondaryFactor, factors, markCategoryStep } = useInventory();
  const included = includedCategories(state.categories);
  const category = included.find((row) => row.id === state.activeCategoryId) ?? included.find((row) => row.id === requestedId) ?? included[0];
  const entry = category ? state.entries[category.id] : undefined;
  const hybrid = entry?.method === "hybrid";
  const itemIds = entry?.items.map((item) => item.id).join(",") ?? "";
  const [itemId, setItemId] = useState(entry?.items[0]?.id ?? "");
  const [slot, setSlot] = useState<"supplier" | "secondary">("supplier");
  const [query, setQuery] = useState("");
  const [showErrors, setShowErrors] = useState(false);

  useEffect(() => {
    if (Number.isFinite(requestedId) && included.some((row) => row.id === requestedId) && state.activeCategoryId !== requestedId) {
      setActiveCategory(requestedId);
    }
  }, [included, requestedId, setActiveCategory, state.activeCategoryId]);

  useEffect(() => {
    setItemId((current) => (itemIds.split(",").includes(current) ? current : itemIds.split(",")[0] ?? ""));
  }, [itemIds]);

  useEffect(() => {
    setQuery("");
  }, [category?.id, itemId]);

  const selectedItem = entry?.items.find((item) => item.id === itemId) ?? entry?.items[0];
  const needs = selectedItem && hybrid ? hybridFactorNeeds(selectedItem) : { supplier: true, secondary: false };

  useEffect(() => {
    if (!hybrid || !selectedItem) {
      setSlot("supplier");
      return;
    }
    if (needs.supplier && !selectedItem.factorId) setSlot("supplier");
    else if (needs.secondary && !selectedItem.secondaryFactorId) setSlot("secondary");
    else setSlot(needs.supplier ? "supplier" : "secondary");
  }, [category?.id, itemId]);

  const rows = useMemo(() => {
    const list = category ? factorsForCategory(category.id, factors) : [];
    const needle = query.trim().toLowerCase();
    if (!needle) return list;
    return list.filter((row) =>
      [row.factor, row.unit, row.source, row.year, row.region, row.type].join(" ").toLowerCase().includes(needle),
    );
  }, [category, query, factors]);
  const selectedFactor = factors.find((row) => row.id === selectedItem?.factorId);
  const selectedSecondary = factors.find((row) => row.id === selectedItem?.secondaryFactorId);
  const bind = (factorId: string) => {
    if (!selectedItem || !category) return;
    if (hybrid && slot === "secondary") {
      setSecondaryFactor(category.id, selectedItem.id, factorId);
      return;
    }
    setItemFactor(category.id, selectedItem.id, factorId);
    if (hybrid && needs.secondary && !selectedItem.secondaryFactorId) setSlot("secondary");
  };
  const boundId = hybrid && slot === "secondary" ? selectedItem?.secondaryFactorId : selectedItem?.factorId;

  if (!category) return <NoSelectedCategories />;
  if (!entry) return null;
  const needsBoundFactor = methodNeedsFactor(category.id, entry.method);
  const ready = factorsReady(entry, category.id);
  const gaps = factorGaps(entry, category.id);
  const secondaryMissing = hybrid && needs.secondary && Boolean(selectedFactor) && !selectedSecondary;

  return (
    <>
      <PageIntro
        kicker={`Category ${category.id}`}
        title="Select emission factors"
        body={
          !needsBoundFactor
            ? "Investment-specific items allocate reported investee emissions by ownership share. No emission factor is required."
            : hybrid
            ? "Hybrid items need two factors: supplier-specific for the share with primary data, and a secondary factor for the remainder. Click a slot, then pick a row. Save stays locked until every required slot is filled."
            : "Bind a published factor to each activity item. Save stays locked until every item has a factor."
        }
      />
      <div className="panel overflow-x-auto">
        {showErrors && !ready ? (
          <div className="form-alert" role="alert">
            <p className="font-semibold">Select an emission factor before saving.</p>
            <ul>
              {gaps.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        ) : secondaryMissing ? (
          <div className="form-alert" role="status">
            <p className="font-semibold">Secondary factor still needed</p>
            <p>
              The supplier-specific factor is set. Hybrid still needs a second factor for the remaining share. The
              secondary slot is selected below; pick a row in the table, then save.
            </p>
          </div>
        ) : null}
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
            <input
              id="search"
              value={query}
              placeholder="e.g. steel, freight, electricity, DEFRA"
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        </div>
        {hybrid ? (
          <div className="mb-4 grid gap-3 sm:grid-cols-2">
            {needs.supplier ? (
              <button
                type="button"
                className="choice"
                data-on={slot === "supplier" ? "true" : "false"}
                onClick={() => setSlot("supplier")}
              >
                <span>
                  <strong className="block">Supplier-specific factor</strong>
                  <span className="text-[13px] text-[var(--muted)]">
                    {selectedFactor ? `${selectedFactor.factor} ${selectedFactor.unit} · ${selectedFactor.source}` : "Not selected"}
                  </span>
                </span>
              </button>
            ) : null}
            {needs.secondary ? (
              <button
                type="button"
                className="choice"
                data-on={slot === "secondary" ? "true" : "false"}
                onClick={() => setSlot("secondary")}
              >
                <span>
                  <strong className="block">Secondary factor</strong>
                  <span className="text-[13px] text-[var(--muted)]">
                    {selectedSecondary
                      ? `${selectedSecondary.factor} ${selectedSecondary.unit} · ${selectedSecondary.source}`
                      : "Not selected · pick a row in the table"}
                  </span>
                </span>
              </button>
            ) : null}
          </div>
        ) : null}
        <p className="mb-3 text-[13px] text-[var(--muted)]">
          {hybrid
            ? `Clicking a row binds it as the ${slot === "secondary" ? "secondary" : "supplier-specific"} factor.`
            : "Click a row to bind that factor to this item."}
        </p>
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
                onClick={() => bind(row.id)}
              >
                <td className="py-3">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name={`factor-${slot}-${selectedItem?.id ?? "item"}`}
                      checked={boundId === row.id}
                      onChange={() => bind(row.id)}
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
        {rows.length === 0 ? (
          <p className="mt-4 rounded-xl bg-[var(--surface-2)] px-4 py-3 text-[13px] text-[var(--muted)]">
            No factors in Payload match that search. Add or edit emission factors in the CMS admin.
          </p>
        ) : hybrid ? (
          <p className="mt-4 rounded-xl bg-[var(--surface-2)] px-4 py-3 text-[13px] text-[var(--muted)]">
            Supplier-specific: {selectedFactor ? `${selectedFactor.factor} ${selectedFactor.unit} · ${selectedFactor.source}` : "not selected"}.
            Secondary: {selectedSecondary ? `${selectedSecondary.factor} ${selectedSecondary.unit} · ${selectedSecondary.source}` : "not selected"}.
          </p>
        ) : selectedFactor ? (
          <p className="mt-4 rounded-xl bg-[var(--surface-2)] px-4 py-3 text-[13px] text-[var(--muted)]">
            Selected for {itemLabel(selectedItem?.values ?? {})}: {selectedFactor.factor} {selectedFactor.unit} · {selectedFactor.source} (
            {selectedFactor.year}) · {selectedFactor.region} · {selectedFactor.type}.
          </p>
        ) : (
          <p className="mt-4 rounded-xl bg-[var(--surface-2)] px-4 py-3 text-[13px] text-[var(--muted)]">
            Select a factor for this item. Emissions stay at zero until a factor is bound.
          </p>
        )}
      </div>
      <FooterNav
        back={`/activity?cat=${category.id}`}
        next="/activity"
        nextLabel="Save"
        canProceed={ready}
        onBlocked={() => setShowErrors(true)}
        onNext={() => markCategoryStep(category.id, "factors")}
      />
    </>
  );
}
