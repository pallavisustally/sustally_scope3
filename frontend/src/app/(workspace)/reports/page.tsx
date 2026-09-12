"use client";

import { useMemo, useState } from "react";
import { FooterNav, PageIntro } from "@/components/PageBits";
import { useInventory } from "@/components/InventoryProvider";
import { formatShare, formatTco2e } from "@/lib/numbers";
import { downloadInventoryReport, type ReportFormat } from "@/lib/report-export";

const INCLUDES = [
  "Executive summary",
  "Category-wise results",
  "Methodology and assumptions",
  "Data sources and emission factors",
  "Exclusions with justification",
  "Data quality assessment",
  "Percent of emissions from supplier data",
  "Biogenic CO₂ reported separately",
];

export default function ReportsPage() {
  const { state, results, pushNotice } = useInventory();
  const [checked, setChecked] = useState<string[]>(INCLUDES.slice(0, 6));
  const [format, setFormat] = useState<ReportFormat>("pdf");
  const [status, setStatus] = useState<"idle" | "working" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  const toggle = (item: string) => {
    setChecked((list) => (list.includes(item) ? list.filter((i) => i !== item) : [...list, item]));
  };

  const filename = useMemo(() => {
    const company = (state.companyName || "scope-3").replace(/[^\w]+/g, "-").replace(/^-|-$/g, "").toLowerCase();
    return `${company || "scope-3"}-${state.year || "inventory"}.${format}`;
  }, [format, state.companyName, state.year]);

  const generate = async () => {
    setStatus("working");
    setMessage("");
    try {
      let downloaded = false;
      const fileResponse = await fetch("/api/reports/file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state, results, format, includes: checked }),
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
          await downloadInventoryReport(state, results, format, checked);
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
          body: `${filename} was generated. Inventory data in this app is unchanged.`,
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
        body="Download a GHG Protocol-aligned PDF or Excel file from this inventory."
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
              <input id="ry" value={state.year} placeholder="Set on Company setup" readOnly />
            </div>
          </div>
          <p className="mt-6 text-[13px] font-semibold">Include</p>
          <ul className="mt-3 grid gap-2">
            {INCLUDES.map((item) => (
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
          <p className="text-[13px] text-[#d9d0f0]">{state.year ? `Reporting year ${state.year}` : "Reporting year not set"}</p>
          <p className="mt-6 text-[28px] font-semibold tracking-[-0.04em]">{formatTco2e(results.totalTco2e)}</p>
          <p className="text-[13px] text-[#d9d0f0]">tCO₂e calculated from entered data</p>
          <p className="mt-2 text-[13px] text-[#d9d0f0]">
            Biogenic {formatTco2e(results.biogenicTco2e)} tCO₂ reported separately · supplier share {formatShare(results.supplierSharePct)}
          </p>
          <p className="mt-8 text-[12px] text-[#c19dff]">File: {filename}</p>
        </aside>
      </div>
      <FooterNav back="/results" next="/dashboard" nextLabel="Back to dashboard" />
    </>
  );
}
