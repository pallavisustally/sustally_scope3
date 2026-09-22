"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ActivityFieldControl } from "@/components/ActivityFieldControl";
import { Category7Flow } from "@/components/Category7Flow";
import { CollectionTable } from "@/components/CollectionTable";
import { ItemFactorSelect } from "@/components/ItemFactorSelect";
import { SupplierVerifyActions } from "@/components/SupplierVerifyActions";
import { useInventory } from "@/components/InventoryProvider";
import { FooterNav, NoSelectedCategories, PageIntro } from "@/components/PageBits";
import { fieldsFor, itemLabel } from "@/data/fields";
import { includedCategories } from "@/data/protocol";
import { travelFactorIdFor } from "@/lib/business-travel";
import { activityErrorSummary, activityHasErrors, factorGaps, factorsReady, validateItemValues } from "@/lib/validate-activity";

export default function ActivityPage() {
  return (
    <Suspense>
      <ActivityPageInner />
    </Suspense>
  );
}

function ActivityPageInner() {
  const searchParams = useSearchParams();
  const cat = Number(searchParams.get("cat"));
  if (Number.isFinite(cat) && cat > 0) return <ActivityForm requestedId={cat} />;
  return <CollectionTable />;
}

function ActivityForm({ requestedId }: { requestedId: number }) {
  const { state, setActiveCategory, setCategoryMethod, setItemFactor, updateItemValues, addItem, removeItem, markCategoryStep } =
    useInventory();
  const selected = includedCategories(state.categories);
  const [showErrors, setShowErrors] = useState(false);

  useEffect(() => {
    if (selected.some((row) => row.id === requestedId) && state.activeCategoryId !== requestedId) {
      setActiveCategory(requestedId);
    }
  }, [requestedId, selected, setActiveCategory, state.activeCategoryId]);

  useEffect(() => {
    const current = state.entries[requestedId];
    if (requestedId !== 6 || !current) return;
    for (const item of current.items) {
      if (item.factorId || !item.values.mode?.trim()) continue;
      const factorId = travelFactorIdFor({
        method: current.method,
        mode: item.values.mode,
        haulLength: item.values.haulLength,
        cabinClass: item.values.cabinClass,
        fuelType: item.values.fuelType,
      });
      if (factorId) setItemFactor(6, item.id, factorId);
    }
  }, [requestedId, setItemFactor, state.entries]);

  if (requestedId === 7) return <Category7Flow />;

  const category = selected.find((row) => row.id === state.activeCategoryId) ?? selected.find((row) => row.id === requestedId) ?? selected[0];
  if (!category) return <NoSelectedCategories />;
  const entry = state.entries[category.id];
  if (!entry) return null;
  const itemErrors = entry.items.map((item) =>
    validateItemValues(fieldsFor(category.id, entry.method, item.values), item.values, entry.method),
  );
  const hasErrors = activityHasErrors(category.id, entry.method, entry.items);
  const alerts = [
    ...activityErrorSummary(category.id, entry.method, entry.items),
    ...(showErrors ? factorGaps(entry, category.id) : []),
  ];
  const readyFactors = factorsReady(entry, category.id);

  return (
    <>
      <PageIntro
        kicker={`Category ${category.id}`}
        title={category.name}
        body={
          category.id === 6
            ? "Travel mode is required. Distance-based air travel also needs haul length and cabin class. The emission factor follows the mode, or you can enter your own."
            : "Fields marked with * are required for calculation. Example text in fields is a hint only. Choose an emission factor on each item, or enter your own. Save stays locked until required fields and a factor are valid. For supplier-specific or hybrid data, add a supplier email to send a confirmation."
        }
      />
      <div className="panel">
        {showErrors && (hasErrors || !readyFactors) ? (
          <div className="form-alert" role="alert">
            <p className="font-semibold">Fill every required field and select an emission factor before continuing.</p>
            <ul>
              {alerts.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        ) : null}
        <p className="mb-3 text-[13px] font-semibold">Calculation method</p>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {category.methods.map((method) => (
            <button
              key={method.id}
              type="button"
              className="choice"
              data-on={entry.method === method.id ? "true" : "false"}
              onClick={() => setCategoryMethod(category.id, method.id)}
            >
              <span>
                <strong className="block">{method.label}</strong>
                <span className="text-[13px] text-[var(--muted)]">{method.detail}</span>
              </span>
            </button>
          ))}
        </div>
        <div className="item-stack">
          {entry.items.map((item, index) => (
            <article key={item.id} className="item-card">
              <div className="item-card-head">
                <p className="text-[13px] font-semibold">
                  Item {index + 1}
                  <span className="ml-2 font-normal text-[var(--muted)]">{itemLabel(item.values)}</span>
                </p>
                {entry.items.length > 1 ? (
                  <button type="button" className="btn btn-ghost cat-chip" onClick={() => removeItem(category.id, item.id)}>
                    Remove
                  </button>
                ) : null}
              </div>
              <div className="grid gap-5 md:grid-cols-2">
                {fieldsFor(category.id, entry.method, item.values).map((field) => {
                  const inputId = `${item.id}-${field.id}`;
                  const value = item.values[field.id] ?? "";
                  const error = showErrors ? itemErrors[index]?.[field.id] : undefined;
                  const onChange = (next: string) => {
                    updateItemValues(category.id, item.id, { [field.id]: next });
                    if (category.id !== 6 || !["mode", "haulLength", "cabinClass", "fuelType"].includes(field.id)) return;
                    const factorId = travelFactorIdFor({
                      method: entry.method,
                      mode: field.id === "mode" ? next : item.values.mode,
                      haulLength: field.id === "haulLength" ? next : item.values.haulLength,
                      cabinClass: field.id === "cabinClass" ? next : item.values.cabinClass,
                      fuelType: field.id === "fuelType" ? next : item.values.fuelType,
                    });
                    if (factorId) setItemFactor(category.id, item.id, factorId);
                  };
                  return (
                    <ActivityFieldControl
                      key={field.id}
                      field={field}
                      inputId={inputId}
                      value={value}
                      error={error}
                      onChange={onChange}
                    />
                  );
                })}
              </div>
              <ItemFactorSelect categoryId={category.id} itemId={item.id} method={entry.method} showErrors={showErrors} />
              <SupplierVerifyActions categoryId={category.id} itemId={item.id} method={entry.method} />
            </article>
          ))}
        </div>
        <button type="button" className="btn btn-ghost mt-5" onClick={() => addItem(category.id)}>
          + Add another item
        </button>
      </div>
      <FooterNav
        back="/activity"
        next="/activity"
        nextLabel="Save"
        canProceed={!hasErrors && readyFactors}
        onBlocked={() => {
          setShowErrors(true);
          document.querySelector(".form-alert, [data-invalid='true']")?.scrollIntoView({ behavior: "smooth", block: "center" });
        }}
        onNext={() => {
          markCategoryStep(category.id, "method");
          markCategoryStep(category.id, "activity");
          markCategoryStep(category.id, "factors");
        }}
      />
    </>
  );
}
