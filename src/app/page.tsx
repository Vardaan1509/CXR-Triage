"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import supabaseClient from "@/lib/supabaseClient";

type CaseSummary = {
  id: string;
  patient: {
    name: string;
    age: number;
    sex: string;
  };
  triage: {
    level: "URGENT" | "REVIEW" | "ROUTINE";
  };
  resolution: string | null;
  createdAt: string;
};

const BADGE_COLORS = {
  URGENT: "bg-red-600",
  REVIEW: "bg-yellow-500",
  ROUTINE: "bg-green-600",
};

type Filter = "URGENT" | "REVIEW" | "ROUTINE" | "RESOLVED" | null;

export default function HomePage() {
  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [filter, setFilter] = useState<Filter>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data: { session } = {} } = await (supabaseClient as any).auth.getSession();
        const token = session?.access_token;
        const res = await fetch("/api/cases", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await res.json();
        setCases(Array.isArray(data?.cases) ? data.cases : []);
      } catch (err) {
        setCases([]);
      }
    })();
  }, []);

  const urgent = cases.filter((c) => c.triage.level === "URGENT").length;
  const review = cases.filter((c) => c.triage.level === "REVIEW").length;
  const routine = cases.filter((c) => c.triage.level === "ROUTINE").length;
  const resolved = cases.filter((c) => c.resolution).length;

  function toggleFilter(f: Filter) {
    setFilter((prev) => (prev === f ? null : f));
  }

  const filteredCases = cases.filter((c) => {
    if (!filter) return true;
    if (filter === "RESOLVED") return !!c.resolution;
    return c.triage.level === filter;
  });

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <Link
            href="/new-case"
            className="bg-blue-600 text-white px-5 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            + New Case
          </Link>
        </div>

        {/* Triage Stats — clickable filters */}
        {cases.length > 0 && (
          <div className="grid grid-cols-4 gap-3 mb-6">
            <button
              onClick={() => toggleFilter("URGENT")}
              className={`bg-white rounded-lg shadow p-4 border-l-4 border-red-500 text-left transition-all cursor-pointer ${filter === "URGENT" ? "ring-2 ring-red-400 shadow-md" : "hover:shadow-md"}`}
            >
              <p className="text-2xl font-bold text-red-600">{urgent}</p>
              <p className="text-xs text-gray-500 font-medium">Urgent</p>
            </button>
            <button
              onClick={() => toggleFilter("REVIEW")}
              className={`bg-white rounded-lg shadow p-4 border-l-4 border-yellow-500 text-left transition-all cursor-pointer ${filter === "REVIEW" ? "ring-2 ring-yellow-400 shadow-md" : "hover:shadow-md"}`}
            >
              <p className="text-2xl font-bold text-yellow-600">{review}</p>
              <p className="text-xs text-gray-500 font-medium">Review</p>
            </button>
            <button
              onClick={() => toggleFilter("ROUTINE")}
              className={`bg-white rounded-lg shadow p-4 border-l-4 border-green-500 text-left transition-all cursor-pointer ${filter === "ROUTINE" ? "ring-2 ring-green-400 shadow-md" : "hover:shadow-md"}`}
            >
              <p className="text-2xl font-bold text-green-600">{routine}</p>
              <p className="text-xs text-gray-500 font-medium">Routine</p>
            </button>
            <button
              onClick={() => toggleFilter("RESOLVED")}
              className={`bg-white rounded-lg shadow p-4 border-l-4 border-purple-500 text-left transition-all cursor-pointer ${filter === "RESOLVED" ? "ring-2 ring-purple-400 shadow-md" : "hover:shadow-md"}`}
            >
              <p className="text-2xl font-bold text-purple-600">{resolved}</p>
              <p className="text-xs text-gray-500 font-medium">Resolved</p>
            </button>
          </div>
        )}

        {/* Active filter label */}
        {filter && (
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm text-gray-500">
              Showing <span className="font-semibold text-gray-700">{filter === "RESOLVED" ? "Resolved" : filter.charAt(0) + filter.slice(1).toLowerCase()}</span> cases ({filteredCases.length})
            </span>
            <button
              onClick={() => setFilter(null)}
              className="text-xs text-blue-600 hover:underline"
            >
              Clear filter
            </button>
          </div>
        )}

        {cases.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500 text-lg mb-4">No cases yet</p>
            <Link
              href="/new-case"
              className="text-blue-600 font-semibold hover:underline"
            >
              Create your first case →
            </Link>
          </div>
        ) : filteredCases.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500">No cases match this filter</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredCases.map((c) => (
              <Link
                key={c.id}
                href={`/case/${c.id}`}
                className="block bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">
                      {c.patient.name}
                      {c.resolution && (
                        <span className="ml-2 inline-block bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-xs font-medium">
                          Resolved
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-gray-500">
                      {c.patient.age}y {c.patient.sex} •{" "}
                      {new Date(c.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <span
                    className={`${BADGE_COLORS[c.triage.level]} text-white px-3 py-1 rounded-full text-sm font-bold`}
                  >
                    {c.triage.level}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}