"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { BrandWordmark, ThemeToggle } from "@/components/Brand";
import { COMMUTE_MODES, WORKPLACE_TYPES } from "@/lib/commute-survey";

const DAYS = [0, 1, 2, 3, 4, 5, 6, 7];

type SurveyMeta = {
  companyName: string;
  year: string;
  closed: boolean;
};

export default function PublicCommuteSurveyPage() {
  const params = useParams<{ token: string }>();
  const tokenParam = typeof params.token === "string" ? params.token : "";
  const [token, setToken] = useState(tokenParam);
  const [meta, setMeta] = useState<SurveyMeta | null>(null);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [commuteDays, setCommuteDays] = useState("0");
  const [wfhDays, setWfhDays] = useState("5");
  const [offDays, setOffDays] = useState("2");
  const [mode, setMode] = useState("");
  const [oneWayKm, setOneWayKm] = useState("");
  const [region, setRegion] = useState("");
  const [workplaceType, setWorkplaceType] = useState("");
  const [workplaceName, setWorkplaceName] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const value = decodeURIComponent(tokenParam || "");
      setToken(value);
      if (!value) {
        setLoadError("This survey link is missing.");
        setLoading(false);
        return;
      }
      try {
        const response = await fetch(`/api/surveys/public/${encodeURIComponent(value)}`, { cache: "no-store" });
        const payload = (await response.json().catch(() => ({}))) as SurveyMeta & { error?: string };
        if (cancelled) return;
        if (!response.ok) {
          setLoadError(payload.error || "This survey link is not valid.");
          return;
        }
        setMeta(payload);
        if (payload.closed) setLoadError("This survey is closed.");
      } catch {
        if (!cancelled) setLoadError("Could not open this survey.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [tokenParam]);

  const commute = Number(commuteDays) > 0;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setFormError("");
    try {
      const workplace =
        workplaceType === "A workplace" && workplaceName.trim()
          ? `A workplace: ${workplaceName.trim()}`
          : workplaceType;
      const response = await fetch(`/api/surveys/public/${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          commuteDays: Number(commuteDays),
          wfhDays: Number(wfhDays),
          offDays: Number(offDays),
          mode,
          oneWayKm: oneWayKm === "" ? null : Number(oneWayKm),
          region,
          workplaceType: workplace,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setFormError(payload.error || "Could not save your answers.");
        return;
      }
      setDone(true);
    } catch {
      setFormError("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-split">
      <section className="relative flex flex-col px-8 py-6 md:px-14 md:py-8">
        <div className="flex items-center justify-between">
          <BrandWordmark className="brand-mark-login" />
          <ThemeToggle />
        </div>
        <div className="mx-auto my-auto w-full max-w-[460px] py-10">
          <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[var(--brand-material)]">Employee commuting</p>
          <h1 className="mt-2 text-[34px] font-semibold tracking-[-0.04em]">How you get to work</h1>
          <p className="mt-2 max-w-[46ch] text-[var(--muted)]">
            {meta
              ? `${meta.companyName} is collecting typical weekly commuting for ${meta.year || "this reporting year"}. No name or email is stored.`
              : "Anonymous commuting survey. No name or email is stored."}
          </p>
          {loading ? <p className="mt-6 text-[13px] text-[var(--muted)]">Opening survey…</p> : null}
          {loadError ? (
            <div className="form-alert mt-6" role="alert">
              <p>{loadError}</p>
            </div>
          ) : null}
          {done ? (
            <div className="form-alert mt-6" data-tone="ok" role="status">
              <p className="font-semibold">Thank you.</p>
              <p>Your answers were saved. You can close this page.</p>
            </div>
          ) : null}
          {!loading && !loadError && !done ? (
            <form onSubmit={(event) => void submit(event)} className="mt-8">
              {formError ? (
                <div className="form-alert mb-6" role="alert">
                  <p>{formError}</p>
                </div>
              ) : null}
              <p className="text-[13px] font-semibold">In a typical week, how many days do you</p>
              <div className="mt-3 grid grid-cols-3 gap-3">
                <div className="field">
                  <label htmlFor="commuteDays">Commute</label>
                  <select id="commuteDays" value={commuteDays} onChange={(event) => setCommuteDays(event.target.value)}>
                    {DAYS.map((day) => (
                      <option key={day} value={day}>
                        {day}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="wfhDays">Work from home</label>
                  <select id="wfhDays" value={wfhDays} onChange={(event) => setWfhDays(event.target.value)}>
                    {DAYS.map((day) => (
                      <option key={day} value={day}>
                        {day}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="offDays">Not working</label>
                  <select id="offDays" value={offDays} onChange={(event) => setOffDays(event.target.value)}>
                    {DAYS.map((day) => (
                      <option key={day} value={day}>
                        {day}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <p className="mt-2 text-[13px] text-[var(--muted)]">The three numbers must add up to 7.</p>
              <div className="field mt-5">
                <label htmlFor="mode">Main travel mode{commute ? " *" : " (optional)"}</label>
                <select id="mode" value={mode} required={commute} onChange={(event) => setMode(event.target.value)}>
                  <option value="">Select</option>
                  {COMMUTE_MODES.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field mt-5">
                <label htmlFor="oneWayKm">One-way distance (km){commute ? " *" : " (optional)"}</label>
                <input
                  id="oneWayKm"
                  inputMode="decimal"
                  value={oneWayKm}
                  placeholder="e.g. 12"
                  required={commute}
                  onChange={(event) => setOneWayKm(event.target.value)}
                />
              </div>
              <div className="field mt-5">
                <label htmlFor="workplaceType">Workplace type (optional)</label>
                <select id="workplaceType" value={workplaceType} onChange={(event) => setWorkplaceType(event.target.value)}>
                  <option value="">Select</option>
                  {WORKPLACE_TYPES.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              {workplaceType === "A workplace" ? (
                <div className="field mt-5">
                  <label htmlFor="workplaceName">Workplace (optional)</label>
                  <input
                    id="workplaceName"
                    value={workplaceName}
                    placeholder="e.g. city, client site, or office name"
                    onChange={(event) => setWorkplaceName(event.target.value)}
                  />
                </div>
              ) : null}
              <div className="field mt-5">
                <label htmlFor="region">City or region (optional)</label>
                <input
                  id="region"
                  value={region}
                  placeholder="e.g. Bengaluru"
                  onChange={(event) => setRegion(event.target.value)}
                />
              </div>
              <button type="submit" className="btn btn-primary mt-6 w-full" disabled={busy || !token}>
                {busy ? "Sending…" : "Submit"}
              </button>
            </form>
          ) : null}
        </div>
      </section>
      <aside className="art-panel hidden md:block" />
    </div>
  );
}
