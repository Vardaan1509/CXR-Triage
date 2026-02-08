import { NextResponse } from "next/server";
import { getAuditLog } from "@/lib/auditLog";

export async function GET() {
  const entries = getAuditLog();
  return NextResponse.json({ entries });
}
