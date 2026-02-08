import { NextResponse } from "next/server";
import { getCase, updateCase } from "@/lib/store";
import { getDoctorIdFromReq, getDoctorEmailFromReq } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { addAuditEntry } from "@/lib/auditLog";

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  // Prefer server-side DB check when Supabase is configured
  if (process.env.SUPABASE_URL) {
    try {
      // verify requester
      const requesterDoctorId = await getDoctorIdFromReq(req);

      const { data, error } = await supabase.from("cases").select("id, data, doctor_id").eq("id", id).limit(1).single();
      if (error || !data) {
        return NextResponse.json({ error: "Case not found" }, { status: 404 });
      }

      const ownerId = data.doctor_id;
      if (!requesterDoctorId || requesterDoctorId !== ownerId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }

      addAuditEntry("CASE_VIEWED", id, requesterDoctorId || "unknown");
      return NextResponse.json({ caseData: data.data });
    } catch (err) {
      console.error("case fetch error", err);
      return NextResponse.json({ error: "Failed to fetch case" }, { status: 500 });
    }
  }

  // Fallback to in-memory store for dev
  const caseData = await getCase(id);
  if (!caseData) {
    return NextResponse.json({ error: "Case not found" }, { status: 404 });
  }

  // no auth in dev fallback
  const email = await getDoctorEmailFromReq(req);
  addAuditEntry("CASE_VIEWED", id, email);
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

  const email = await getDoctorEmailFromReq(req);
  addAuditEntry("CASE_RESOLVED", id, email, `Diagnosis: ${resolution}${notes ? `, Notes: ${notes}` : ""}`);

  return NextResponse.json({ caseData: updated });
}