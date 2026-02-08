import { NextResponse } from "next/server";
import { getCase, updateCase } from "@/lib/store";

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const caseData = getCase(id);

  if (!caseData) {
    return NextResponse.json({ error: "Case not found" }, { status: 404 });
  }

  return NextResponse.json({ caseData });
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const body = await req.json();
  const { resolution, notes } = body;

  const valid = ["no_finding", "pneumonia", "nodule", "pneumothorax", "other"];
  if (!valid.includes(resolution)) {
    return NextResponse.json({ error: "Invalid resolution" }, { status: 400 });
  }

  const updated = updateCase(id, {
    resolution,
    resolutionNotes: notes || null,
    resolvedAt: new Date().toISOString(),
  });

  if (!updated) {
    return NextResponse.json({ error: "Case not found" }, { status: 404 });
  }

  return NextResponse.json({ caseData: updated });
}