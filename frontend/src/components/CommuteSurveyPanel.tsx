"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useInventory } from "@/components/InventoryProvider";
import {
  DEFAULT_WEEKS_PER_YEAR,
  type CommuteSurveyItemValues,
  type CommuteSurveyStats,
} from "@/lib/commute-survey";
import { formatShare } from "@/lib/numbers";

type SurveyRow = {
  id: string;
  status: "open" | "closed";
  closed: boolean;
  headcount: number;
  weeksPerYear: number;
  closeAt: string | null;
  tokenSuffix: string;
  stats: CommuteSurveyStats;
};

const TOKEN_KEY = (id: string) => `sustally-commute-token:${id}`;

function surveyUrl(token: string) {
  if (typeof window === "undefined") return `/s/${token}`;
  return `${window.location.origin}/s/${token}`;
}

export function CommuteSurveyPanel() {
  const { state, applyCommuteSurveyItems, pushNotice } = useInventory();
  const [surveys, setSurveys] = useState<SurveyRow[]>([]);
  const [headcount, setHeadcount] = useState("");
  const [weeksPerYear, setWeeksPerYear] = useState(String(DEFAULT_WEEKS_PER_YEAR));
  const [closeAt, setCloseAt] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<"create" | "apply" | "close" | "">("");
  const [copiedId, setCopiedId] = useState("");
  const [tokens, setTokens] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    if (!state.sessionKey) return;
    const response = await fetch(`/api/surveys?sessionKey=${encodeURIComponent(state.sessionKey)}`, { cache: "no-store" });
    const payload = (await response.json().catch(() => ({}))) as { surveys?: SurveyRow[]; error?: string };
    if (!response.ok) throw new Error(payload.error || "Could not load surveys.");
    setSurveys(payload.surveys ?? []);
    const stored: Record<string, string> = {};
    for (const row of payload.surveys ?? []) {
      const token = window.sessionStorage.getItem(TOKEN_KEY(row.id));
      if (token) stored[row.id] = token;
    }
    setTokens(stored);
  }, [state.sessionKey]);

  useEffect(() => {
    void load().catch((err: unknown) => {
      setError(err instanceof Error ? err.message : "Could not load surveys.");
    });
  }, [load]);

  const latest = useMemo(() => surveys.find((row) => !row.closed) ?? surveys[0], [surveys]);

  const create = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy("create");
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/surveys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionKey: state.sessionKey,
          headcount: Number(headcount),
          weeksPerYear: Number(weeksPerYear) || DEFAULT_WEEKS_PER_YEAR,
          closeAt: closeAt || null,
          reportingYear: state.year || null,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        survey?: SurveyRow;
        token?: string;
        error?: string;
      };
      if (!response.ok) throw new Error(payload.error || "Could not create the survey.");
      if (payload.survey && payload.token) {
        window.sessionStorage.setItem(TOKEN_KEY(payload.survey.id), payload.token);
        setTokens((current) => ({ ...current, [payload.survey!.id]: payload.token! }));
        const url = surveyUrl(payload.token);
        await navigator.clipboard.writeText(url).catch(() => undefined);
        setCopiedId(payload.survey.id);
        setMessage(`Survey link copied: ${url}`);
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the survey.");
    } finally {
      setBusy("");
    }
  };

  const copyLink = async (id: string) => {
    const token = tokens[id];
    if (!token) {
      setError("The full link is only shown in the browser that created the survey. Create a new campaign if you need a fresh link.");
      return;
    }
    await navigator.clipboard.writeText(surveyUrl(token));
    setCopiedId(id);
    setMessage("Survey link copied.");
  };

  const closeSurvey = async (id: string) => {
    setBusy("close");
    setError("");
    try {
      const response = await fetch(`/api/surveys/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionKey: state.sessionKey, status: "closed" }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Could not close the survey.");
      await load();
      setMessage("Survey closed. New responses are no longer accepted.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not close the survey.");
    } finally {
      setBusy("");
    }
  };

  const applySurvey = async (id: string) => {
    setBusy("apply");
    setError("");
    try {
      const response = await fetch(`/api/surveys/${encodeURIComponent(id)}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionKey: state.sessionKey }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        items?: CommuteSurveyItemValues[];
        stats?: CommuteSurveyStats;
        error?: string;
      };
      if (!response.ok) throw new Error(payload.error || "Could not apply the survey.");
      const items = payload.items ?? [];
      if (!items.length) throw new Error("No responses to apply yet.");
      applyCommuteSurveyItems(id, items);
      pushNotice({
        id: "commute-survey-apply",
        title: "Commuting survey applied",
        body: `${payload.stats?.responseCount ?? items.length} responses replaced the Category 7 rows. Distance-based is selected because the survey collected days, mode, and km. You can still switch method. Assign emission factors next.`,
        href: "/activity?cat=7",
        tone: "ok",
      });
      setMessage("Survey totals replaced the rows below. Distance-based is selected because the survey collected days, mode, and km. Fuel-based and average-data stay available. Assign factors next.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not apply the survey.");
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="panel mb-4">
      <p className="text-[13px] font-semibold">Collect from employees (optional)</p>
      <aside className="cat-note" role="note">
        <strong>Category 7 note</strong>
        <p>
          Share an anonymous link, then apply. That replaces the commuting rows below with survey totals, so you do not
          enter commuting group, mode, employees, distance, or days again.
        </p>
        <ul>
          <li>Apply selects distance-based because the survey collected days, mode, and km. Fuel-based and average-data stay available if you have those inputs.</li>
          <li>Skip the survey and use the fields below only if you already have totals.</li>
          <li>Add another item later for a group that did not take the survey, such as contractors.</li>
        </ul>
      </aside>
      {!state.companyName.trim() ? (
        <p className="form-alert mt-4" role="status">
          Add a company name in <Link href="/company">Company setup</Link> so the survey can be saved.
        </p>
      ) : null}
      <form className="mt-5 grid gap-5 md:grid-cols-3" onSubmit={(event) => void create(event)}>
        <div className="field">
          <label htmlFor="survey-headcount">Employees to scale to</label>
          <input
            id="survey-headcount"
            inputMode="numeric"
            required
            value={headcount}
            placeholder="e.g. 420"
            onChange={(event) => setHeadcount(event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="survey-weeks">Working weeks / year</label>
          <input
            id="survey-weeks"
            inputMode="numeric"
            value={weeksPerYear}
            onChange={(event) => setWeeksPerYear(event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="survey-close">Close date (optional)</label>
          <input id="survey-close" type="date" value={closeAt} onChange={(event) => setCloseAt(event.target.value)} />
        </div>
        <div className="md:col-span-3">
          <button type="submit" className="btn btn-primary" disabled={busy === "create" || !state.companyName.trim()}>
            {busy === "create" ? "Creating…" : "Create survey link"}
          </button>
        </div>
      </form>
      {latest ? (
        <div className="mt-5 border-t border-[var(--line)] pt-5">
          <p className="text-[13px] font-semibold">{latest.closed ? "Closed campaign" : "Open campaign"}</p>
          <p className="mt-2 text-[13px] text-[var(--muted)]">
            {latest.stats.responseCount} responses · {latest.stats.commuteCount} commute · {latest.stats.wfhCount} WFH · WFH share{" "}
            {formatShare(latest.stats.wfhSharePct)} · scaled to {latest.headcount}
          </p>
          {latest.stats.byMode.length ? (
            <p className="mt-1 text-[13px] text-[var(--muted)]">
              {latest.stats.byMode.map((row) => `${row.mode} ${row.count}`).join(" · ")}
            </p>
          ) : null}
          {tokens[latest.id] ? (
            <p className="mt-3 break-all text-[12px] text-[var(--muted)]">{surveyUrl(tokens[latest.id])}</p>
          ) : (
            <p className="mt-3 text-[13px] text-[var(--muted)]">
              Link ending {latest.tokenSuffix || "unknown"}. Copy is available in the browser that created it.
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" className="btn btn-ghost" onClick={() => void copyLink(latest.id)}>
              {copiedId === latest.id ? "Copied" : "Copy link"}
            </button>
            <button type="button" className="btn btn-primary" disabled={busy === "apply"} onClick={() => void applySurvey(latest.id)}>
              {busy === "apply" ? "Applying…" : "Apply to this category"}
            </button>
            {!latest.closed ? (
              <button type="button" className="btn btn-ghost" disabled={busy === "close"} onClick={() => void closeSurvey(latest.id)}>
                Close survey
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
      {error ? (
        <p className="form-alert mt-4" role="alert">
          {error}
        </p>
      ) : null}
      {message ? <p className="mt-3 text-[13px] text-[var(--muted)]">{message}</p> : null}
    </div>
  );
}
