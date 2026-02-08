"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type AuditEntry = {
  id: string;
  timestamp: string;
  action: string;
  caseId: string;
  user: string;
  details: string | null;
};

const ACTION_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  CASE_CREATED: { label: "Case Created", color: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
  REPORT_GENERATED: { label: "Report Generated", color: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
  CASE_VIEWED: { label: "Case Viewed", color: "text-gray-600", bg: "bg-gray-50 border-gray-200" },
  CASE_RESOLVED: { label: "Case Resolved", color: "text-purple-700", bg: "bg-purple-50 border-purple-200" },
};

type ActionFilter = "ALL" | "CASE_CREATED" | "REPORT_GENERATED" | "CASE_VIEWED" | "CASE_RESOLVED";

export default function AuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ActionFilter>("ALL");
  const [caseFilter, setCaseFilter] = useState<string>("");

  useEffect(() => {
    fetch("/api/audit")
      .then((r) => r.json())
      .then((data) => setEntries(data.entries || []))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, []);

  // Unique case IDs for the dropdown
  const uniqueCaseIds = Array.from(new Set(entries.map((e) => e.caseId))).sort();

  const filtered = entries.filter((e) => {
    if (filter !== "ALL" && e.action !== filter) return false;
    if (caseFilter && e.caseId !== caseFilter) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
          <Link
            href="/"
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            ← Back to Dashboard
          </Link>
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          {(
            [
              { key: "ALL", label: "All" },
              { key: "CASE_CREATED", label: "Created" },
              { key: "REPORT_GENERATED", label: "Reports" },
              { key: "CASE_VIEWED", label: "Viewed" },
              { key: "CASE_RESOLVED", label: "Resolved" },
            ] as { key: ActionFilter; label: string }[]
          ).map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === f.key
                  ? "bg-gray-900 text-white"
                  : "bg-white border border-gray-300 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {f.label}
            </button>
          ))}

          {/* Divider */}
          <div className="w-px h-6 bg-gray-300 mx-1" />

          {/* Case filter dropdown */}
          <select
            value={caseFilter}
            onChange={(e) => setCaseFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-white border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <option value="">All Cases</option>
            {uniqueCaseIds.map((cid) => (
              <option key={cid} value={cid}>
                {cid}
              </option>
            ))}
          </select>

          <span className="text-sm text-gray-400 self-center ml-2">
            {filtered.length} {filtered.length === 1 ? "entry" : "entries"}
          </span>

          {/* Clear all filters */}
          {(filter !== "ALL" || caseFilter) && (
            <button
              onClick={() => { setFilter("ALL"); setCaseFilter(""); }}
              className="text-xs text-blue-600 hover:underline self-center ml-1"
            >
              Clear filters
            </button>
          )}
        </div>

        {loading ? (
          <div className="space-y-3 animate-pulse">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow p-4">
                <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500">
              {entries.length === 0
                ? "No audit entries yet. Actions will be logged as you use the system."
                : "No entries match the current filters."}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((entry) => {
              const style = ACTION_STYLES[entry.action] || {
                label: entry.action,
                color: "text-gray-600",
                bg: "bg-gray-50 border-gray-200",
              };
              return (
                <div
                  key={entry.id}
                  className={`bg-white rounded-lg shadow-sm border p-4 flex items-start gap-4 ${style.bg}`}
                >
                  {/* Action badge */}
                  <div className="flex-shrink-0 pt-0.5">
                    <span
                      className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full ${style.color} bg-white border`}
                    >
                      {style.label}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        href={`/case/${entry.caseId}`}
                        className="text-sm font-semibold text-blue-600 hover:underline"
                      >
                        Case {entry.caseId}
                      </Link>
                      <span className="text-xs text-gray-400">•</span>
                      <span className="text-xs text-gray-500">{entry.user}</span>
                    </div>
                    {entry.details && (
                      <p className="text-sm text-gray-600 mt-1">{entry.details}</p>
                    )}
                  </div>

                  {/* Timestamp */}
                  <div className="flex-shrink-0 text-right">
                    <p className="text-xs text-gray-400">
                      {new Date(entry.timestamp).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(entry.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
