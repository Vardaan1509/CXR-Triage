export type AuditAction =
  | "CASE_CREATED"
  | "REPORT_GENERATED"
  | "CASE_VIEWED"
  | "CASE_RESOLVED";

export type AuditEntry = {
  id: string;
  timestamp: string;
  action: AuditAction;
  caseId: string;
  user: string; // email or user id
  details: string | null;
};

// Persist across Turbopack hot reloads (same pattern as case store)
const g = globalThis as unknown as { __cxrAuditLog: AuditEntry[] };
if (!g.__cxrAuditLog) {
  g.__cxrAuditLog = [];
}
const log = g.__cxrAuditLog;

export function addAuditEntry(
  action: AuditAction,
  caseId: string,
  user: string,
  details?: string | null,
) {
  const entry: AuditEntry = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    timestamp: new Date().toISOString(),
    action,
    caseId,
    user: user || "unknown",
    details: details ?? null,
  };
  log.unshift(entry); // newest first
  // Cap at 500 entries to avoid unbounded memory growth
  if (log.length > 500) log.length = 500;
}

export function getAuditLog(): AuditEntry[] {
  return log;
}
