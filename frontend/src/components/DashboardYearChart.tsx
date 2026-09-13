import type { SavedInventorySummary } from "@/lib/collections-map";
import { formatShare, formatTco2e } from "@/lib/numbers";
import { formatReportingYear } from "@/lib/reporting-year";

const COMPANY_COLORS = [
  "var(--brand)",
  "var(--result)",
  "oklch(66% 0.14 230)",
  "oklch(72% 0.14 75)",
  "oklch(64% 0.16 25)",
];

const YEAR_COLORS = [
  "oklch(62% 0.22 305)",
  "oklch(66% 0.14 230)",
  "oklch(68% 0.13 175)",
  "oklch(72% 0.14 75)",
  "oklch(64% 0.16 25)",
];

type YearPart = { name: string; tco2e: number; color: string };
type YearStack = { year: string; total: number; parts: YearPart[] };

function colorFor(name: string, names: string[]) {
  const index = Math.max(0, names.indexOf(name));
  return COMPANY_COLORS[index % COMPANY_COLORS.length];
}

function polar(cx: number, cy: number, r: number, angle: number) {
  return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)] as const;
}

function donutPath(cx: number, cy: number, inner: number, outer: number, start: number, end: number) {
  const large = end - start > Math.PI ? 1 : 0;
  const [sx, sy] = polar(cx, cy, outer, start);
  const [ex, ey] = polar(cx, cy, outer, end);
  const [ix, iy] = polar(cx, cy, inner, end);
  const [jx, jy] = polar(cx, cy, inner, start);
  return `M ${sx} ${sy} A ${outer} ${outer} 0 ${large} 1 ${ex} ${ey} L ${ix} ${iy} A ${inner} ${inner} 0 ${large} 0 ${jx} ${jy} Z`;
}

function stacksFrom(rows: SavedInventorySummary[]): YearStack[] {
  const names = [...new Set(rows.map((row) => row.name))];
  const byYear = new Map<string, SavedInventorySummary[]>();
  for (const row of rows) {
    const year = row.year || "No year";
    const list = byYear.get(year) ?? [];
    list.push(row);
    byYear.set(year, list);
  }
  return [...byYear.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([year, items]) => ({
      year,
      total: items.reduce((sum, item) => sum + item.totalTco2e, 0),
      parts: items.map((item) => ({
        name: item.name,
        tco2e: item.totalTco2e,
        color: colorFor(item.name, names),
      })),
    }));
}

function insightFor(stacks: YearStack[]) {
  const withData = stacks.filter((stack) => stack.total > 0);
  if (!withData.length) {
    return "No calculated emissions yet. Visit a year and enter activity data to plot the comparison.";
  }
  if (withData.length === 1) {
    return `${formatReportingYear(withData[0].year)} is the only year with calculated emissions (${formatTco2e(withData[0].total)} tCO₂e).`;
  }
  const first = withData[0];
  const last = withData[withData.length - 1];
  if (first.total <= 0) {
    return `${formatReportingYear(last.year)} is ${formatTco2e(last.total)} tCO₂e. Earlier years are still at 0.`;
  }
  const change = ((last.total - first.total) / first.total) * 100;
  const direction = change > 0 ? "higher" : change < 0 ? "lower" : "unchanged";
  const amount = change === 0 ? "" : ` (${formatShare(Math.abs(change))})`;
  return `${formatReportingYear(last.year)} is ${direction} than ${formatReportingYear(first.year)}${amount}: ${formatTco2e(last.total)} tCO₂e vs ${formatTco2e(first.total)} tCO₂e.`;
}

export function DashboardYearChart({
  rows,
  currentYear,
}: {
  rows: SavedInventorySummary[];
  currentYear?: string;
}) {
  const stacks = stacksFrom(rows);
  if (!stacks.length) return null;
  const max = Math.max(...stacks.map((stack) => stack.total), 0);
  const names = [...new Set(rows.map((row) => row.name))];
  const stacked = names.length > 1;
  const grand = stacks.reduce((sum, stack) => sum + stack.total, 0);
  const pieYears = stacks.filter((stack) => stack.total > 0);
  const cx = 72;
  const cy = 72;
  let angle = -Math.PI / 2;
  const arcs = pieYears.map((stack) => {
    const index = stacks.findIndex((item) => item.year === stack.year);
    const sweep = grand > 0 ? (stack.total / grand) * Math.PI * 2 : 0;
    const start = angle;
    const end = angle + Math.max(sweep, 0.01);
    angle = end;
    return { ...stack, start, end, color: YEAR_COLORS[index % YEAR_COLORS.length] };
  });

  return (
    <div className="dash-analysis">
      <h3>Year comparison</h3>
      <p className="dash-analysis-copy">{insightFor(stacks)}</p>
      <div className="dash-analysis-charts">
        <div className="dash-year-cols" role="img" aria-label="Emissions by reporting year">
          {stacks.map((stack, index) => {
            const height = max > 0 ? Math.max((stack.total / max) * 100, stack.total > 0 ? 4 : 0) : 0;
            const yearColor = YEAR_COLORS[index % YEAR_COLORS.length];
            const current = Boolean(currentYear) && stack.year === currentYear;
            return (
              <div key={stack.year} className="dash-year-col" data-current={current ? "true" : "false"}>
                <span className="dash-year-val">{formatTco2e(stack.total)}</span>
                <div className="dash-year-track" title={`${formatReportingYear(stack.year)}: ${formatTco2e(stack.total)} tCO₂e`}>
                  <span
                    className="dash-year-fill"
                    style={{
                      height: `${height}%`,
                      background: stacked ? "transparent" : yearColor,
                    }}
                  >
                    {stacked
                      ? stack.parts.map((part) => {
                          const share = stack.total > 0 ? (part.tco2e / stack.total) * 100 : 0;
                          if (share <= 0) return null;
                          return <span key={part.name} style={{ flexGrow: share, background: part.color }} />;
                        })
                      : null}
                  </span>
                </div>
                <span className="dash-year-label">{formatReportingYear(stack.year)}</span>
              </div>
            );
          })}
        </div>
        {pieYears.length > 1 ? (
          <div className="dash-year-pie-wrap">
            <svg viewBox="0 0 144 144" className="dash-year-pie" role="img" aria-label="Share of emissions by year">
              {arcs.map((slice) => (
                <path key={slice.year} d={donutPath(cx, cy, 38, 68, slice.start, slice.end)} fill={slice.color}>
                  <title>
                    {formatReportingYear(slice.year)}: {formatTco2e(slice.total)} tCO₂e ({formatShare(grand > 0 ? (slice.total / grand) * 100 : 0)})
                  </title>
                </path>
              ))}
              <circle cx={cx} cy={cy} r="32" fill="var(--surface)" />
              <text x={cx} y={cy - 2} textAnchor="middle" className="dash-year-pie-total">
                {formatTco2e(grand)}
              </text>
              <text x={cx} y={cy + 14} textAnchor="middle" className="dash-year-pie-unit">
                tCO₂e
              </text>
            </svg>
            <ul className="dash-year-legend">
              {arcs.map((slice) => (
                <li key={slice.year}>
                  <span style={{ background: slice.color }} />
                  <em>{formatReportingYear(slice.year)}</em>
                  <strong>{formatShare(grand > 0 ? (slice.total / grand) * 100 : 0)}</strong>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
      {stacked ? (
        <ul className="dash-year-companies">
          {names.map((name) => (
            <li key={name}>
              <span style={{ background: colorFor(name, names) }} />
              {name}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
