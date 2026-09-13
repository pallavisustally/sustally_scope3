import { NextResponse } from "next/server";
import { formatReportingYear } from "@/lib/reporting-year";
import { surveyIsClosed, validateCommuteResponse } from "@/lib/commute-survey";
import {
  createCommuteResponse,
  findCommuteSurveyByTokenHash,
  getCommuteSurvey,
  getCompanyById,
} from "@/lib/payload-client";
import { hashSurveyToken } from "@/lib/survey-token";

export const runtime = "nodejs";

async function companyNameFor(companyId: string) {
  try {
    const company = await getCompanyById(companyId);
    const name = typeof company?.name === "string" ? company.name : "";
    return name.trim();
  } catch {
    return "";
  }
}

async function loadPublicSurvey(token: string) {
  const trimmed = token.trim();
  if (!trimmed) return null;
  const survey = await findCommuteSurveyByTokenHash(hashSurveyToken(trimmed));
  if (!survey) return null;
  const fresh = await getCommuteSurvey(survey.id);
  return fresh ?? survey;
}

export async function GET(_request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  try {
    const survey = await loadPublicSurvey(decodeURIComponent(token));
    if (!survey) return NextResponse.json({ error: "This survey link is not valid." }, { status: 404 });
    const closed = surveyIsClosed(survey.status, survey.closeAt);
    const companyName = await companyNameFor(survey.companyId);
    return NextResponse.json({
      companyName: companyName || "your company",
      year: survey.reportingYear ? formatReportingYear(String(survey.reportingYear)) : "",
      closed,
    });
  } catch {
    return NextResponse.json({ error: "Could not open this survey." }, { status: 500 });
  }
}

export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  try {
    const survey = await loadPublicSurvey(decodeURIComponent(token));
    if (!survey) return NextResponse.json({ error: "This survey link is not valid." }, { status: 404 });
    if (surveyIsClosed(survey.status, survey.closeAt)) {
      return NextResponse.json({ error: "This survey is closed." }, { status: 410 });
    }
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const parsed = validateCommuteResponse(body);
    if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const saved = await createCommuteResponse({
      surveyId: survey.id,
      commuteDays: parsed.value.commuteDays,
      wfhDays: parsed.value.wfhDays,
      offDays: parsed.value.offDays,
      mode: parsed.value.mode,
      oneWayKm: parsed.value.oneWayKm,
      region: parsed.value.region,
      workplaceType: parsed.value.workplaceType,
    });
    if (!saved) return NextResponse.json({ error: "Could not save the response." }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save the response.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
