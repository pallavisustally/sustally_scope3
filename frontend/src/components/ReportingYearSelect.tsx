"use client";

import { reportingYearOptions, reportingYearStart } from "@/lib/reporting-year";

type ReportingYearSelectProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  invalid?: boolean;
  emptyLabel?: string;
};

export function ReportingYearSelect({
  id,
  value,
  onChange,
  required,
  invalid,
  emptyLabel = "Select year",
}: ReportingYearSelectProps) {
  const selected = reportingYearStart(value);
  return (
    <select
      id={id}
      value={selected}
      aria-invalid={invalid ? true : undefined}
      aria-required={required || undefined}
      onChange={(event) => onChange(event.target.value)}
    >
      <option value="">{emptyLabel}</option>
      {reportingYearOptions(value).map((year) => (
        <option key={year.value} value={year.value}>
          {year.label}
        </option>
      ))}
    </select>
  );
}
