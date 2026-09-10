"use client";

import { useState } from "react";
import { FooterNav, PageIntro } from "@/components/PageBits";
import { useInventory } from "@/components/InventoryProvider";

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
  const { state } = useInventory();
  const [checked, setChecked] = useState<string[]>(INCLUDES.slice(0, 6));
  const [format, setFormat] = useState("pdf");

  const toggle = (item: string) => {
    setChecked((list) => (list.includes(item) ? list.filter((i) => i !== item) : [...list, item]));
  };

  return (
    <>
      <PageIntro
        kicker="Step 9"
        title="Generate report"
        body="Create a GHG Protocol-aligned report outline. Required public report contents from Chapter 11 are listed as include options. Download is not wired in this shell."
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
              <input id="ry" value={state.year} readOnly />
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
        </div>
        <aside className="panel bg-[linear-gradient(180deg,#1e1e1e,#171717)] text-[#f4f0ff]">
          <p className="text-[12px] uppercase tracking-[0.16em] text-[#c19dff]">Preview</p>
          <h3 className="mt-6 text-[22px] font-semibold leading-tight">Scope 3 Emissions Report</h3>
          <p className="mt-4 text-[13px] text-[#d9d0f0]">{state.companyName}</p>
          <p className="text-[13px] text-[#d9d0f0]">Reporting year {state.year}</p>
          <p className="mt-8 text-[12px] text-[#c19dff]">GHG Protocol aligned outline</p>
        </aside>
      </div>
      <FooterNav back="/results" next="/dashboard" nextLabel="Generate report" />
    </>
  );
}
