"use client";

import { useRouter } from "next/navigation";
import { useInventory } from "@/components/InventoryProvider";
import { factorsForCategory, type EmissionFactor } from "@/data/protocol";
import { commuteModeLabel, factorsForCommuteItem } from "@/lib/commute-survey";
import { factorsForTravelItem } from "@/lib/business-travel";
import {
  CUSTOM_FACTOR_OPTION,
  factorOptionLabel,
} from "@/lib/custom-factor";
import { hybridFactorNeeds, methodNeedsFactor } from "@/lib/validate-activity";

export function ItemFactorSelect({
  categoryId,
  itemId,
  method,
  showErrors,
  compact,
}: {
  categoryId: number;
  itemId: string;
  method: string;
  showErrors?: boolean;
  compact?: boolean;
}) {
  const router = useRouter();
  const { state, factors, setItemFactor, setSecondaryFactor } = useInventory();
  const entry = state.entries[categoryId];
  const item = entry?.items.find((row) => row.id === itemId);
  if (!entry || !item || !methodNeedsFactor(categoryId, method)) return null;

  const catalog =
    categoryId === 7
      ? factorsForCommuteItem(method, item.values.mode || "", factors)
      : categoryId === 6
        ? factorsForTravelItem(method, item.values, factors)
        : factorsForCategory(categoryId, factors);
  const selectedId = item.factorId;
  const rows =
    selectedId && !catalog.some((row) => row.id === selectedId)
      ? [...catalog, ...factors.filter((row) => row.id === selectedId)]
      : catalog;
  const hybrid = method === "hybrid";
  const needs = hybrid ? hybridFactorNeeds(item) : { supplier: true, secondary: false };
  const openCustom = (slot: "supplier" | "secondary") => {
    router.push(`/activity/factors?cat=${categoryId}&item=${encodeURIComponent(itemId)}&slot=${slot}&custom=1`);
  };
  const factorLabel =
    categoryId === 7 && item.values.mode
      ? `Emission factor for ${commuteModeLabel(item.values.mode)}`
      : categoryId === 6 && item.values.mode
        ? `Emission factor for ${item.values.mode}`
        : hybrid
          ? "Supplier-specific emission factor"
          : "Emission factor";

  return (
    <div className="item-factor-block" data-compact={compact ? "true" : "false"}>
      {needs.supplier ? (
        <FactorDropdown
          id={`${itemId}-factor`}
          label={factorLabel}
          value={item.factorId}
          options={rows}
          compact={compact}
          invalid={Boolean(showErrors && !item.factorId)}
          onSelect={(factorId) => setItemFactor(categoryId, itemId, factorId)}
          onCustom={() => openCustom("supplier")}
        />
      ) : null}
      {needs.secondary ? (
        <FactorDropdown
          id={`${itemId}-secondary-factor`}
          label="Secondary emission factor"
          value={item.secondaryFactorId}
          options={rows}
          compact={compact}
          invalid={Boolean(showErrors && !item.secondaryFactorId)}
          onSelect={(factorId) => setSecondaryFactor(categoryId, itemId, factorId)}
          onCustom={() => openCustom("secondary")}
        />
      ) : null}
    </div>
  );
}

function FactorDropdown({
  id,
  label,
  value,
  options,
  compact,
  invalid,
  onSelect,
  onCustom,
}: {
  id: string;
  label: string;
  value: string;
  options: EmissionFactor[];
  compact?: boolean;
  invalid?: boolean;
  onSelect: (factorId: string) => void;
  onCustom: () => void;
}) {
  const selected = options.find((row) => row.id === value);
  return (
    <div className="field" data-invalid={invalid ? "true" : "false"}>
      <label htmlFor={id} className={compact ? "visually-hidden" : undefined}>
        {label}
        <span className="req" aria-hidden>
          *
        </span>
      </label>
      <select
        id={id}
        value={value}
        aria-invalid={invalid ? true : undefined}
        aria-required
        aria-label={compact ? label : undefined}
        onChange={(event) => {
          const next = event.target.value;
          if (next === CUSTOM_FACTOR_OPTION) {
            onCustom();
            return;
          }
          onSelect(next);
        }}
      >
        <option value="">Select emission factor</option>
        {options.map((row) => (
          <option key={row.id} value={row.id}>
            {factorOptionLabel(row, compact)}
          </option>
        ))}
        {value && !selected ? <option value={value}>{value}</option> : null}
        <option value={CUSTOM_FACTOR_OPTION}>Enter your own emission factor</option>
      </select>
      {invalid ? <p className="field-error">Select an emission factor, or enter your own.</p> : null}
    </div>
  );
}
