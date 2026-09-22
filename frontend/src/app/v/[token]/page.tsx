"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { BrandWordmark, ThemeToggle } from "@/components/Brand";
import { formatReportingYear, reportingYearStart } from "@/lib/reporting-year";

type PublicField = {
  id: string;
  label: string;
  type: "text" | "select" | "textarea" | "year";
  options: { value: string; label: string }[];
  placeholder: string;
  value: string;
};

type PublicMeta = {
  companyName: string;
  year: string;
  categoryName: string;
  methodLabel: string;
  itemLabel: string;
  supplierName: string;
  status: "pending" | "verified" | "superseded";
  fields: PublicField[];
};

export default function SupplierConfirmPage() {
  const params = useParams<{ token: string }>();
  const tokenParam = typeof params.token === "string" ? params.token : "";
  const [token, setToken] = useState(tokenParam);
  const [meta, setMeta] = useState<PublicMeta | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState<"accept" | "edit" | "">("");
  const [done, setDone] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const value = decodeURIComponent(tokenParam || "");
      setToken(value);
      if (!value) {
        setLoadError("This confirmation link is missing.");
        setLoading(false);
        return;
      }
      try {
        const response = await fetch(`/api/supplier-verifications/public/${encodeURIComponent(value)}`, { cache: "no-store" });
        const payload = (await response.json().catch(() => ({}))) as PublicMeta & { error?: string };
        if (cancelled) return;
        if (!response.ok) {
          setLoadError(payload.error || "This confirmation link is not valid.");
          return;
        }
        setMeta(payload);
        setValues(Object.fromEntries((payload.fields ?? []).map((field) => [field.id, field.value])));
        if (payload.status === "verified") setDone("already");
        if (payload.status === "superseded") setLoadError("This link was replaced by a newer request.");
      } catch {
        if (!cancelled) setLoadError("Could not open this confirmation.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [tokenParam]);

  const submit = async (action: "accept" | "edit") => {
    setBusy(action);
    setFormError("");
    try {
      const response = await fetch(`/api/supplier-verifications/public/${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, values }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setFormError(payload.error || "Could not save your confirmation.");
        return;
      }
      setDone(action === "edit" ? "edited" : "accepted");
    } catch {
      setFormError("Network error. Try again.");
    } finally {
      setBusy("");
    }
  };

  const accept = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void submit(editing ? "edit" : "accept");
  };

  return (
    <div className="login-split">
      <section className="relative flex flex-col px-8 py-6 md:px-14 md:py-8">
        <div className="flex items-center justify-between">
          <BrandWordmark className="brand-mark-login" />
          <ThemeToggle />
        </div>
        <div className="mx-auto my-auto w-full max-w-[520px] py-10">
          <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[var(--brand-material)]">Supplier confirmation</p>
          <h1 className="mt-2 text-[34px] font-semibold tracking-[-0.04em]">
            {done === "edited" ? "Changes confirmed" : done ? "Data confirmed" : "Review this activity data"}
          </h1>
          <p className="mt-2 max-w-[48ch] text-[var(--muted)]">
            {meta
              ? `${meta.companyName} entered these figures for ${meta.itemLabel} · ${meta.categoryName}${meta.year ? ` · ${meta.year}` : ""}. Accept them, or edit first.`
              : "Confirm the activity data entered by the company. No Sustally account is required."}
          </p>
          {loading ? <p className="mt-6 text-[13px] text-[var(--muted)]">Opening confirmation…</p> : null}
          {loadError ? (
            <div className="form-alert mt-6" role="alert">
              <p>{loadError}</p>
            </div>
          ) : null}
          {done && !loadError ? (
            <div className="form-alert mt-6" data-tone="ok" role="status">
              <p className="font-semibold">{done === "already" ? "Already confirmed." : "Thank you."}</p>
              <p>
                {done === "edited"
                  ? "Your edited figures were saved as verified by supplier."
                  : "This item is now marked verified by supplier. You can close this page."}
              </p>
            </div>
          ) : null}
          {!loading && !loadError && !done && meta ? (
            <form onSubmit={accept} className="mt-8">
              {formError ? (
                <div className="form-alert mb-6" role="alert">
                  <p>{formError}</p>
                </div>
              ) : null}
              <p className="text-[13px] text-[var(--muted)]">
                Method: {meta.methodLabel}
                {meta.supplierName ? ` · ${meta.supplierName}` : ""}
              </p>
              <div className="mt-5 grid gap-4">
                {meta.fields.map((field) => {
                  const value = values[field.id] ?? "";
                  const display = field.type === "year" ? formatReportingYear(value) || value : value;
                  if (!editing) {
                    return (
                      <div key={field.id} className="grid grid-cols-[160px_1fr] gap-3 border-b border-[var(--line)] pb-3 last:border-0">
                        <p className="text-[13px] text-[var(--muted)]">{field.label}</p>
                        <p className="font-medium">{display || "—"}</p>
                      </div>
                    );
                  }
                  return (
                    <div key={field.id} className="field">
                      <label htmlFor={`v-${field.id}`}>{field.label}</label>
                      {field.type === "select" || field.type === "year" ? (
                        <select
                          id={`v-${field.id}`}
                          value={field.type === "year" ? reportingYearStart(value) : value}
                          onChange={(event) => setValues((current) => ({ ...current, [field.id]: event.target.value }))}
                        >
                          <option value="">Select</option>
                          {field.options.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          id={`v-${field.id}`}
                          value={value}
                          placeholder={field.placeholder}
                          onChange={(event) => setValues((current) => ({ ...current, [field.id]: event.target.value }))}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="mt-6 flex flex-wrap gap-2">
                <button type="submit" className="btn btn-primary" disabled={Boolean(busy)}>
                  {busy ? "Saving…" : editing ? "Save edits and confirm" : "Accept as entered"}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={Boolean(busy)}
                  onClick={() => setEditing((current) => !current)}
                >
                  {editing ? "Back to review" : "Edit these figures"}
                </button>
              </div>
            </form>
          ) : null}
        </div>
      </section>
      <aside className="art-panel hidden md:block" />
    </div>
  );
}
