import { NextResponse } from "next/server";
import { saveCase, getAllCases } from "@/lib/store";
import { computeTriage } from "@/lib/triage";
import { findMostSimilarCase } from "@/lib/similarity";

export async function POST(req: Request) {
  const body = await req.json();
  const { patient, predictions, imageFilename, imageData } = body;

  const triage = computeTriage(predictions);
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  const newCase = {
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
  const match = findMostSimilarCase(newCase);
  if (match) {
    newCase.similarCaseId = match.caseId;
    newCase.similarityScore = match.score;
  }

  saveCase(newCase);

  return NextResponse.json({ id });
}

export async function GET() {
  return NextResponse.json({ cases: getAllCases() });
}