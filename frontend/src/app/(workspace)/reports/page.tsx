"use client";

import { useMemo, useState } from "react";
import { FooterNav, PageIntro } from "@/components/PageBits";
import { useCurrentUser } from "@/components/CurrentUser";
import { useInventory } from "@/components/InventoryProvider";
import { formatShare, formatTco2e } from "@/lib/numbers";
import {
  BOUNDARY_COPY,
  downloadInventoryReport,
  REPORT_INCLUDES,
  type ReportFormat,
  type ReportOptions,
} from "@/lib/report-export";
import { formatReportingYear } from "@/lib/reporting-year";

export default function ReportsPage() {
  const user = useCurrentUser();
  const { state, results, savedInventories, pushNotice } = useInventory();
  const [checked, setChecked] = useState<string[]>([...REPORT_INCLUDES]);
  const [format, setFormat] = useState<ReportFormat>("pdf");
  const [status, setStatus] = useState<"idle" | "working" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  const preparedBy = [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() || user?.email || "";
  const boundary = BOUNDARY_COPY[state.boundary];

  const priorYears = useMemo(() => {
    const companyKey = state.companyName.trim().toLowerCase();
    const yearTotals = new Map<string, number>();
    for (const row of savedInventories) {
      if (!companyKey || row.name.trim().toLowerCase() !== companyKey || !row.year) continue;
      yearTotals.set(row.year, row.totalTco2e);
    }
    if (state.year) yearTotals.set(state.year, results.totalTco2e);
    return [...yearTotals.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([year, tco2e]) => ({ year, tco2e }));
  }, [results.totalTco2e, savedInventories, state.companyName, state.year]);

  const toggle = (item: string) => {
    setChecked((list) => (list.includes(item) ? list.filter((i) => i !== item) : [...list, item]));
  };

  const filename = useMemo(() => {
    const company = (state.companyName || "scope-3").replace(/[^\w]+/g, "-").replace(/^-|-$/g, "").toLowerCase();
    return `${company || "scope-3"}-${formatReportingYear(state.year) || "report"}.${format}`;
  }, [format, state.companyName, state.year]);

  const reportOptions = (): ReportOptions => ({
    preparedBy,
    generatedAt: new Date().toISOString(),
    priorYears,
  });

  const generate = async () => {
    setStatus("working");
    setMessage("");
    const options = reportOptions();
    try {
      let downloaded = false;
      const fileResponse = await fetch("/api/reports/file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state, results, format, includes: checked, options }),
      });
      if (fileResponse.ok) {
        const blob = await fileResponse.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 4000);
        downloaded = true;
      } else {
        try {
          await downloadInventoryReport(state, results, format, checked, options);
          downloaded = true;
        } catch {
          const failed = (await fileResponse.json().catch(() => ({}))) as { error?: string };
          throw new Error(failed.error || "Could not generate the report file.");
        }
      }
      if (!downloaded) throw new Error("Could not generate the report file.");

      const saved = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionKey: state.sessionKey,
          year: state.year ? Number(state.year) : null,
          format,
          includes: checked,
          totalTco2e: results.totalTco2e,
        }),
      });
      const payload = (await saved.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      setStatus("done");
      if (!saved.ok) {
        setMessage(`${filename} downloaded. The file is on your computer; a CMS record was not stored.`);
        pushNotice({
          id: "report-file",
          title: "Report downloaded",
          body: `${filename} was generated. Report data in this app is unchanged.`,
          href: "/reports",
          tone: "info",
        });
        return;
      }
      setMessage(`${filename} downloaded.`);
      pushNotice({
        id: "report-file",
        title: "Report generated",
        body: `${filename} downloaded${payload.ok ? " and a report record was saved." : "."}`,
        href: "/reports",
        tone: "ok",
      });
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Could not generate the report file.");
    }
  };

  return (
    <>
      <PageIntro
        kicker="Step 9"
        title="Generate report"
        body="Download a GHG Protocol-aligned PDF or Excel file. Cover page, boundary, methods, calculation working, and completeness are included unless you untick them."
      />
      <div className="workspace-split">
        <div className="panel">
          <div className="grid gap-5 md:grid-cols-2">
            <div className="field">
              <label htmlFor="type">Report type</label>
              <select id="type" defaultValue="scope3">
                <option value="scope3">Scope 3 emissions report</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="ry">Reporting year</label>
              <input id="ry" value={formatReportingYear(state.year)} placeholder="Set on Company setup" readOnly />
            </div>
          </div>
          <p className="mt-6 text-[13px] font-semibold">Include</p>
          <ul className="mt-3 grid gap-2">
            {REPORT_INCLUDES.map((item) => (
              <li key={item}>
                <label className="flex items-center gap-2 text-[14px]">
                  <input type="checkbox" checked={checked.includes(item)} onChange={() => toggle(item)} />
                  {item}
                </label>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-[13px] font-semibold">Report format</p>
          <div className="mt-3 flex gap-2">
            <button type="button" className={format === "pdf" ? "btn btn-primary" : "btn btn-ghost"} onClick={() => setFormat("pdf")}>
              PDF (detailed)
            </button>
            <button type="button" className={format === "xlsx" ? "btn btn-primary" : "btn btn-ghost"} onClick={() => setFormat("xlsx")}>
              Excel (data only)
            </button>
          </div>
          <button type="button" className="btn btn-primary mt-6" onClick={() => void generate()} disabled={status === "working"}>
            {status === "working" ? "Generating…" : `Download ${format === "pdf" ? "PDF" : "Excel"}`}
          </button>
          {message ? <p className="mt-3 text-[13px] text-[var(--muted)]">{message}</p> : null}
        </div>
        <aside className="panel bg-[linear-gradient(180deg,#1e1e1e,#171717)] text-[#f4f0ff]">
          <p className="text-[12px] uppercase tracking-[0.16em] text-[#c19dff]">Preview</p>
          <h3 className="mt-6 text-[22px] font-semibold leading-tight">Scope 3 Emissions Report</h3>
          <p className="mt-4 text-[13px] text-[#d9d0f0]">{state.companyName || "Company name not entered"}</p>
          <p className="text-[13px] text-[#d9d0f0]">{state.year ? `Reporting year ${formatReportingYear(state.year)}` : "Reporting year not set"}</p>
          <p className="text-[13px] text-[#d9d0f0]">{[state.industry, state.hq, boundary.label].filter(Boolean).join(" · ")}</p>
          <p className="mt-6 text-[28px] font-semibold tracking-[-0.04em]">{formatTco2e(results.totalTco2e)}</p>
          <p className="text-[13px] text-[#d9d0f0]">tCO₂e calculated from entered data</p>
          <p className="mt-2 text-[13px] text-[#d9d0f0]">
            {results.completeItems}/{results.totalItems || 0} items complete ({results.completenessPct}%) · verified supplier share{" "}
            {formatShare(results.supplierSharePct)}
          </p>
          {priorYears.length >= 2 ? (
            <p className="mt-2 text-[13px] text-[#d9d0f0]">
              {priorYears.length} reporting years available for comparison
            </p>
          ) : null}
          {preparedBy ? <p className="mt-4 text-[12px] text-[#c19dff]">Prepared by {preparedBy}</p> : null}
          <p className="mt-2 text-[12px] text-[#c19dff]">File: {filename}</p>
        </aside>
      </div>
      <FooterNav back="/results" next="/dashboard" nextLabel="Back to dashboard" />
    </>
  );
}
