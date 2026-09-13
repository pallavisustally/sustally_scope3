"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useInventory } from "@/components/InventoryProvider";
import { DEFAULT_WEEKS_PER_YEAR, type CommuteSurveyItemValues, type CommuteSurveyStats } from "@/lib/commute-survey";

export type SurveyRow = {
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

export function surveyUrl(token: string) {
  if (typeof window === "undefined") return `/s/${token}`;
  return `${window.location.origin}/s/${token}`;
}

export function useCommuteSurvey() {
  const { state, applyCommuteSurveyItems, pushNotice } = useInventory();
  const [surveys, setSurveys] = useState<SurveyRow[]>([]);
  const [headcount, setHeadcount] = useState("");
  const [weeksPerYear, setWeeksPerYear] = useState(String(DEFAULT_WEEKS_PER_YEAR));
  const [closeAt, setCloseAt] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<"create" | "apply" | "close" | "save" | "refresh" | "">("");
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
    return payload.surveys ?? [];
  }, [state.sessionKey]);

  useEffect(() => {
    void load().catch((err: unknown) => {
      setError(err instanceof Error ? err.message : "Could not load surveys.");
    });
  }, [load]);

  const latest = useMemo(() => surveys.find((row) => !row.closed) ?? surveys[0], [surveys]);

  useEffect(() => {
    if (!latest) return;
    setHeadcount(String(latest.headcount || ""));
    setWeeksPerYear(String(latest.weeksPerYear || DEFAULT_WEEKS_PER_YEAR));
    setCloseAt(latest.closeAt ? latest.closeAt.slice(0, 10) : "");
  }, [latest?.id, latest?.headcount, latest?.weeksPerYear, latest?.closeAt]);

  const create = async (event?: FormEvent) => {
    event?.preventDefault();
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

  const saveScaling = async (id: string) => {
    setBusy("save");
    setError("");
    try {
      const response = await fetch(`/api/surveys/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionKey: state.sessionKey,
          headcount: Number(headcount),
          weeksPerYear: Number(weeksPerYear) || DEFAULT_WEEKS_PER_YEAR,
          closeAt: closeAt || null,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Could not update the survey.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update the survey.");
    } finally {
      setBusy("");
    }
  };

  const applySurveyCore = async (id: string) => {
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
    await load();
    return { items, stats: payload.stats };
  };

  const applySurvey = async (id: string) => {
    setBusy("apply");
    setError("");
    try {
      const result = await applySurveyCore(id);
      pushNotice({
        id: "commute-survey-apply",
        title: "Commuting survey applied",
        body: `${result.stats?.responseCount ?? result.items.length} responses replaced the Category 7 rows. Distance-based is selected because the survey collected days, mode, and km.`,
        href: "/activity?cat=7",
        tone: "ok",
      });
      setMessage("Survey totals are applied below.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not apply the survey.");
    } finally {
      setBusy("");
    }
  };

  const refresh = async () => {
    setBusy("refresh");
    setError("");
    setMessage("");
    try {
      const rows = (await load()) ?? [];
      const current = rows.find((row) => !row.closed) ?? rows[0];
      if (!current) {
        setMessage("No survey campaign to refresh.");
        return;
      }
      if (current.stats.responseCount > 0) {
        const result = await applySurveyCore(current.id);
        const count = result.stats?.responseCount ?? result.items.length;
        setMessage(`Survey updated · ${count} response${count === 1 ? "" : "s"}.`);
        return;
      }
      setMessage("No responses yet.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not refresh the survey.");
    } finally {
      setBusy("");
    }
  };

  return {
    companyReady: Boolean(state.companyName.trim()),
    latest,
    headcount,
    setHeadcount,
    weeksPerYear,
    setWeeksPerYear,
    closeAt,
    setCloseAt,
    message,
    error,
    busy,
    copiedId,
    tokens,
    create,
    copyLink,
    closeSurvey,
    saveScaling,
    applySurvey,
    refresh,
  };
}
