"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { ActivityFieldControl } from "@/components/ActivityFieldControl";
import { ItemFactorSelect } from "@/components/ItemFactorSelect";
import { useInventory } from "@/components/InventoryProvider";
import { NoSelectedCategories } from "@/components/PageBits";
import { surveyUrl, useCommuteSurvey } from "@/components/useCommuteSurvey";
import { fieldsFor, itemLabel, type ActivityField } from "@/data/fields";
import { includedCategories } from "@/data/protocol";
import {
  commuteFactorIdForMode,
  commuteModeLabel,
  commuteSourceOf,
  isSurveyActivityItem,
  isDefaultCommutePlaceholder,
  proportionalWorkingRows,
  WFH_GROUP,
} from "@/lib/commute-survey";
import type { ActivityItem } from "@/lib/inventory-types";
import { calculateItem } from "@/lib/calculate";
import { formatShare, formatTco2e } from "@/lib/numbers";
import { activityErrorSummary, activityHasErrors, factorGaps, factorsReady, validateItemValues } from "@/lib/validate-activity";

const METHOD_COPY: Record<string, { icon: "fuel" | "pin" | "people"; default?: boolean }> = {
  "fuel-based": { icon: "fuel", default: true },
  "distance-based": { icon: "pin" },
  "average-data": { icon: "people" },
};

export function Category7Flow() {
  const router = useRouter();
  const {
    state,
    setActiveCategory,
    setCategoryMethod,
    setCommuteSource,
    setCommuteRemainder,
    setItemFactor,
    updateItemValues,
    addItem,
    removeItem,
    markCategoryStep,
    syncStatus,
    pushNotice,
    factors,
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
    if (entry.commuteRemainder === "manual") return;
    const leftover = entry.items.find((item) => isDefaultCommutePlaceholder(item));
    if (!leftover) return;
    const filled = leftover.values.item?.trim() || leftover.values.employees?.trim() || leftover.values.fuelQuantity?.trim();
    if (filled) return;
    removeItem(7, leftover.id);
  }, [removeItem, state.entries]);

  useEffect(() => {
    const entry = state.entries[7];
    if (!entry || entry.method !== "distance-based") return;
    for (const item of entry.items) {
      if (item.factorId) continue;
      const mode = item.values.mode?.trim() || (isSurveyActivityItem(item) ? WFH_GROUP : "");
      const factorId = commuteFactorIdForMode(mode);
      if (factorId) setItemFactor(7, item.id, factorId);
    }
  }, [setItemFactor, state.entries]);

  useEffect(() => {
    const current = state.entries[7];
    if (!current?.items.some(isSurveyActivityItem)) return;
    const applied = current.items.filter(isSurveyActivityItem);
    const headcount = Number(survey.latest?.headcount || survey.headcount) || 0;
    const responseCount =
      survey.latest?.stats.responseCount ??
      applied.reduce((sum, item) => sum + (Number(item.values.employeesSurveyed) || 0), 0);
    const remaining = headcount > 0 ? Math.max(0, headcount - responseCount) : 0;
    if (remaining > 0) return;
    if (current.commuteRemainder === "responses-only") return;
    setCommuteRemainder("responses-only", { headcount, responseCount });
  }, [
    setCommuteRemainder,
    state.entries,
    survey.headcount,
    survey.latest?.headcount,
    survey.latest?.stats.responseCount,
  ]);

  const category = selected.find((row) => row.id === 7);
  if (!category) return <NoSelectedCategories />;
  const entry = state.entries[7];
  if (!entry) return null;

  const surveyItems = entry.items.filter(isSurveyActivityItem);
  const extraItems = entry.items.filter((item) => !isSurveyActivityItem(item));
  const surveyResponseRows = surveyItems.map((item) => {
    const display = {
      ...item,
      values: { ...item.values, employees: item.values.employeesSurveyed || item.values.employees },
    };
    return {
      item,
      result: calculateItem(7, "distance-based", display, {
        catalog: factors,
        reportingYear: state.year,
        hq: state.hq,
      }),
    };
  });
  const surveyResponseTco2e = surveyResponseRows.reduce((sum, row) => sum + row.result.tco2e, 0);
  const fields = fieldsFor(7, entry.method);
  const hasSurvey = surveyItems.length > 0;
  const commuteSource = commuteSourceOf(entry);
  const showSurveyPath = entry.method === "distance-based" && commuteSource === "survey";
  const showManualPath = entry.method === "distance-based" && commuteSource === "manual";
  const showPrimaryForm = entry.method === "fuel-based" || entry.method === "average-data" || showManualPath;
  const formItems = extraItems.length ? extraItems : entry.items;
  const remainder = entry.commuteRemainder;
  const totalEmployees = Number(survey.latest?.headcount || survey.headcount) || 0;
  const responsesGiven =
    survey.latest?.stats.responseCount ??
    surveyItems.reduce((sum, item) => sum + (Number(item.values.employeesSurveyed) || 0), 0);
  const notResponded = totalEmployees > 0 ? Math.max(0, totalEmployees - responsesGiven) : 0;
  const remainderEnabled = hasSurvey && notResponded > 0;
  const remainderMeta = { headcount: totalEmployees, responseCount: responsesGiven };
  const workingRows = proportionalWorkingRows(surveyItems, totalEmployees, responsesGiven);
  const proportionalDetail =
    totalEmployees > 0 && responsesGiven > 0
      ? `Employees in a mode = ${totalEmployees} × (mode responses ÷ ${responsesGiven}). Distance and days stay the survey averages.`
      : "Scale remaining employees with the same mix as the responses. Distance and days stay the survey averages.";
  const visibleItems = showSurveyPath
    ? remainderEnabled && remainder === "manual"
      ? entry.items
      : surveyItems
    : formItems;
  const hasErrors = activityHasErrors(7, entry.method, visibleItems);
  const alerts = [...activityErrorSummary(7, entry.method, visibleItems), ...factorGaps({ ...entry, items: visibleItems }, 7)];
  const extraErrors = extraItems.map((item) => validateItemValues(fields, item.values, entry.method));
  const continueHref = "/activity";
  const readyFactors = factorsReady({ ...entry, items: visibleItems }, 7);
  const canContinue =
    Boolean(entry.method) &&
    (entry.method !== "distance-based" || commuteSource) &&
    !hasErrors &&
    readyFactors &&
    (showSurveyPath ? hasSurvey && (!remainderEnabled || Boolean(remainder)) : formItems.length > 0);
  const inProgress = !canContinue;
  const topMode = survey.latest?.stats.byMode.find((row) => row.mode !== "Work from home / no commute") ?? survey.latest?.stats.byMode[0];
  const countOrDash = (value: number, ready: boolean) => (ready && Number.isFinite(value) ? String(value) : "—");
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
    markCategoryStep(7, "factors");
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
              Choose a calculation method first. Fuel-based is selected by default. Distance-based can use an employee survey
              or totals you enter yourself.
            </p>
          </div>
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
            ) : showSurveyPath && remainderEnabled && !remainder ? (
              <p>Choose how to treat employees who did not respond, then save.</p>
            ) : (
              <p>Add survey totals or a commuting group before continuing.</p>
            )}
          </div>
        ) : null}

        <section className="c7-step" aria-labelledby="c7-step-1">
          <StepHeading
            n={1}
            id="c7-step-1"
            title="Calculation method"
            body="Fuel-based is selected by default. Switch to Distance-based to use a survey or to enter commuting totals yourself."
            hint={
              <>
                (Still confused to fill the data? Then visit{" "}
                <Link href="/help#category-7">Learn more</Link>.)
              </>
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
                    {meta.default ? <em>Default</em> : null}
                  </span>
                  <span className="c7-radio" data-on={on ? "true" : "false"} />
                </button>
              );
            })}
          </div>

          {entry.method === "distance-based" ? (
            <div className="c7-paths">
              <button
                type="button"
                className="c7-path"
                data-on={commuteSource === "survey" ? "true" : "false"}
                onClick={() => setCommuteSource("survey")}
              >
                <strong>Survey link</strong>
                <span>Share an anonymous link. Responses are grouped by travelling mode.</span>
              </button>
              <button
                type="button"
                className="c7-path"
                data-on={commuteSource === "manual" ? "true" : "false"}
                onClick={() => setCommuteSource("manual")}
              >
                <strong>Enter data manually</strong>
                <span>Enter employees, one-way distance, commuting days, and travel mode yourself.</span>
              </button>
            </div>
          ) : null}

          {showPrimaryForm ? (
            <div className="c7-method-form">
              <p>
                {entry.method === "fuel-based"
                  ? "Enter fuel use for each commuting group, then select an emission factor."
                  : entry.method === "average-data"
                    ? "Enter headcount for each commuting group, then select an emission factor."
                    : "Enter distance-based commuting totals for each group, then select an emission factor."}
              </p>
              {formItems.map((item, index) => (
                <article key={item.id} className="item-card">
                  <div className="item-card-head">
                    <p className="text-[13px] font-semibold">
                      Commuting group {index + 1}
                      <span className="ml-2 font-normal text-[var(--muted)]">{itemLabel(item.values)}</span>
                    </p>
                    {formItems.length > 1 ? (
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
                        error={showErrors ? validateItemValues(fields, item.values, entry.method)[field.id] : undefined}
                        onChange={(value) => {
                          updateItemValues(7, item.id, { [field.id]: value });
                          if (field.id === "mode" && entry.method === "distance-based") {
                            const nextFactor = commuteFactorIdForMode(value);
                            if (nextFactor) setItemFactor(7, item.id, nextFactor);
                          }
                        }}
                      />
                    ))}
                  </div>
                  <ItemFactorSelect categoryId={7} itemId={item.id} method={entry.method} showErrors={showErrors} />
                </article>
              ))}
              <button type="button" className="c7-add" onClick={() => addItem(7)}>
                + Add a commuting group
              </button>
            </div>
          ) : null}
        </section>

        {showSurveyPath ? (
          <>
            <section className="c7-step" aria-labelledby="c7-survey-1">
              <StepHeading
                n={1}
                id="c7-survey-1"
                title="Employee commuting survey"
                body="Create a campaign and share the anonymous link with employees."
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
                      <Stat label="Total employees" value={String(survey.latest.headcount || scaledEmployees || 0)} />
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
                      <p className="c7-wait">Waiting for the first response. Apply will fill the table below.</p>
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

            <section className="c7-step c7-step-table" aria-labelledby="c7-survey-2">
              <StepHeading
                n={2}
                id="c7-survey-2"
                title="Survey data applied"
                body="These are the actual responses, grouped by travelling mode. Emissions here use only people who answered. Confirm or change the emission factor on each row."
              />
              {surveyResponseRows.length ? (
                <div className="c7-survey-table-wrap">
                  <table className="c7-survey-table">
                    <caption className="visually-hidden">Actual survey responses grouped by travelling mode</caption>
                    <thead>
                      <tr>
                        <th scope="col">Group mode</th>
                        <th scope="col">Responses</th>
                        <th scope="col">Distance</th>
                        <th scope="col">Commuting days / year</th>
                        <th scope="col">tCO₂e</th>
                        <th scope="col">Emission factor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {surveyResponseRows.map(({ item, result }) => (
                        <tr key={item.id}>
                          <th scope="row">{commuteModeLabel(item.values.mode || "")}</th>
                          <td>{item.values.employeesSurveyed || "0"}</td>
                          <td>{item.values.oneWayKm ? `${item.values.oneWayKm} km` : "—"}</td>
                          <td>{item.values.commutingDays || "0"}</td>
                          <td>{result.complete ? formatTco2e(result.tco2e) : "—"}</td>
                          <td>
                            <ItemFactorSelect
                              categoryId={7}
                              itemId={item.id}
                              method={entry.method}
                              showErrors={showErrors}
                              compact
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <th scope="row">Responses only</th>
                        <td>{String(responsesGiven)}</td>
                        <td colSpan={2} />
                        <td>{formatTco2e(surveyResponseTco2e)}</td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <p className="c7-empty">No survey totals yet. Apply a campaign with responses to fill this table.</p>
              )}
            </section>

            <section className="c7-step" aria-labelledby="c7-survey-3">
              <StepHeading
                n={3}
                id="c7-survey-3"
                title="Employees who did not respond"
                body="If some employees have not responded, choose one of the three options. Nothing is selected until you pick. Step 2 stays the actual survey results."
              />
              <p className="c7-remainder-lead">
                Total employees for this survey: <strong>{countOrDash(totalEmployees, totalEmployees > 0)}</strong>.
                Responses given: <strong>{countOrDash(responsesGiven, hasSurvey || responsesGiven > 0)}</strong>.
                Not responded: <strong>{countOrDash(notResponded, totalEmployees > 0)}</strong>.
              </p>
              <fieldset className="c7-remainder" disabled={!remainderEnabled}>
                <legend className="mb-3 text-[13px] font-semibold">How remaining employees are treated</legend>
                <div className="grid gap-3 md:grid-cols-3">
                  {(
                    [
                      [
                        "proportional",
                        "Apply proportionally",
                        proportionalDetail,
                      ],
                      [
                        "manual",
                        "Enter remaining details manually",
                        "Add commuting groups for employees who did not take the survey.",
                      ],
                      [
                        "responses-only",
                        "Continue with given responses only",
                        "Keep only the people who answered. Do not scale the remaining employees.",
                      ],
                    ] as const
                  ).map(([id, label, detail]) => (
                    <button
                      key={id}
                      type="button"
                      className="choice"
                      data-on={remainderEnabled && remainder === id ? "true" : "false"}
                      disabled={!remainderEnabled}
                      onClick={() => setCommuteRemainder(id, remainderMeta)}
                    >
                      <span>
                        <strong className="block">{label}</strong>
                        <span className="text-[13px] text-[var(--muted)]">{detail}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </fieldset>
              {!remainderEnabled ? (
                <p className="c7-remainder-note">
                  {hasSurvey && totalEmployees > 0 && notResponded === 0
                    ? "All employees have responded, so this step is not needed."
                    : "This step is enabled only when there is a remaining balance of employees who did not respond."}
                </p>
              ) : !remainder ? (
                <p className="c7-remainder-note">Choose one of the three options. None is selected until you pick.</p>
              ) : null}
              {remainderEnabled && remainder === "proportional" && workingRows.length ? (
                <div className="c7-work">
                  <p>
                    Employees in a mode = total employees × (mode responses ÷ all responses). One-way km and commuting days
                    stay the respondent averages. Then CO₂e = employees × commuting days × 2 × one-way km × emission factor.
                  </p>
                  <ul>
                    {workingRows.map((row) => (
                      <li key={row.mode}>
                        {row.mode}: {row.responses} response{row.responses === 1 ? "" : "s"} → {row.employees} employees
                        {responsesGiven > 0 && totalEmployees > 0
                          ? ` (${totalEmployees} × ${row.responses} ÷ ${responsesGiven})`
                          : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {remainderEnabled && remainder === "responses-only" ? (
                <p className="c7-remainder-note">
                  Only the {responsesGiven} given response{responsesGiven === 1 ? "" : "s"} are used. The {notResponded}{" "}
                  employees who did not respond are left out of Category 7.
                </p>
              ) : null}
              {remainderEnabled && remainder === "manual" ? (
                <div className="c7-method-form">
                  {extraItems.map((item, index) => (
                    <article key={item.id} className="item-card">
                      <div className="item-card-head">
                        <p className="text-[13px] font-semibold">
                          Extra group {index + 1}
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
                            onChange={(value) => {
                              updateItemValues(7, item.id, { [field.id]: value });
                              if (field.id === "mode") {
                                const nextFactor = commuteFactorIdForMode(value);
                                if (nextFactor) setItemFactor(7, item.id, nextFactor);
                              }
                            }}
                          />
                        ))}
                      </div>
                      <ItemFactorSelect categoryId={7} itemId={item.id} method={entry.method} showErrors={showErrors} />
                    </article>
                  ))}
                  <button type="button" className="c7-add" onClick={() => addItem(7)}>
                    + Add a group not in the survey
                  </button>
                </div>
              ) : null}
            </section>
          </>
        ) : null}
      </div>

      <div className="c7-foot">
        <Link href="/activity" className="btn btn-ghost">
          Back
        </Link>
        <div className="c7-foot-actions">
          <button type="button" className="btn btn-ghost" onClick={persistDraft}>
            {syncStatus === "saving" ? "Saving…" : "Save draft"}
          </button>
          <button type="button" className="btn btn-primary" onClick={continueNext}>
            Save
          </button>
        </div>
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
        <label htmlFor="c7-headcount">Total employees</label>
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
  return (
    <ActivityFieldControl
      field={field}
      inputId={`${item.id}-${field.id}`}
      value={item.values[field.id] ?? ""}
      error={error}
      onChange={onChange}
    />
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
