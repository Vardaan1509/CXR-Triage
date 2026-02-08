import { NextResponse } from "next/server";
import { saveCase, getAllCases, type Case } from "@/lib/store";
import { computeTriage } from "@/lib/triage";
import { getDoctorIdFromReq } from "@/lib/auth";
import { findMostSimilarCase } from "@/lib/similarity";

export async function POST(req: Request) {
  const body = await req.json();
  const { patient, predictions, imageFilename, imageData } = body;

  // Authenticate the request via Bearer token; require a valid doctor session
  const tokenDoctorId = await getDoctorIdFromReq(req);
  if (!tokenDoctorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const effectiveDoctorId = tokenDoctorId;

  const triage = computeTriage(predictions);
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  const caseObj: Case = {
    id,
    patient,
    predictions,
    triage,
    imageFilename,
    imageData: imageData || null,
    report: null,
    resolution: null,
    resolutionNotes: null,
    resolvedAt: null,
    similarCaseId: null,
    similarityScore: null,
    createdAt: new Date().toISOString(),
  };

  // Find the most similar resolved case before saving
  const match = findMostSimilarCase(caseObj);
  if (match) {
    caseObj.similarCaseId = match.caseId as string | null;
    caseObj.similarityScore = match.score;
  }

  await saveCase(caseObj, effectiveDoctorId);
  return NextResponse.json({ id });
}

export async function GET(req: Request) {
  // If Supabase is configured, require authentication and return only that doctor's cases
  if (process.env.SUPABASE_URL) {
    const doctorId = await getDoctorIdFromReq(req);
    if (!doctorId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const cases = await getAllCases(doctorId);
    return NextResponse.json({ cases });
  }

  // Dev fallback: return all in-memory cases
  const cases = await getAllCases();
  return NextResponse.json({ cases });
}