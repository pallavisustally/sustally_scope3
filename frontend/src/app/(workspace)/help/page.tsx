import Link from "next/link";
import { PageIntro } from "@/components/PageBits";
import { SCOPE3_CATEGORIES } from "@/data/protocol";

const STEPS = [
  {
    href: "/dashboard",
    label: "Dashboard",
    detail: "Each row is a company and reporting year. New starts another report. Visit opens that year so you can move through setup, collection, and results.",
  },
  {
    href: "/company",
    label: "Company setup",
    detail: "Name, headquarters, industry, reporting year, and organizational boundary. Use the same consolidation approach across scopes 1, 2, and 3.",
  },
  {
    href: "/categories",
    label: "Scope 3 categories",
    detail: "The Standard asks companies to account for all 15 categories. Include every category that applies. Categories you include appear under Data collection.",
  },
  {
    href: "/activity",
    label: "Data collection",
    detail: "Open a category, pick a calculation method, enter activity data, and choose an emission factor on each item. Category 6 requires travel mode. Category 7 (employee commuting) has its own survey steps — see How to fill Category 7 below. For supplier-specific or hybrid rows, add an optional supplier email and send a confirmation.",
  },
  {
    href: "/activity/review",
    label: "Review",
    detail: "Check methods, inputs, and factors together. The same engine as Results runs here: activity data × emission factor, converted to tCO₂e.",
  },
  {
    href: "/results",
    label: "Results",
    detail: "Category totals, charts, and calculation working. Incomplete items stay at 0 until required fields and a factor are present.",
  },
  {
    href: "/reports",
    label: "Reports",
    detail: "Download PDF or Excel with the sections you tick: boundary, methods, calculation working, completeness, exclusions, data quality, and category results.",
  },
];

const QUESTIONS = [
  {
    q: "How does supplier confirmation work?",
    a: "The company person still enters the data. Add the supplier email on that row (optional), then send a confirmation. The supplier opens a link with no login, accepts the figures or edits them, and confirms. The item then shows Verified by supplier. Only verified rows use the supplier share and the high reliability score in Results and Reports.",
  },
  {
    q: "How does the commuting survey work?",
    a: "Open Category 7 under Data collection. Choose a calculation method first. Distance-based then asks for a survey link or totals you enter. After you apply survey responses, choose how to treat employees who did not respond, then save. The full walkthrough is in How to fill Category 7 on this page.",
  },
  {
    q: "Why is Next locked on an activity form?",
    a: "A required field is empty or not a valid number, or the selected method still needs an emission factor. Example text in fields is a hint only. Fill the marked fields, then try again.",
  },
  {
    q: "A year shows 0 tCO₂e on the dashboard. Is that a bug?",
    a: "No. The total is 0 until that report has activity data and factors that can calculate. Open Visit, complete data collection, then return to the dashboard. Year comparison still plots the 0 so you can see the gap.",
  },
  {
    q: "Where did an earlier reporting year go?",
    a: "Open Dashboard. Saved years are the table rows, not the sidebar. Visit loads that report. Refreshing this tab restores the current session. Closing the tab starts a fresh report.",
  },
  {
    q: "Do I need to include all 15 categories?",
    a: "The Scope 3 Standard requires accounting for all 15. Include every category that applies to the company. If a category is not applicable, leave it unselected and record the reason in the report exclusions section.",
  },
  {
    q: "Which calculation method should I pick?",
    a: "Prefer supplier-specific data when you have it, then ask the supplier to confirm. Hybrid fills gaps with secondary data. Average-data uses physical quantities. Spend-based uses economic value and EEIO factors and scores lower on data quality. Each category lists the methods the Technical Guidance allows.",
  },
  {
    q: "Where do I change the theme?",
    a: "Open Settings and pick Dark or Light. The choice stays on this device.",
  },
];

const SOURCES = [
  {
    title: "Corporate Value Chain (Scope 3) Standard",
    href: "https://ghgprotocol.org/corporate-value-chain-scope-3-standard",
    detail: "Principles, organizational boundary, the 15 categories, exclusions, data quality, and public reporting requirements.",
  },
  {
    title: "Technical Guidance for Calculating Scope 3 Emissions",
    href: "https://ghgprotocol.org/scope-3-calculation-guidance-2",
    detail: "Decision trees, activity data, emission factors, and formulas for each category. Results in this app use the data entered in the forms.",
  },
  {
    title: "Corporate Accounting and Reporting Standard",
    href: "https://ghgprotocol.org/corporate-standard",
    detail: "Defines operational control, financial control, and equity share. Company setup uses the same boundary language.",
  },
];

export default function HelpPage() {
  const upstream = SCOPE3_CATEGORIES.filter((category) => category.stream === "upstream");
  const downstream = SCOPE3_CATEGORIES.filter((category) => category.stream === "downstream");

  return (
    <>
      <PageIntro
        kicker="Support"
        title="Help and support"
        body="How to complete a Scope 3 report in this workspace, how years are stored, and which GHG Protocol documents the calculations follow."
      />

      <section className="panel help-flow">
        <h3>Complete a report</h3>
        <p className="help-lede">Work top to bottom. You can leave a page and come back; entries stay on the report you have open.</p>
        <ol>
          {STEPS.map((step, index) => (
            <li key={step.href}>
              <span className="help-step" aria-hidden>
                {index + 1}
              </span>
              <div>
                <Link href={step.href} className="help-link">
                  {step.label}
                </Link>
                <p>{step.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section id="category-6" className="panel help-flow help-cat7">
        <h3>How to fill Category 6 · Business travel</h3>
        <p className="help-lede">
          Open{" "}
          <Link href="/activity?cat=6" className="help-link">
            Business travel
          </Link>{" "}
          from Selected categories. Use one row per travel mode. Travel mode is required. The emission factor follows the mode.
          Air also needs haul length and cabin class. Hotel stays are not a travel mode; add a separate item if you quantify
          overnight accommodation.
        </p>
        <ol>
          <li>
            <span className="help-step" aria-hidden>
              1
            </span>
            <div>
              <p className="help-cat7-title">Calculation method</p>
              <p>Fuel-based uses fuel by mode. Distance-based uses passenger-km or km by mode. Spend-based uses amount spent by mode.</p>
            </div>
          </li>
          <li>
            <span className="help-step" aria-hidden>
              2
            </span>
            <div>
              <p className="help-cat7-title">Travel mode</p>
              <p>Choose Air, Rail, Car, Bus, Taxi, or Ferry. Add another item for another mode.</p>
            </div>
          </li>
          <li>
            <span className="help-step" aria-hidden>
              3
            </span>
            <div>
              <p className="help-cat7-title">Air haul and cabin</p>
              <p>
                For flights, haul length (domestic, short-haul, long-haul) and cabin class are required. Other modes hide those
                fields.
              </p>
            </div>
          </li>
        </ol>
      </section>

      <section id="category-7" className="panel help-flow help-cat7">
        <h3>How to fill Category 7 · Employee commuting</h3>
        <p className="help-lede">
          Open{" "}
          <Link href="/activity?cat=7" className="help-link">
            Employee commuting
          </Link>{" "}
          from Selected categories. Start with a calculation method. Fuel-based is the default. Distance-based can use a survey or totals you enter. Survey responses are grouped by travelling mode, and each mode has its own emission factor.
        </p>
        <ol>
          <li>
            <span className="help-step" aria-hidden>
              1
            </span>
            <div>
              <p className="help-cat7-title">Calculation method</p>
              <p>
                Fuel-based is selected by default and opens the fuel form. Distance-based then asks whether to use a survey
                link or enter commuting totals yourself. Average-data uses headcount.
              </p>
            </div>
          </li>
          <li>
            <span className="help-step" aria-hidden>
              1
            </span>
            <div>
              <p className="help-cat7-title">Survey link · Employee commuting survey</p>
              <p>
                After Distance-based and Survey link, create a campaign and share the anonymous link. Responses do not change
                the inventory until you apply them.
              </p>
            </div>
          </li>
          <li>
            <span className="help-step" aria-hidden>
              2
            </span>
            <div>
              <p className="help-cat7-title">Survey data applied</p>
              <p>
                Applied survey rows stay read-only except for the emission factor. This table shows the actual responses and
                the tCO₂e from those responses only. Each mode is given a DEFRA commuting factor by default; you can change
                it on that row.
              </p>
            </div>
          </li>
          <li>
            <span className="help-step" aria-hidden>
              3
            </span>
            <div>
              <p className="help-cat7-title">Employees who did not respond</p>
              <p>
                This step is enabled only when some employees have not responded. None of the three options is selected
                until you choose. Apply proportionally scales employees in a mode = total employees × (mode responses ÷ all
                responses). One-way km and commuting days stay the respondent averages. Then CO₂e = employees × commuting
                days × 2 × one-way km × emission factor. You can instead enter remaining groups manually, or continue with
                the given responses only. Step 2 always shows the actual survey results. If everyone has responded, this
                step stays closed and only the given responses are used.
              </p>
            </div>
          </li>
          <li>
            <span className="help-step" aria-hidden>
              4
            </span>
            <div>
              <p className="help-cat7-title">Save and continue</p>
              <p>
                Save returns to the selected categories list. Confirm the emission factor on each travel-mode group, or choose Enter your own emission factor. Calculation uses that factor × passenger-km (employees × commuting days × 2 × one-way km).
              </p>
            </div>
          </li>
        </ol>
      </section>

      <section className="help-facts">
        <article>
          <h3>Years on the dashboard</h3>
          <ul>
            <li>New copies company details and starts a blank reporting year.</li>
            <li>Visit opens that year in Company setup, categories, collection, and results.</li>
            <li>Year comparison under the table plots every year you have entered, including zeros.</li>
            <li>Closing the browser tab starts a fresh report. Refreshing the same tab restores the session.</li>
          </ul>
        </article>
        <article>
          <h3>How a total is calculated</h3>
          <p>
            Each complete item is activity data × emission factor, converted to tCO₂e. Spend-based items convert currency when the factor is in another currency. Supplier-specific methods score higher on data quality than spend-based. Incomplete items do not add to the total.
          </p>
          <p>
            Theme lives in{" "}
            <Link href="/settings" className="help-link">Settings</Link>.
          </p>
        </article>
      </section>

      <section className="panel help-sources">
        <h3>GHG Protocol sources</h3>
        <ul>
          {SOURCES.map((source) => (
            <li key={source.href}>
              <div>
                <p>{source.title}</p>
                <span>{source.detail}</span>
              </div>
              <a className="help-ext" href={source.href} target="_blank" rel="noreferrer">
                Open
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section className="help-cats">
        <h3>The 15 categories</h3>
        <div>
          <div>
            <p>Upstream 1–8</p>
            <ol>
              {upstream.map((category) => (
                <li key={category.id}>
                  <em>{category.id}</em>
                  {category.name}
                </li>
              ))}
            </ol>
          </div>
          <div>
            <p>Downstream 9–15</p>
            <ol>
              {downstream.map((category) => (
                <li key={category.id}>
                  <em>{category.id}</em>
                  {category.name}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="help-faq">
        <h3>Common questions</h3>
        {QUESTIONS.map((item) => (
          <details key={item.q}>
            <summary>{item.q}</summary>
            <p>{item.a}</p>
          </details>
        ))}
      </section>
    </>
  );
}
