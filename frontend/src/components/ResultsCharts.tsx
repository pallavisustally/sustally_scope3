import type { InventoryResult } from "@/lib/calculate";
import { formatShare, formatTco2e } from "@/lib/numbers";

const SLICE_COLORS = [
  "oklch(62% 0.22 305)",
  "oklch(66% 0.14 230)",
  "oklch(68% 0.13 175)",
  "oklch(72% 0.14 75)",
  "oklch(64% 0.16 25)",
  "oklch(60% 0.12 145)",
  "oklch(58% 0.12 280)",
  "oklch(70% 0.11 50)",
];

type Slice = {
  id: string;
  label: string;
  tco2e: number;
  share: number;
  color: string;
};

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

function slicesFor(results: InventoryResult): Slice[] {
  const ranked = [...results.categories].filter((category) => category.tco2e > 0).sort((a, b) => b.tco2e - a.tco2e);
  if (!ranked.length || results.totalTco2e <= 0) return [];
  const top = ranked.slice(0, 6);
  const rest = ranked.slice(6);
  const rows: Slice[] = top.map((category, index) => ({
    id: String(category.id),
    label: `${category.id} ${category.name}`,
    tco2e: category.tco2e,
    share: category.share,
    color: SLICE_COLORS[index % SLICE_COLORS.length],
  }));
  const other = rest.reduce((sum, category) => sum + category.tco2e, 0);
  if (other > 0) {
    rows.push({
      id: "other",
      label: "Other categories",
      tco2e: other,
      share: (other / results.totalTco2e) * 100,
      color: "oklch(58% 0.04 305)",
    });
  }
  return rows;
}

export function ResultsCharts({ results }: { results: InventoryResult }) {
  const slices = slicesFor(results);
  const maxBar = Math.max(...results.categories.map((category) => category.tco2e), 0);
  const ranked = [...results.categories].sort((a, b) => b.tco2e - a.tco2e);
  const largest = ranked[0];
  const topThreeShare = ranked.slice(0, 3).reduce((sum, category) => sum + category.share, 0);
  const incomplete = results.categories.filter((category) => category.items.length > 0 && category.completeCount === 0).length;
  const upstreamShare = results.totalTco2e > 0 ? (results.upstreamTco2e / results.totalTco2e) * 100 : 0;
  const cx = 88;
  const cy = 88;
  let angle = -Math.PI / 2;
  const arcs = slices.map((slice) => {
    const sweep = (slice.tco2e / results.totalTco2e) * Math.PI * 2;
    const start = angle;
    const end = angle + Math.max(sweep, 0.01);
    angle = end;
    return { ...slice, start, end };
  });

  return (
    <article className="panel mt-4 results-analysis">
      <div className="results-analysis-copy">
        <h3>Emissions by category</h3>
        <ul className="results-insights">
          {largest && largest.tco2e > 0 ? (
            <li>
              <strong>{largest.name}</strong> is the largest source at {formatTco2e(largest.tco2e)} tCO₂e ({formatShare(largest.share)} of the inventory).
            </li>
          ) : (
            <li>No calculated category emissions yet.</li>
          )}
          <li>
            Upstream is {formatTco2e(results.upstreamTco2e)} tCO₂e ({formatShare(upstreamShare)}); downstream is {formatTco2e(results.downstreamTco2e)} tCO₂e.
          </li>
          <li>
            The top three categories account for {formatShare(topThreeShare)} of the total
            {incomplete ? `. ${incomplete} included ${incomplete === 1 ? "category is" : "categories are"} still not calculated.` : "."}
          </li>
        </ul>
      </div>

      <div className="results-analysis-charts">
        <div className="results-pie-wrap">
          <svg viewBox="0 0 176 176" className="results-pie" role="img" aria-label="Share of scope 3 emissions by category">
            {arcs.length ? (
              arcs.map((slice) => (
                <path
                  key={slice.id}
                  d={donutPath(cx, cy, 46, 84, slice.start, slice.end)}
                  fill={slice.color}
                >
                  <title>
                    {slice.label}: {formatTco2e(slice.tco2e)} tCO₂e ({formatShare(slice.share)})
                  </title>
                </path>
              ))
            ) : (
              <circle cx={cx} cy={cy} r="84" fill="var(--surface-2)" />
            )}
            <circle cx={cx} cy={cy} r="38" fill="var(--surface)" />
            <text x={cx} y={cy - 4} textAnchor="middle" className="results-pie-total">
              {formatTco2e(results.totalTco2e)}
            </text>
            <text x={cx} y={cy + 14} textAnchor="middle" className="results-pie-unit">
              tCO₂e
            </text>
          </svg>
          <ul className="results-pie-legend">
            {slices.map((slice) => (
              <li key={slice.id}>
                <span style={{ background: slice.color }} />
                <em>{slice.label}</em>
                <strong>{formatShare(slice.share)}</strong>
              </li>
            ))}
          </ul>
        </div>

        <div className="results-bars" role="img" aria-label="Emissions by category bar chart">
          {results.categories.map((category) => {
            const width = maxBar > 0 ? Math.max((category.tco2e / maxBar) * 100, category.tco2e > 0 ? 3 : 0) : 0;
            return (
              <div key={category.id} className="results-bar-row">
                <span className="results-bar-label">
                  {category.id} {category.name}
                </span>
                <div className="results-bar-track">
                  <span style={{ width: `${width}%` }} />
                </div>
                <span className="results-bar-value">{formatTco2e(category.tco2e)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </article>
  );
}
