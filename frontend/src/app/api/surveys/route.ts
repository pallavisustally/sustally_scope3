import { NextResponse } from "next/server";
import { commuteSurveyStats, DEFAULT_WEEKS_PER_YEAR, surveyIsClosed } from "@/lib/commute-survey";
import {
  createCommuteSurvey,
  findCompanyForOwner,
  listCommuteResponses,
  listCommuteSurveys,
} from "@/lib/payload-client";
import { requireUser } from "@/lib/require-user";
import { createSurveyToken } from "@/lib/survey-token";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await requireUser();
  if (!auth.user) return auth.response;
  const sessionKey = new URL(request.url).searchParams.get("sessionKey") || "";
  if (!sessionKey) return NextResponse.json({ error: "Missing session." }, { status: 400 });
  try {
    const company = await findCompanyForOwner(sessionKey, auth.user.id);
    if (!company?.id) return NextResponse.json({ surveys: [] });
    const surveys = await listCommuteSurveys(company.id as string | number);
    const rows = await Promise.all(
      surveys.map(async (survey) => {
        const responses = await listCommuteResponses(survey.id);
        return {
          ...survey,
          closed: surveyIsClosed(survey.status, survey.closeAt),
          stats: commuteSurveyStats(responses),
        };
      }),
    );
    return NextResponse.json({ surveys: rows });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load surveys.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if (!auth.user) return auth.response;
  const body = (await request.json().catch(() => ({}))) as {
    sessionKey?: string;
    headcount?: unknown;
    weeksPerYear?: unknown;
    closeAt?: string | null;
    reportingYear?: unknown;
  };
  const sessionKey = body.sessionKey?.trim() || "";
  const headcount = Number(body.headcount);
  const weeksPerYear = Number(body.weeksPerYear);
  if (!sessionKey) return NextResponse.json({ error: "Missing session." }, { status: 400 });
  if (!Number.isFinite(headcount) || headcount <= 0) {
    return NextResponse.json({ error: "Enter the number of employees to scale to." }, { status: 400 });
  }
  try {
    const company = await findCompanyForOwner(sessionKey, auth.user.id);
    if (!company?.id) {
      return NextResponse.json({ error: "Save company setup first, then create the survey." }, { status: 400 });
    }
    const token = createSurveyToken();
    const yearRaw = body.reportingYear == null || body.reportingYear === "" ? company.reportingYear : body.reportingYear;
    const survey = await createCommuteSurvey({
      companyId: company.id as string | number,
      tokenHash: token.tokenHash,
      tokenSuffix: token.tokenSuffix,
      headcount,
      weeksPerYear: Number.isFinite(weeksPerYear) && weeksPerYear > 0 ? weeksPerYear : DEFAULT_WEEKS_PER_YEAR,
      closeAt: body.closeAt ? (body.closeAt.includes("T") ? body.closeAt : `${body.closeAt}T23:59:59`) : null,
      reportingYear: yearRaw == null || yearRaw === "" ? null : Number(yearRaw),
      createdBy: auth.user.id,
    });
    if (!survey?.id) return NextResponse.json({ error: "Could not create the survey." }, { status: 500 });
    return NextResponse.json({
      survey: { ...survey, closed: false, stats: commuteSurveyStats([]) },
      token: token.token,
      path: `/s/${token.token}`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create the survey.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
