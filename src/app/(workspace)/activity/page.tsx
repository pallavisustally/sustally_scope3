"use client";

import { CategoryPicker } from "@/components/CategoryPicker";
import { useInventory } from "@/components/InventoryProvider";
import { FooterNav, PageIntro } from "@/components/PageBits";
import { fieldsFor, itemLabel } from "@/data/fields";
import { getCategory } from "@/data/protocol";

export default function ActivityPage() {
  const { state, setCategoryMethod, updateItemValues, addItem, removeItem } = useInventory();
  const category = getCategory(state.activeCategoryId);
  const entry = state.entries[category.id];
  const status = state.categories[category.id];
  if (!entry) return null;
  const fields = fieldsFor(category.id, entry.method);

  return (
    <>
      <PageIntro
        kicker={`Category ${category.id}`}
        title={category.name}
        body="Enter activity data for each category. Fields follow the selected calculation method. Only included categories are used in the inventory; forms for the rest stay available if you later include them."
      />
      <CategoryPicker />
      <div className="panel">
        {status !== "included" ? (
          <p className="mb-5 rounded-xl bg-[var(--surface-2)] px-4 py-3 text-[13px] text-[var(--muted)]">
            This category is marked {status === "not_applicable" ? "not applicable" : "excluded"}
            {state.justifications[category.id] ? `: ${state.justifications[category.id]}` : "."} You can still record
            activity data here if the status changes.
          </p>
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
                  const onChange = (next: string) => updateItemValues(category.id, item.id, { [field.id]: next });
                  return (
                    <div key={field.id} className={`field${field.wide ? " md:col-span-2" : ""}`}>
                      <label htmlFor={inputId}>
                        {field.label}
                        {field.optional ? " (optional)" : null}
                      </label>
                      {field.type === "select" ? (
                        <select id={inputId} value={value} onChange={(event) => onChange(event.target.value)}>
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
                          onChange={(event) => onChange(event.target.value)}
                        />
                      ) : (
                        <input
                          id={inputId}
                          value={value}
                          placeholder={field.placeholder}
                          onChange={(event) => onChange(event.target.value)}
                        />
                      )}
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
      <FooterNav back="/categories" next="/activity/method" />
    </>
  );
}
