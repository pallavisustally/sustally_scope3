"use client";

import { FooterNav, PageIntro } from "@/components/PageBits";
import { useInventory } from "@/components/InventoryProvider";
import { formatReportingYear, REPORTING_YEARS } from "@/lib/reporting-year";

const INDUSTRIES = ["Manufacturing", "Energy", "Retail", "Technology", "Financial services", "Other"];

export default function CompanyPage() {
  const { state, setState } = useInventory();

  return (
    <>
      <PageIntro
        kicker="Step 2"
        title="Company setup"
        body="Provide company information, reporting year, and organizational boundary as defined in the GHG Protocol Corporate Standard. The same consolidation approach should be used across scopes 1, 2, and 3. Entries stay as you move between pages and reload from Payload after a refresh."
      />
      <div className="panel">
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <div className="field">
            <label htmlFor="company">Company name</label>
            <input
              id="company"
              value={state.companyName}
              placeholder="e.g. Acme Corporation"
              onChange={(e) => setState({ companyName: e.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="hq">Headquarters location</label>
            <input
              id="hq"
              value={state.hq}
              placeholder="e.g. Bengaluru, India"
              onChange={(e) => setState({ hq: e.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="industry">Industry</label>
            <select id="industry" value={state.industry} onChange={(e) => setState({ industry: e.target.value })}>
              <option value="">Select industry</option>
              {INDUSTRIES.map((industry) => (
                <option key={industry} value={industry}>
                  {industry}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="year">Reporting year</label>
            <select id="year" value={state.year} onChange={(e) => setState({ year: e.target.value })}>
              <option value="">Select year</option>
              {REPORTING_YEARS.map((year) => (
                <option key={year.value} value={year.value}>
                  {year.label}
                </option>
              ))}
              {state.year && !REPORTING_YEARS.some((year) => year.value === state.year) ? (
                <option value={state.year}>{formatReportingYear(state.year)}</option>
              ) : null}
            </select>
          </div>
        </div>
        <fieldset className="mt-6">
          <legend className="mb-3 text-[13px] font-semibold">Organizational boundary</legend>
          <div className="grid gap-3 md:grid-cols-3">
            {(
              [
                ["operational", "Operational control", "Account for 100% of emissions from operations you control."],
                ["financial", "Financial control", "Account for 100% of emissions from operations you financially control."],
                ["equity", "Equity share", "Account for emissions according to your share of equity."],
              ] as const
            ).map(([id, label, detail]) => (
              <button
                key={id}
                type="button"
                className="choice"
                data-on={state.boundary === id ? "true" : "false"}
                onClick={() => setState({ boundary: id })}
              >
                <span>
                  <strong className="block">{label}</strong>
                  <span className="text-[13px] text-[var(--muted)]">{detail}</span>
                </span>
              </button>
            ))}
          </div>
        </fieldset>
        <p className="mt-5 rounded-xl bg-[var(--surface-2)] px-4 py-3 text-[13px] text-[var(--muted)]">
          This choice defines which emissions fall under scopes 1, 2, and 3. Leased assets, investments, and franchises move between scopes depending on the approach.
        </p>
      </div>
      <FooterNav next="/categories" />
    </>
  );
}
