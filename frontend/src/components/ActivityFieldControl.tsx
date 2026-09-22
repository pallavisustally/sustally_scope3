"use client";

import { ReportingYearSelect } from "@/components/ReportingYearSelect";
import { isYearField, type ActivityField } from "@/data/fields";
import { isNumberField, isRequiredField } from "@/lib/validate-activity";

export function ActivityFieldControl({
  field,
  inputId,
  value,
  error,
  onChange,
}: {
  field: ActivityField;
  inputId: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  const required = isRequiredField(field);
  return (
    <div className={`field${field.wide ? " md:col-span-2" : ""}`} data-invalid={error ? "true" : "false"}>
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
      {isYearField(field) ? (
        <ReportingYearSelect
          id={inputId}
          value={value}
          required={required}
          invalid={Boolean(error)}
          onChange={onChange}
        />
      ) : field.type === "select" ? (
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
          type={field.id === "supplierEmail" ? "email" : "text"}
          value={value}
          placeholder={field.placeholder}
          inputMode={field.id === "supplierEmail" ? "email" : isNumberField(field) ? "decimal" : "text"}
          aria-invalid={error ? true : undefined}
          aria-required={required || undefined}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
      {error ? <p className="field-error">{error}</p> : null}
    </div>
  );
}
