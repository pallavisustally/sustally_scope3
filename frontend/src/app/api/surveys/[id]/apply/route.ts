import { NextResponse } from "next/server";
import { aggregateCommuteResponses, surveyIsClosed } from "@/lib/commute-survey";
import { findCompanyForOwner, getCommuteSurvey, listCommuteResponses } from "@/lib/payload-client";
import { requireUser } from "@/lib/require-user";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (!auth.user) return auth.response;
  const { id } = await context.params;
  const body = (await request.json().catch(() => ({}))) as { sessionKey?: string };
  const sessionKey = body.sessionKey?.trim() || "";
  if (!sessionKey) return NextResponse.json({ error: "Missing session." }, { status: 400 });
  try {
    const survey = await getCommuteSurvey(id);
    if (!survey) return NextResponse.json({ error: "Survey not found." }, { status: 404 });
    const company = await findCompanyForOwner(sessionKey, auth.user.id);
    if (!company?.id || String(company.id) !== survey.companyId) {
      return NextResponse.json({ error: "Survey not found." }, { status: 404 });
    }
    const responses = await listCommuteResponses(survey.id);
    if (!responses.length) {
      return NextResponse.json({ error: "No responses to apply yet." }, { status: 400 });
    }
    const { items, stats } = aggregateCommuteResponses({
      surveyId: survey.id,
      headcount: survey.headcount,
      weeksPerYear: survey.weeksPerYear,
      responses,
    });
    return NextResponse.json({
      surveyId: survey.id,
      closed: surveyIsClosed(survey.status, survey.closeAt),
      stats,
      items,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not apply the survey.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
