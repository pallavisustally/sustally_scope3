"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardYearChart } from "@/components/DashboardYearChart";
import { PageIntro } from "@/components/PageBits";
import { useInventory } from "@/components/InventoryProvider";
import { isBlankInventory, visibleRecords } from "@/lib/inventory-records";
import { formatTco2e } from "@/lib/numbers";
import { formatReportingYear } from "@/lib/reporting-year";

export function DashboardOverview() {
  const router = useRouter();
  const { state, results, savedInventories, ready, openInventory, newInventory } = useInventory();
  const [opening, setOpening] = useState<string | null>(null);
  const rows = visibleRecords(state, savedInventories, results.totalTco2e);
  const blank = isBlankInventory(state);
  const unusedDraft =
    Boolean(state.companyName.trim()) &&
    !state.year &&
    !Object.values(state.categories).some((value) => value === "included");

  const startNew = () => {
    if (blank || unusedDraft) {
      router.push("/company");
      return;
    }
    newInventory(state.companyName.trim() ? "next-year" : "blank");
    router.push("/company");
  };

  const visit = async (sessionKey: string) => {
    if (sessionKey !== state.sessionKey) {
      setOpening(sessionKey);
      await openInventory(sessionKey);
      setOpening(null);
    }
    router.push("/results");
  };

  if (!ready) {
    return (
      <>
        <PageIntro kicker="Dashboard" title="Reports" body="Loading saved reporting years." />
        <div className="panel collection-panel" aria-hidden="true">
          <div className="dash-table-head">
            <h3>Reports</h3>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageIntro
        kicker="Dashboard"
        title="Reports"
        body="Each row is a reporting year. Visit opens that report so you can move through company setup, categories, and results in the sidebar."
      />
      <div className="panel collection-panel">
        <div className="dash-table-head">
          <h3>Reports</h3>
          <button type="button" className="btn btn-primary" onClick={startNew}>
            New
          </button>
        </div>
        <div className="collection-scroll">
          <table className="collection-table dash-records">
            <thead>
              <tr>
                <th>Company</th>
                <th>Year</th>
                <th>Emissions</th>
                <th>Visit</th>
              </tr>
            </thead>
            <tbody>
              {rows.length ? (
                rows.map((row) => {
                  const current = row.sessionKey === state.sessionKey;
                  return (
                    <tr key={row.sessionKey} data-current={current ? "true" : "false"}>
                      <td>{row.name}</td>
                      <td>{row.year ? formatReportingYear(row.year) : "—"}</td>
                      <td className="dash-records-num">{formatTco2e(row.totalTco2e)} tCO₂e</td>
                      <td>
                        <button
                          type="button"
                          className="dash-visit"
                          disabled={opening === row.sessionKey}
                          onClick={() => void visit(row.sessionKey)}
                        >
                          {opening === row.sessionKey ? "Opening…" : "Visit"}
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={4} className="dash-records-empty">
                    No saved years yet. New starts a fresh report.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {rows.length ? <DashboardYearChart rows={rows} currentYear={state.year} /> : null}
      </div>
    </>
  );
}
