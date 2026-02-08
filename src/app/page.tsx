"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

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

export default function HomePage() {
  const [cases, setCases] = useState<CaseSummary[]>([]);

  useEffect(() => {
    fetch("/api/cases")
      .then((res) => res.json())
      .then((data) => setCases(data.cases));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">CXR Triage</h1>
          <Link
            href="/new-case"
            className="bg-blue-600 text-white px-5 py-2 rounded-lg font-semibold hover:bg-blue-700"
          >
            + New Case
          </Link>
        </div>

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
        ) : (
          <div className="space-y-3">
            {cases.map((c) => (
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