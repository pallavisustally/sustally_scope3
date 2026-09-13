"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useInventory } from "@/components/InventoryProvider";
import { FooterNav, NoSelectedCategories } from "@/components/PageBits";
import { surveyUrl, useCommuteSurvey } from "@/components/useCommuteSurvey";
import { fieldsFor, itemLabel, type ActivityField } from "@/data/fields";
import { includedCategories, methodLabel } from "@/data/protocol";
import { isSurveyActivityItem } from "@/lib/commute-survey";
import type { ActivityItem } from "@/lib/inventory-types";
import { formatShare } from "@/lib/numbers";
import {
  activityErrorSummary,
  activityHasErrors,
  isNumberField,
  isRequiredField,
  validateItemValues,
} from "@/lib/validate-activity";

const METHOD_COPY: Record<string, { icon: "fuel" | "pin" | "people"; recommended?: boolean }> = {
  "fuel-based": { icon: "fuel" },
  "distance-based": { icon: "pin", recommended: true },
  "average-data": { icon: "people" },
};

const SURVEY_LOCKED_FIELDS = ["item", "mode", "employees", "oneWayKm", "commutingDays", "employeesSurveyed"];

export function Category7Flow() {
  const router = useRouter();
  const {
    state,
    setActiveCategory,
    setCategoryMethod,
    updateItemValues,
    addItem,
    removeItem,
    markCategoryStep,
    syncStatus,
    pushNotice,
  } = useInventory();
  const survey = useCommuteSurvey();
  const selected = includedCategories(state.categories);
  const [showErrors, setShowErrors] = useState(false);

  useEffect(() => {
    if (selected.some((row) => row.id === 7) && state.activeCategoryId !== 7) {
      setActiveCategory(7);
    }
  }, [selected, setActiveCategory, state.activeCategoryId]);

  useEffect(() => {
    const entry = state.entries[7];
    if (!entry?.items.some(isSurveyActivityItem)) return;
    const leftover = entry.items.find((item) => item.id === "c7-1" && !isSurveyActivityItem(item));
    if (!leftover) return;
    const filled = leftover.values.item?.trim() || leftover.values.employees?.trim() || leftover.values.fuelQuantity?.trim();
    if (filled) return;
    removeItem(7, leftover.id);
  }, [removeItem, state.entries]);

  const category = selected.find((row) => row.id === 7);
  if (!category) return <NoSelectedCategories />;
  const entry = state.entries[7];
  if (!entry) return null;

  const surveyItems = entry.items.filter(isSurveyActivityItem);
  const extraItems = entry.items.filter((item) => !isSurveyActivityItem(item));
  const fields = fieldsFor(7, entry.method);
  const hasSurvey = surveyItems.length > 0;
  const hasCampaign = Boolean(survey.latest);
  const hasErrors = activityHasErrors(7, entry.method, entry.items);
  const alerts = activityErrorSummary(7, entry.method, entry.items);
  const extraErrors = extraItems.map((item) => validateItemValues(fields, item.values, entry.method));
  const continueHref = "/activity/factors?cat=7";

  const steps = [
    { id: "campaign", label: "Survey campaign", done: hasCampaign },
    { id: "applied", label: "Survey data applied", done: hasSurvey },
    { id: "method", label: "Calculation method", done: Boolean(entry.method) },
    { id: "extra", label: "Additional groups", done: extraItems.length > 0, optional: true },
  ];
  const doneCount = steps.filter((step) => step.done).length;
  const requiredDone = steps.filter((step) => !step.optional && step.done).length;
  const requiredTotal = steps.filter((step) => !step.optional).length;
  const nextStep = !hasCampaign
    ? "Start a survey campaign, or add a commuting group below."
    : survey.latest && survey.latest.stats.responseCount > 0 && !hasSurvey
      ? "Apply the survey responses to Category 7."
      : hasErrors
        ? "Fill required commuting fields to continue."
        : extraItems.length === 0
          ? "Optional: add a group that did not take the survey."
          : "Save commuting data and continue.";

  const canContinue = !hasErrors && (hasSurvey || extraItems.length > 0);
  const inProgress = !(canContinue && requiredDone === requiredTotal);
  const topMode = survey.latest?.stats.byMode.find((row) => row.mode !== "Work from home / no commute") ?? survey.latest?.stats.byMode[0];
  const scaledEmployees = hasSurvey
    ? surveyItems.reduce((sum, item) => sum + (Number(item.values.employees) || 0), 0)
    : survey.latest?.headcount || 0;

  const persistDraft = () => {
    markCategoryStep(7, "method");
    markCategoryStep(7, "activity");
    pushNotice({
      id: "c7-draft",
      title: "Category 7 draft saved",
      body: syncStatus === "saving" ? "Saving commuting data to your report." : "Commuting data is saved on this report.",
      href: "/activity?cat=7",
      tone: "ok",
    });
  };

  const continueNext = () => {
    if (!canContinue) {
      setShowErrors(true);
      const target = document.querySelector(".c7-flow [data-invalid='true'], .c7-flow .form-alert");
      target?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    markCategoryStep(7, "method");
    markCategoryStep(7, "activity");
    router.push(continueHref);
  };

  const saveScaling = () => {
    if (!survey.latest) return;
    void (async () => {
      await survey.saveScaling(survey.latest!.id);
      if (hasSurvey) await survey.applySurvey(survey.latest!.id);
    })();
  };

  return (
    <div className="c7-flow">
      <div className="c7-main">
        <header className="c7-head">
          <div>
            <p className="page-kicker">Category 7</p>
            <div className="c7-head-row">
              <h2 className="page-title">Employee commuting</h2>
              <span className="status-pill" data-tone={inProgress ? "ok" : "ok"}>
                {inProgress ? "In progress" : "Complete"}
              </span>
            </div>
            <p className="page-lead">
              Calculate emissions from employees travelling between their homes and workplaces. Use the employee survey when
              you can, or add another group if it did not take the survey.
            </p>
          </div>
          <aside className="c7-head-note" role="note">
            <strong>Note:</strong> You can still choose a calculation method after using the survey. Distance-based is filled
            from the responses. Switch to Fuel-based or Average-data if you have those inputs — the extra fields open under
            Calculation method.
          </aside>
        </header>

        {showErrors && !canContinue ? (
          <div className="form-alert" role="alert">
            <p className="font-semibold">Finish the required commuting steps before continuing.</p>
            {alerts.length ? (
              <ul>
                {alerts.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            ) : (
              <p>Add survey totals or a commuting group before continuing.</p>
            )}
          </div>
        ) : null}

        <section className="c7-step" aria-labelledby="c7-step-1">
          <StepHeading
            n={1}
            id="c7-step-1"
            title="Employee commuting survey"
            body="Collect commuting information directly from employees."
            hint={
              <>
                (Still confused to fill the data? Then visit{" "}
                <Link href="/help#category-7">Learn more</Link>.)
              </>
            }
          />
          {!survey.companyReady ? (
            <p className="form-alert" role="status">
              Add a company name in <Link href="/company">Company setup</Link> so the survey can be saved.
            </p>
          ) : null}
          {survey.error ? (
            <p className="form-alert" role="alert">
              {survey.error}
            </p>
          ) : null}
          {survey.message ? (
            <p className="form-alert" data-tone="ok" role="status">
              {survey.message}
            </p>
          ) : null}

          {survey.latest ? (
            <div className="c7-campaign">
              <div className="c7-campaign-copy">
                <div className="c7-campaign-title">
                  <span className="c7-live" aria-hidden />
                  <div>
                    <strong>{survey.latest.closed ? "Survey campaign closed" : "Survey campaign active"}</strong>
                    <p>Share the link with employees. Responses are anonymous.</p>
                  </div>
                </div>
                <dl className="c7-stats">
                  <Stat label="Responses" value={String(survey.latest.stats.responseCount)} />
                  <Stat label="Commute" value={String(survey.latest.stats.commuteCount)} />
                  <Stat label="WFH" value={String(survey.latest.stats.wfhCount)} />
                  <Stat label="WFH share" value={formatShare(survey.latest.stats.wfhSharePct)} />
                  <Stat label="Employees (scaled)" value={String(scaledEmployees || survey.latest.headcount || 0)} />
                </dl>
                {topMode ? (
                  <p className="c7-top-mode">
                    Top mode: <strong>{topMode.mode}</strong> ({topMode.count} response{topMode.count === 1 ? "" : "s"})
                  </p>
                ) : null}
              </div>
              <div className="c7-linkbox">
                <div className="c7-link-head">
                  <p>Survey link</p>
                  <button
                    type="button"
                    className="c7-icon-btn"
                    aria-label="Refresh survey responses"
                    title="Refresh responses"
                    disabled={survey.busy === "refresh" || survey.busy === "apply"}
                    data-spin={survey.busy === "refresh" ? "true" : "false"}
                    onClick={() => void survey.refresh()}
                  >
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                      <path d="M20 12a8 8 0 1 1-2.2-5.4" />
                      <path d="M20 4v6h-6" />
                    </svg>
                  </button>
                </div>
                <div className="c7-link-row">
                  <code>
                    {survey.tokens[survey.latest.id]
                      ? surveyUrl(survey.tokens[survey.latest.id])
                      : `Link ending …${survey.latest.tokenSuffix}`}
                  </code>
                  <button
                    type="button"
                    className="c7-icon-btn"
                    aria-label="Copy survey link"
                    onClick={() => void survey.copyLink(survey.latest!.id)}
                  >
                    ⎘
                  </button>
                </div>
                <div className="c7-link-actions">
                  <button type="button" className="btn btn-ghost" onClick={() => void survey.copyLink(survey.latest!.id)}>
                    {survey.copiedId === survey.latest.id ? "Copied" : "Copy link"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={!survey.tokens[survey.latest.id]}
                    onClick={() => {
                      const token = survey.tokens[survey.latest!.id];
                      if (token) window.open(surveyUrl(token), "_blank", "noopener,noreferrer");
                    }}
                  >
                    Open campaign
                  </button>
                  {!survey.latest.closed ? (
                    <button
                      type="button"
                      className="btn btn-ghost c7-close"
                      disabled={survey.busy === "close"}
                      onClick={() => void survey.closeSurvey(survey.latest!.id)}
                    >
                      {survey.busy === "close" ? "Closing…" : "Close survey"}
                    </button>
                  ) : null}
                </div>
                {survey.latest.stats.responseCount > 0 && !hasSurvey ? (
                  <button
                    type="button"
                    className="btn btn-primary c7-apply"
                    disabled={survey.busy === "apply"}
                    onClick={() => void survey.applySurvey(survey.latest!.id)}
                  >
                    {survey.busy === "apply" ? "Applying…" : "Apply survey to Category 7"}
                  </button>
                ) : hasSurvey ? (
                  <button
                    type="button"
                    className="btn btn-ghost c7-apply"
                    disabled={survey.busy === "apply"}
                    onClick={() => void survey.applySurvey(survey.latest!.id)}
                  >
                    {survey.busy === "apply" ? "Refreshing…" : "Refresh applied totals"}
                  </button>
                ) : (
                  <p className="c7-wait">Waiting for the first response. Apply will fill the commuting groups below.</p>
                )}
              </div>
            </div>
          ) : (
            <form className="c7-create" onSubmit={(event) => void survey.create(event)}>
              <p className="c7-create-lead">Create an anonymous campaign, then share the link with employees.</p>
              <div className="c7-scale-grid">
                <ScalingFields survey={survey} onBlur={undefined} />
              </div>
              <button type="submit" className="btn btn-primary" disabled={survey.busy === "create" || !survey.companyReady}>
                {survey.busy === "create" ? "Creating…" : "Create survey campaign"}
              </button>
            </form>
          )}

          {survey.latest ? (
            <div className="c7-scaling">
              <p>Survey scaling</p>
              <div className="c7-scale-grid">
                <ScalingFields survey={survey} onBlur={saveScaling} />
              </div>
            </div>
          ) : null}
        </section>

        <section className="c7-step" aria-labelledby="c7-step-2">
          <StepHeading
            n={2}
            id="c7-step-2"
            title="Survey data applied"
            body="These totals came from the employee survey. You do not need to re-enter group, mode, employees, distance or commuting days."
          />
          {surveyItems.length ? (
            <div className="c7-applied-list">
              {surveyItems.map((item, index) => (
                <article key={item.id} className="c7-applied-row">
                  <div className="c7-applied-name">
                    <span>Survey group {index + 1}</span>
                    <em>From survey (read only)</em>
                    <strong>{itemLabel(item.values)}</strong>
                  </div>
                  <dl>
                    <div>
                      <dt>Employees (scaled)</dt>
                      <dd>{item.values.employees || item.values.headcount || "0"}</dd>
                    </div>
                    <div>
                      <dt>Responses</dt>
                      <dd>{item.values.employeesSurveyed || "0"}</dd>
                    </div>
                    <div>
                      <dt>One-way distance</dt>
                      <dd>{item.values.oneWayKm ? `${item.values.oneWayKm} km` : "—"}</dd>
                    </div>
                    <div>
                      <dt>Commuting days / year</dt>
                      <dd>{item.values.commutingDays || "0"}</dd>
                    </div>
                    <div>
                      <dt>Mode</dt>
                      <dd>{item.values.mode || "—"}</dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>
          ) : (
            <p className="c7-empty">No survey totals yet. Apply a campaign with responses, or add a group in step 4.</p>
          )}
        </section>

        <section className="c7-step" aria-labelledby="c7-step-3">
          <StepHeading
            n={3}
            id="c7-step-3"
            title="Calculation method"
            body={
              hasSurvey
                ? "Choose how commuting emissions should be calculated. Distance-based is selected because the survey collected days, mode and km."
                : "Choose how commuting emissions should be calculated."
            }
          />
          <div className="c7-methods">
            {category.methods.map((method) => {
              const meta = METHOD_COPY[method.id] ?? { icon: "people" as const };
              const on = entry.method === method.id;
              return (
                <button
                  key={method.id}
                  type="button"
                  className="c7-method"
                  data-on={on ? "true" : "false"}
                  onClick={() => setCategoryMethod(7, method.id)}
                >
                  <span className="c7-method-icon" data-icon={meta.icon} aria-hidden>
                    <MethodIcon name={meta.icon} />
                  </span>
                  <span>
                    <strong>{method.label}</strong>
                    <span>{method.detail}</span>
                    {meta.recommended && hasSurvey ? <em>Recommended</em> : null}
                  </span>
                  <span className="c7-radio" data-on={on ? "true" : "false"} />
                </button>
              );
            })}
          </div>
          {hasSurvey && entry.method !== "distance-based" ? (
            <div className="c7-method-form">
              <p>
                {entry.method === "fuel-based"
                  ? "Enter fuel use for each survey group. Group, mode, employees, distance and days stay as applied from the survey."
                  : "Enter average-data values for each survey group. Group totals from the survey stay above."}
              </p>
              {surveyItems.map((item) => (
                <article key={item.id} className="item-card">
                  <div className="item-card-head">
                    <p className="text-[13px] font-semibold">
                      {itemLabel(item.values)}
                      <span className="ml-2 font-normal text-[var(--muted)]">From survey</span>
                    </p>
                  </div>
                  <div className="grid gap-5 md:grid-cols-2">
                    {fields
                      .filter((field) => !SURVEY_LOCKED_FIELDS.includes(field.id))
                      .map((field) => (
                        <ActivityFieldInput
                          key={field.id}
                          field={field}
                          item={item}
                          error={showErrors ? validateItemValues(fields, item.values, entry.method)[field.id] : undefined}
                          onChange={(value) => updateItemValues(7, item.id, { [field.id]: value })}
                        />
                      ))}
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </section>

        <section className="c7-step" aria-labelledby="c7-step-4">
          <StepHeading
            n={4}
            id="c7-step-4"
            title="Other commuting groups"
            body="If some employees or contractors did not participate in the survey, add their commuting activity manually."
          />
          {extraItems.map((item, index) => (
            <article key={item.id} className="item-card">
              <div className="item-card-head">
                <p className="text-[13px] font-semibold">
                  {hasSurvey ? `Extra group ${index + 1}` : `Commuting group ${index + 1}`}
                  <span className="ml-2 font-normal text-[var(--muted)]">{itemLabel(item.values)}</span>
                </p>
                {entry.items.length > 1 ? (
                  <button type="button" className="btn btn-ghost cat-chip" onClick={() => removeItem(7, item.id)}>
                    Remove
                  </button>
                ) : null}
              </div>
              <div className="grid gap-5 md:grid-cols-2">
                {fields.map((field) => (
                  <ActivityFieldInput
                    key={field.id}
                    field={field}
                    item={item}
                    error={showErrors ? extraErrors[index]?.[field.id] : undefined}
                    onChange={(value) => updateItemValues(7, item.id, { [field.id]: value })}
                  />
                ))}
              </div>
            </article>
          ))}
          <button type="button" className="c7-add" onClick={() => addItem(7)}>
            {hasSurvey ? "+ Add a group not in the survey" : "+ Add a commuting group"}
          </button>
        </section>
      </div>

      <aside className="c7-rail" aria-label="Category 7 progress">
        <div className="c7-rail-card">
          <p className="c7-rail-kicker">Category 7 progress</p>
          <p className="c7-rail-count">
            {doneCount} of {steps.length} complete
          </p>
          <div className="c7-bar" aria-hidden>
            <span style={{ width: `${Math.round((doneCount / steps.length) * 100)}%` }} />
          </div>
          <ul className="c7-check">
            {steps.map((step) => (
              <li key={step.id} data-done={step.done ? "true" : "false"}>
                <span />
                {step.label}
              </li>
            ))}
          </ul>
        </div>
        <div className="c7-rail-card">
          <p className="c7-rail-kicker">Quick summary</p>
          <dl className="c7-summary">
            <div>
              <dt>Survey status</dt>
              <dd data-tone={survey.latest && !survey.latest.closed ? "ok" : undefined}>
                {!survey.latest ? "Not started" : survey.latest.closed ? "Closed" : "Active"}
              </dd>
            </div>
            <div>
              <dt>Responses</dt>
              <dd>{survey.latest?.stats.responseCount ?? 0}</dd>
            </div>
            <div>
              <dt>Employees (scaled)</dt>
              <dd>{scaledEmployees || survey.latest?.headcount || 0}</dd>
            </div>
            <div>
              <dt>Commuting groups</dt>
              <dd>{surveyItems.length || extraItems.length}</dd>
            </div>
            <div>
              <dt>Calculation method</dt>
              <dd>{methodLabel(7, entry.method)}</dd>
            </div>
            <div>
              <dt>Additional groups</dt>
              <dd>{extraItems.length}</dd>
            </div>
          </dl>
        </div>
        <div className="c7-next">
          <strong>Next step</strong>
          <p>{nextStep}</p>
        </div>
        <div className="c7-rail-foot">
          <button type="button" className="btn btn-ghost" onClick={persistDraft}>
            {syncStatus === "saving" ? "Saving…" : "Save draft"}
          </button>
          <button type="button" className="btn btn-primary" onClick={continueNext}>
            Continue →
          </button>
        </div>
      </aside>
      <div className="c7-mobile-nav">
        <FooterNav back="/activity" next={continueHref} nextLabel="Continue" canProceed={canContinue} onBlocked={() => setShowErrors(true)} onNext={() => {
          markCategoryStep(7, "method");
          markCategoryStep(7, "activity");
        }} />
      </div>
    </div>
  );
}

function StepHeading({
  n,
  id,
  title,
  body,
  action,
  hint,
}: {
  n: number;
  id: string;
  title: string;
  body: string;
  action?: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <div className="c7-step-head">
      <span className="c7-step-num" aria-hidden>
        {n}
      </span>
      <div>
        <div className="c7-step-title">
          <h3 id={id}>{title}</h3>
          {action}
        </div>
        <p>{body}</p>
        {hint ? <p className="c7-learn-hint">{hint}</p> : null}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dd>{value}</dd>
      <dt>{label}</dt>
    </div>
  );
}

function ScalingFields({
  survey,
  onBlur,
}: {
  survey: ReturnType<typeof useCommuteSurvey>;
  onBlur?: () => void;
}) {
  return (
    <>
      <div className="field">
        <label htmlFor="c7-headcount">Employees to scale to</label>
        <input
          id="c7-headcount"
          inputMode="numeric"
          required
          value={survey.headcount}
          placeholder="e.g. 420"
          onChange={(event) => survey.setHeadcount(event.target.value)}
          onBlur={onBlur}
        />
      </div>
      <div className="field">
        <label htmlFor="c7-weeks">Working weeks / year</label>
        <input
          id="c7-weeks"
          inputMode="numeric"
          value={survey.weeksPerYear}
          onChange={(event) => survey.setWeeksPerYear(event.target.value)}
          onBlur={onBlur}
        />
      </div>
      <div className="field">
        <label htmlFor="c7-close">Close date (optional)</label>
        <input
          id="c7-close"
          type="date"
          value={survey.closeAt}
          onChange={(event) => survey.setCloseAt(event.target.value)}
          onBlur={onBlur}
        />
      </div>
    </>
  );
}

function ActivityFieldInput({
  field,
  item,
  error,
  onChange,
}: {
  field: ActivityField;
  item: ActivityItem;
  error?: string;
  onChange: (value: string) => void;
}) {
  const inputId = `${item.id}-${field.id}`;
  const value = item.values[field.id] ?? "";
  const required = isRequiredField(field);
  return (
    <div className={`field${field.wide ? " md:col-span-2" : ""}`} data-invalid={error ? "true" : "false"}>
      <label htmlFor={inputId}>
        {field.label}
        {required ? (
          <span className="req" aria-hidden>
            *
          </span>
        ) : field.optional ? (
          " (optional)"
        ) : null}
      </label>
      {field.type === "select" ? (
        <select id={inputId} value={value} aria-invalid={error ? true : undefined} aria-required={required || undefined} onChange={(event) => onChange(event.target.value)}>
          <option value="">Select</option>
          {field.options?.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : field.type === "textarea" ? (
        <textarea
          id={inputId}
          value={value}
          placeholder={field.placeholder}
          aria-invalid={error ? true : undefined}
          aria-required={required || undefined}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <input
          id={inputId}
          type="text"
          value={value}
          placeholder={field.placeholder}
          inputMode={isNumberField(field) ? "decimal" : "text"}
          aria-invalid={error ? true : undefined}
          aria-required={required || undefined}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
      {error ? <p className="field-error">{error}</p> : null}
    </div>
  );
}

function MethodIcon({ name }: { name: "fuel" | "pin" | "people" }) {
  if (name === "fuel") {
    return (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M7 20V8a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v12" />
        <path d="M7 20h10M10 11h4" />
        <path d="M15 10h2.5a2.5 2.5 0 0 1 2.5 2.5V16a2 2 0 1 0 4 0V9l-2-2" />
      </svg>
    );
  }
  if (name === "people") {
    return (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="9" cy="8" r="3" />
        <circle cx="16" cy="9" r="2.4" />
        <path d="M4 19c.6-3 2.6-5 5-5s4.4 2 5 5" />
        <path d="M14 19c.4-2.2 1.8-3.6 3.8-3.6 1.4 0 2.6.7 3.2 1.8" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.2" />
    </svg>
  );
}
