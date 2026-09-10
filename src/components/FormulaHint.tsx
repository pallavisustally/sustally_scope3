"use client";

import { IconInfo } from "@/components/NavIcons";
import { CATEGORY_FORMULAS } from "@/data/formulas";
import { getCategory } from "@/data/protocol";

export function FormulaHint({ categoryId }: { categoryId: number }) {
  const category = getCategory(categoryId);
  const formula = CATEGORY_FORMULAS[categoryId];
  if (!formula) return null;

  return (
    <span className="formula-hint">
      <button
        type="button"
        className="formula-btn"
        aria-label={`Calculation formula for category ${category.id}, ${category.name}`}
        aria-describedby={`formula-${categoryId}`}
      >
        <IconInfo />
      </button>
      <span id={`formula-${categoryId}`} role="tooltip" className="formula-tip">
        <strong>Category {category.id} formula</strong>
        <em>{formula.headline}</em>
        <ul>
          {formula.methods.map((method) => (
            <li key={method.label}>
              <span>{method.label}</span>
              {method.formula}
            </li>
          ))}
        </ul>
      </span>
    </span>
  );
}
