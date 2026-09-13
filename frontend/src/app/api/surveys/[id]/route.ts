import { NextResponse } from "next/server";
import { commuteSurveyStats, surveyIsClosed } from "@/lib/commute-survey";
import { findCompanyForOwner, getCommuteSurvey, listCommuteResponses, updateCommuteSurvey } from "@/lib/payload-client";
import { requireUser } from "@/lib/require-user";

export const runtime = "nodejs";

async function ownedSurvey(id: string, ownerId: string, sessionKey: string) {
  const survey = await getCommuteSurvey(id);
  if (!survey) return { error: "Survey not found.", status: 404 as const };
  const company = await findCompanyForOwner(sessionKey, ownerId);
  if (!company?.id || String(company.id) !== survey.companyId) {
    return { error: "Survey not found.", status: 404 as const };
  }
  return { survey };
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (!auth.user) return auth.response;
  const { id } = await context.params;
  const body = (await request.json().catch(() => ({}))) as {
    sessionKey?: string;
    status?: "open" | "closed";
    headcount?: number;
    weeksPerYear?: number;
    closeAt?: string | null;
  };
  const sessionKey = body.sessionKey?.trim() || "";
  if (!sessionKey) return NextResponse.json({ error: "Missing session." }, { status: 400 });
  try {
    const found = await ownedSurvey(id, auth.user.id, sessionKey);
    if ("error" in found) return NextResponse.json({ error: found.error }, { status: found.status });
    const survey = await updateCommuteSurvey(id, {
      status: body.status ?? found.survey.status,
      headcount: body.headcount ?? found.survey.headcount,
      weeksPerYear: body.weeksPerYear ?? found.survey.weeksPerYear,
      closeAt: body.closeAt === undefined ? found.survey.closeAt : body.closeAt,
    });
    if (!survey) return NextResponse.json({ error: "Could not update the survey." }, { status: 500 });
    const responses = await listCommuteResponses(survey.id);
    return NextResponse.json({
      survey: {
        ...survey,
        closed: surveyIsClosed(survey.status, survey.closeAt),
        stats: commuteSurveyStats(responses),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update the survey.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
