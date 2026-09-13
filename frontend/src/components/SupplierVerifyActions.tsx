"use client";

import { useEffect, useState } from "react";
import { useInventory } from "@/components/InventoryProvider";
import { canVerifySupplierMethod, isValidSupplierEmail, verificationStatus } from "@/lib/supplier-verify";

const TOKEN_KEY = (id: string) => `sustally-supplier-token:${id}`;

type Props = {
  categoryId: number;
  itemId: string;
  method: string;
};

export function SupplierVerifyActions({ categoryId, itemId, method }: Props) {
  const { state, updateItemValues } = useInventory();
  const item = state.entries[categoryId]?.items.find((row) => row.id === itemId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [token, setToken] = useState("");

  useEffect(() => {
    if (!itemId) return;
    setToken(window.sessionStorage.getItem(TOKEN_KEY(itemId)) || "");
  }, [itemId]);

  if (!item || !canVerifySupplierMethod(method)) return null;

  const email = (item.values.supplierEmail || "").trim();
  const status = verificationStatus(item.values);

  const send = async () => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (!isValidSupplierEmail(email)) {
        setError("Enter a valid supplier email first.");
        return;
      }
      const response = await fetch("/api/supplier-verifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionKey: state.sessionKey,
          categoryId,
          itemId,
          method,
          values: item.values,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        token?: string;
        emailed?: boolean;
        mailError?: string;
      };
      if (!response.ok) throw new Error(payload.error || "Could not send the confirmation.");
      if (payload.token) {
        window.sessionStorage.setItem(TOKEN_KEY(itemId), payload.token);
        setToken(payload.token);
      }
      updateItemValues(categoryId, itemId, { supplierVerificationStatus: "pending", supplierVerified: "" });
      if (payload.emailed) setMessage("Confirmation email sent. The supplier can accept or edit the figures.");
      else setMessage(payload.mailError ? `${payload.mailError} Copy the link and send it yourself.` : "Copy the link and send it to the supplier.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send the confirmation.");
    } finally {
      setBusy(false);
    }
  };

  const copyLink = async () => {
    if (!token) {
      setError("The full link is only shown in the browser that sent this request.");
      return;
    }
    await navigator.clipboard.writeText(`${window.location.origin}/v/${token}`);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="mt-5 border-t border-[var(--line)] pt-4">
      <div className="flex flex-wrap items-center gap-2">
        {status === "verified" ? (
          <span className="status-pill" data-tone="ok">
            Verified by supplier
          </span>
        ) : status === "pending" ? (
          <span className="status-pill" data-tone="warn">
            Waiting for supplier
          </span>
        ) : status === "stale" ? (
          <span className="status-pill" data-tone="warn">
            Re-send after your edits
          </span>
        ) : (
          <span className="status-pill">Not verified</span>
        )}
        <p className="text-[13px] text-[var(--muted)]">
          Optional. Send this row for the supplier to accept or edit. Verified items use the supplier data score in results and reports.
        </p>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className="btn btn-ghost" disabled={busy || !email} onClick={() => void send()}>
          {busy ? "Sending…" : status === "verified" ? "Send again" : "Send for supplier confirmation"}
        </button>
        {token ? (
          <button type="button" className="btn btn-ghost" onClick={() => void copyLink()}>
            {copied ? "Copied" : "Copy link"}
          </button>
        ) : null}
      </div>
      {error ? (
        <p className="form-alert mt-3" role="alert">
          {error}
        </p>
      ) : null}
      {message ? <p className="mt-3 text-[13px] text-[var(--muted)]">{message}</p> : null}
    </div>
  );
}
