"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useInventory } from "@/components/InventoryProvider";
import { FooterNav, NoSelectedCategories, PageIntro } from "@/components/PageBits";
import { itemLabel } from "@/data/fields";
import { factorsForCategory, includedCategories } from "@/data/protocol";
import { factorsForCommuteItem } from "@/lib/commute-survey";
import { factorsForTravelItem } from "@/lib/business-travel";
import {
  customFactorId,
  customFactorKey,
  parseCustomFactor,
  serializeCustomFactor,
  type CustomFactorDraft,
} from "@/lib/custom-factor";
import { factorGaps, factorsReady, hybridFactorNeeds, methodNeedsFactor } from "@/lib/validate-activity";

export function emptyCustomFactorDraftFrom(current?: Partial<CustomFactorDraft>): CustomFactorDraft {
  return {
    factor: current?.factor ?? "",
    unit: current?.unit ?? "",
    source: current?.source ?? "",
    year: current?.year ?? "",
    region: current?.region ?? "",
    type: current?.type ?? "",
  };
}

export default function FactorsPage() {
  return (
    <Suspense>
      <FactorsPageInner />
    </Suspense>
  );
}

function FactorsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedId = Number(searchParams.get("cat"));
  const requestedItem = searchParams.get("item") || "";
  const requestedSlot = searchParams.get("slot") === "secondary" ? "secondary" : "supplier";
  const wantCustom = searchParams.get("custom") === "1";
  const { state, setActiveCategory, setItemFactor, setSecondaryFactor, factors, markCategoryStep } =
    useInventory();
  const included = includedCategories(state.categories);
  const category =
    included.find((row) => row.id === state.activeCategoryId) ?? included.find((row) => row.id === requestedId) ?? included[0];
  const entry = category ? state.entries[category.id] : undefined;
  const hybrid = entry?.method === "hybrid";
  const itemIds = entry?.items.map((item) => item.id).join(",") ?? "";
  const [itemId, setItemId] = useState(requestedItem || entry?.items[0]?.id || "");
  const [slot, setSlot] = useState<"supplier" | "secondary">(requestedSlot);
  const [query, setQuery] = useState("");
  const [showErrors, setShowErrors] = useState(false);
  const [draft, setDraft] = useState<CustomFactorDraft>(emptyCustomFactorDraftFrom());
  const [draftError, setDraftError] = useState("");

  useEffect(() => {
    if (Number.isFinite(requestedId) && included.some((row) => row.id === requestedId) && state.activeCategoryId !== requestedId) {
      setActiveCategory(requestedId);
    }
  }, [included, requestedId, setActiveCategory, state.activeCategoryId]);

  useEffect(() => {
    setItemId((current) => {
      if (requestedItem && itemIds.split(",").includes(requestedItem)) return requestedItem;
      return itemIds.split(",").includes(current) ? current : itemIds.split(",")[0] ?? "";
    });
  }, [itemIds, requestedItem]);

  useEffect(() => {
    setQuery("");
  }, [category?.id, itemId]);

  const selectedItem = entry?.items.find((item) => item.id === itemId) ?? entry?.items[0];
  const needs = selectedItem && hybrid ? hybridFactorNeeds(selectedItem) : { supplier: true, secondary: false };

  useEffect(() => {
    if (requestedSlot === "secondary" && needs.secondary) {
      setSlot("secondary");
      return;
    }
    if (!hybrid || !selectedItem) {
      setSlot("supplier");
      return;
    }
    if (needs.supplier && !selectedItem.factorId) setSlot("supplier");
    else if (needs.secondary && !selectedItem.secondaryFactorId) setSlot("secondary");
    else setSlot(needs.supplier ? "supplier" : "secondary");
  }, [category?.id, itemId, requestedSlot]);

  useEffect(() => {
    if (!selectedItem || !category) return;
    const existing = parseCustomFactor(
      selectedItem.values[customFactorKey(slot)],
      customFactorId(selectedItem.id, slot),
      category.id,
    );
    setDraft(
      emptyCustomFactorDraftFrom(
        existing
          ? {
              factor: existing.factor,
              unit: existing.unit,
              source: existing.source === "User-entered" ? "" : existing.source,
              year: existing.year,
              region: existing.region,
              type: existing.type === "Custom" ? "" : existing.type,
            }
          : undefined,
      ),
    );
    setDraftError("");
  }, [selectedItem?.id, slot, category?.id]);

  const rows = useMemo(() => {
    const list = category
      ? category.id === 7 && selectedItem
        ? factorsForCommuteItem(entry?.method || "", selectedItem.values.mode || "", factors)
        : category.id === 6 && selectedItem
          ? factorsForTravelItem(entry?.method || "", selectedItem.values, factors)
          : factorsForCategory(category.id, factors)
      : [];
    const needle = query.trim().toLowerCase();
    if (!needle) return list;
    return list.filter((row) =>
      [row.factor, row.unit, row.source, row.year, row.region, row.type].join(" ").toLowerCase().includes(needle),
    );
  }, [category, entry?.method, factors, query, selectedItem]);
  const selectedFactor = factors.find((row) => row.id === selectedItem?.factorId);
  const selectedSecondary = factors.find((row) => row.id === selectedItem?.secondaryFactorId);
  const categoryHref = category ? `/activity?cat=${category.id}` : "/activity";
  const bind = (factorId: string) => {
    if (!selectedItem || !category) return;
    if (hybrid && slot === "secondary") {
      setSecondaryFactor(category.id, selectedItem.id, factorId);
      return;
    }
    setItemFactor(category.id, selectedItem.id, factorId);
    if (hybrid && needs.secondary && !selectedItem.secondaryFactorId) setSlot("secondary");
  };
  const saveCustom = () => {
    if (!selectedItem || !category) return;
    if (!draft.factor.trim() || !draft.unit.trim()) {
      setDraftError("Enter a factor value and unit.");
      return;
    }
    const id = customFactorId(selectedItem.id, slot);
    const extra = { [customFactorKey(slot)]: serializeCustomFactor(draft) };
    if (hybrid && slot === "secondary") {
      setSecondaryFactor(category.id, selectedItem.id, id, extra);
    } else {
      setItemFactor(category.id, selectedItem.id, id, extra);
    }
    router.push(categoryHref);
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
        title={wantCustom ? "Enter your own emission factor" : "Select emission factors"}
        body={
          !needsBoundFactor
            ? "Investment-specific items allocate reported investee emissions by ownership share. No emission factor is required."
            : wantCustom
              ? "Enter the factor value and unit for this item, then save to return to the category. You can also pick a published factor from the table."
              : hybrid
                ? "Hybrid items need two factors: supplier-specific for the share with primary data, and a secondary factor for the remainder. Click a slot, then pick a row. Save stays locked until every required slot is filled."
                : "Bind a published factor to each activity item, or enter your own below. Save returns to the category."
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
            <select id="item" value={selectedItem?.id ?? ""} onChange={(event) => setItemId(event.target.value)}>
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
              <button type="button" className="choice" data-on={slot === "supplier" ? "true" : "false"} onClick={() => setSlot("supplier")}>
                <span>
                  <strong className="block">Supplier-specific factor</strong>
                  <span className="text-[13px] text-[var(--muted)]">
                    {selectedFactor ? `${selectedFactor.factor} ${selectedFactor.unit} · ${selectedFactor.source}` : "Not selected"}
                  </span>
                </span>
              </button>
            ) : null}
            {needs.secondary ? (
              <button type="button" className="choice" data-on={slot === "secondary" ? "true" : "false"} onClick={() => setSlot("secondary")}>
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

        {needsBoundFactor ? (
          <div className="custom-factor-form">
            <p className="mb-3 text-[13px] font-semibold">Enter your own emission factor</p>
            <div className="grid gap-5 md:grid-cols-2">
              <div className="field" data-invalid={draftError && !draft.factor.trim() ? "true" : "false"}>
                <label htmlFor="custom-factor">
                  Factor value
                  <span className="req" aria-hidden>
                    *
                  </span>
                </label>
                <input
                  id="custom-factor"
                  value={draft.factor}
                  inputMode="decimal"
                  placeholder="e.g. 1.90"
                  onChange={(event) => setDraft((current) => ({ ...current, factor: event.target.value }))}
                />
              </div>
              <div className="field" data-invalid={draftError && !draft.unit.trim() ? "true" : "false"}>
                <label htmlFor="custom-unit">
                  Unit
                  <span className="req" aria-hidden>
                    *
                  </span>
                </label>
                <input
                  id="custom-unit"
                  value={draft.unit}
                  placeholder="e.g. kg CO2e / kg"
                  onChange={(event) => setDraft((current) => ({ ...current, unit: event.target.value }))}
                />
              </div>
              <div className="field">
                <label htmlFor="custom-source">Source</label>
                <input
                  id="custom-source"
                  value={draft.source}
                  placeholder="e.g. Supplier, DEFRA, ecoinvent"
                  onChange={(event) => setDraft((current) => ({ ...current, source: event.target.value }))}
                />
              </div>
              <div className="field">
                <label htmlFor="custom-year">Year</label>
                <input
                  id="custom-year"
                  value={draft.year}
                  placeholder="e.g. 2024"
                  onChange={(event) => setDraft((current) => ({ ...current, year: event.target.value }))}
                />
              </div>
              <div className="field">
                <label htmlFor="custom-region">Region</label>
                <input
                  id="custom-region"
                  value={draft.region}
                  placeholder="e.g. India, Global"
                  onChange={(event) => setDraft((current) => ({ ...current, region: event.target.value }))}
                />
              </div>
              <div className="field">
                <label htmlFor="custom-type">Type</label>
                <input
                  id="custom-type"
                  value={draft.type}
                  placeholder="e.g. Cradle-to-gate"
                  onChange={(event) => setDraft((current) => ({ ...current, type: event.target.value }))}
                />
              </div>
            </div>
            {draftError ? <p className="field-error mt-3">{draftError}</p> : null}
            <button type="button" className="btn btn-primary mt-4" onClick={saveCustom}>
              Save this factor
            </button>
          </div>
        ) : null}

        <p className="mb-3 mt-6 text-[13px] text-[var(--muted)]">
          {hybrid
            ? `Clicking a row binds it as the ${slot === "secondary" ? "secondary" : "supplier-specific"} factor.`
            : "Click a row to bind that published factor to this item."}
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
              <tr key={row.id} className="cursor-pointer border-t border-[var(--line)]" onClick={() => bind(row.id)}>
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
            No factors in Payload match that search. Enter your own above, or add emission factors in the CMS admin.
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
            Select a factor for this item, or enter your own. Emissions stay at zero until a factor is bound.
          </p>
        )}
      </div>
      <FooterNav
        back={categoryHref}
        next={categoryHref}
        nextLabel="Save"
        canProceed={ready}
        onBlocked={() => setShowErrors(true)}
        onNext={() => markCategoryStep(category.id, "factors")}
      />
    </>
  );
}
