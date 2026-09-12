"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CollectionTable } from "@/components/CollectionTable";
import { useInventory } from "@/components/InventoryProvider";
import { FooterNav, NoSelectedCategories, PageIntro } from "@/components/PageBits";
import { fieldsFor, itemLabel } from "@/data/fields";
import { includedCategories } from "@/data/protocol";
import {
  activityErrorSummary,
  activityHasErrors,
  isNumberField,
  isRequiredField,
  validateItemValues,
} from "@/lib/validate-activity";

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
  const { state, setActiveCategory, setCategoryMethod, updateItemValues, addItem, removeItem, markCategoryStep } = useInventory();
  const selected = includedCategories(state.categories);
  const [showErrors, setShowErrors] = useState(false);

  useEffect(() => {
    if (selected.some((row) => row.id === requestedId) && state.activeCategoryId !== requestedId) {
      setActiveCategory(requestedId);
    }
  }, [requestedId, selected, setActiveCategory, state.activeCategoryId]);

  const category = selected.find((row) => row.id === state.activeCategoryId) ?? selected.find((row) => row.id === requestedId) ?? selected[0];
  if (!category) return <NoSelectedCategories />;
  const entry = state.entries[category.id];
  if (!entry) return null;
  const fields = fieldsFor(category.id, entry.method);
  const itemErrors = entry.items.map((item) => validateItemValues(fields, item.values, entry.method));
  const hasErrors = activityHasErrors(category.id, entry.method, entry.items);
  const alerts = activityErrorSummary(category.id, entry.method, entry.items);

  return (
    <>
      <PageIntro
        kicker={`Category ${category.id}`}
        title={category.name}
        body="Fields marked with * are required for calculation. Example text in fields is a hint only. Next stays locked until required fields are valid."
      />
      <div className="panel">
        {showErrors && hasErrors ? (
          <div className="form-alert" role="alert">
            <p className="font-semibold">Fill every required field before continuing.</p>
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
                {fields.map((field) => {
                  const inputId = `${item.id}-${field.id}`;
                  const value = item.values[field.id] ?? "";
                  const error = showErrors ? itemErrors[index]?.[field.id] : undefined;
                  const required = isRequiredField(field);
                  const onChange = (next: string) => updateItemValues(category.id, item.id, { [field.id]: next });
                  return (
                    <div key={field.id} className={`field${field.wide ? " md:col-span-2" : ""}`} data-invalid={error ? "true" : "false"}>
                      <label htmlFor={inputId}>
                        {field.label}
                        {required ? (
                          <span className="req" aria-hidden>
                            *
                          </span>
                        ) : field.optional ? (
                          " (optional)"
                        ) : null}
                      </label>
                      {field.type === "select" ? (
                        <select
                          id={inputId}
                          value={value}
                          aria-invalid={error ? true : undefined}
                          aria-required={required || undefined}
                          onChange={(event) => onChange(event.target.value)}
                        >
                          <option value="">Select</option>
                          {field.options?.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      ) : field.type === "textarea" ? (
                        <textarea
                          id={inputId}
                          value={value}
                          placeholder={field.placeholder}
                          aria-invalid={error ? true : undefined}
                          aria-required={required || undefined}
                          onChange={(event) => onChange(event.target.value)}
                        />
                      ) : (
                        <input
                          id={inputId}
                          value={value}
                          placeholder={field.placeholder}
                          inputMode={isNumberField(field) ? "decimal" : "text"}
                          aria-invalid={error ? true : undefined}
                          aria-required={required || undefined}
                          onChange={(event) => onChange(event.target.value)}
                        />
                      )}
                      {error ? <p className="field-error">{error}</p> : null}
                    </div>
                  );
                })}
              </div>
            </article>
          ))}
        </div>
        <button type="button" className="btn btn-ghost mt-5" onClick={() => addItem(category.id)}>
          + Add another item
        </button>
      </div>
      <FooterNav
        back="/activity"
        next={`/activity/factors?cat=${category.id}`}
        canProceed={!hasErrors}
        onBlocked={() => {
          setShowErrors(true);
          document.querySelector(".form-alert, [data-invalid='true']")?.scrollIntoView({ behavior: "smooth", block: "center" });
        }}
        onNext={() => {
          markCategoryStep(category.id, "method");
          markCategoryStep(category.id, "activity");
        }}
      />
    </>
  );
}
