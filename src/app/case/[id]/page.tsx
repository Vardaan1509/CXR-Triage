"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import Markdown from "react-markdown";

type Vital = {
  value: "low" | "normal" | "high" | null;
  individualBaseline: boolean;
};

type Resolution =
  | "no_finding"
  | "pneumonia"
  | "nodule"
  | "pneumothorax"
  | "other"
  | null;

type Case = {
  id: string;
  patient: {
    name: string;
    age: number;
    sex: string;
    chiefComplaint: string;
    vitals: {
      spo2: Vital;
      bp: Vital;
      rr: Vital;
      hr: Vital;
      temperature: Vital;
    };
    symptoms: {
      breathlessness: string | null;
      dyspneaOnExertion: string | null;
      cough: string | null;
      chestPain: string | null;
      sputum: string | null;
      hemoptysis: string | null;
    };
    examFindings: {
      breathSounds: string | null;
      crackles: string | null;
      bronchialBreathSounds: string | null;
      trachealDeviation: string | null;
    };
    smoker: boolean;
    immunocompromised: boolean;
  };
  imageData: string | null;
  predictions: {
    pneumothorax: number;
    pneumonia: number;
    nodule: number;
  };
  triage: {
    level: "URGENT" | "REVIEW" | "ROUTINE";
    reason: string;
    flags: {
      pneumothorax: "low" | "review" | "urgent";
      pneumonia: "low" | "review" | "urgent";
      nodule: "low" | "review" | "urgent";
    };
  };
  resolution: Resolution;
  resolutionNotes: string | null;
  resolvedAt: string | null;
  similarCaseId: string | null;
  similarityScore: number | null;
  report: string | null;
  createdAt: string;
};

const BADGE_COLORS = {
  URGENT: "bg-red-600",
  REVIEW: "bg-yellow-500",
  ROUTINE: "bg-green-600",
};

const FLAG_COLORS = {
  urgent: "text-red-600",
  review: "text-yellow-600",
  low: "text-green-600",
};

const VITAL_LABELS: Record<string, string> = {
  spo2: "SpO₂",
  bp: "Blood Pressure",
  rr: "Respiratory Rate",
  hr: "Heart Rate",
  temperature: "Temperature",
};

const SYMPTOM_LABELS: Record<string, string> = {
  breathlessness: "Breathlessness",
  dyspneaOnExertion: "Dyspnea on Exertion",
  cough: "Cough",
  chestPain: "Chest Pain",
  sputum: "Sputum",
  hemoptysis: "Hemoptysis",
};

const EXAM_LABELS: Record<string, string> = {
  breathSounds: "Breath Sounds (decreased)",
  crackles: "Crackles",
  bronchialBreathSounds: "Bronchial Breath Sounds",
  trachealDeviation: "Tracheal Deviation",
};

function CollapsibleSection({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white rounded-lg shadow mb-6 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full p-6 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
      >
        <h2 className="text-lg font-semibold text-gray-800">
          {title}
          <span className="text-sm font-normal text-gray-400 ml-2">
            ({count} recorded)
          </span>
        </h2>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
      <div
        className={`transition-all duration-300 ease-in-out ${
          open ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="px-6 pb-6">{children}</div>
      </div>
    </div>
  );
}

const RESOLUTION_OPTIONS = [
  { value: "no_finding", label: "No Finding" },
  { value: "pneumonia", label: "Pneumonia" },
  { value: "nodule", label: "Nodule" },
  { value: "pneumothorax", label: "Pneumothorax" },
  { value: "other", label: "Other" },
];

export default function CasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [report, setReport] = useState<string | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [selectedResolution, setSelectedResolution] = useState<string | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [similarCase, setSimilarCase] = useState<Case | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/cases/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Case not found");
        return res.json();
      })
      .then(async (data) => {
        setCaseData(data.caseData);

        // Fetch similar case if one exists
        if (data.caseData.similarCaseId) {
          try {
            const simRes = await fetch(`/api/cases/${data.caseData.similarCaseId}`);
            if (simRes.ok) {
              const simData = await simRes.json();
              setSimilarCase(simData.caseData);
            }
          } catch {
            // ignore — similar case is optional
          }
        }

        setLoadingReport(true);
        try {
          const res = await fetch("/api/report", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              patient: data.caseData.patient,
              predictions: data.caseData.predictions,
              triage: data.caseData.triage,
            }),
          });
          const reportData = await res.json();
          setReport(reportData.report);
        } catch {
          setReport("Failed to generate report.");
        } finally {
          setLoadingReport(false);
        }
      })
      .catch(() => setError("Case not found"));
  }, [id]);

  function openConfirm(resolution: string) {
    setSelectedResolution(resolution);
    setShowConfirm(true);
  }

  async function confirmResolve() {
    if (!selectedResolution) return;
    setResolving(true);
    setShowConfirm(false);
    try {
      const res = await fetch(`/api/cases/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resolution: selectedResolution,
          notes: resolutionNotes.trim() || null,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setCaseData(data.caseData);
      } else {
        const errData = await res.json().catch(() => ({}));
        alert("Failed to resolve case: " + (errData.error || res.statusText));
      }
    } catch {
      alert("Failed to resolve case: network error");
    } finally {
      setResolving(false);
      setSelectedResolution(null);
    }
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-red-600 text-lg">{error}</p>
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500 text-lg">Loading case...</p>
      </div>
    );
  }

  const filledVitals = Object.entries(caseData.patient.vitals).filter(
    ([, v]) => v.value !== null
  );
  const filledSymptoms = Object.entries(caseData.patient.symptoms).filter(
    ([, v]) => v !== null
  );
  const filledExam = Object.entries(caseData.patient.examFindings).filter(
    ([, v]) => v !== null
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Back Button */}
        <a
          href="/"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to all cases
        </a>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Case: {caseData.patient.name}
          </h1>
          <span
            className={`${BADGE_COLORS[caseData.triage.level]} text-white px-5 py-2 rounded-full text-lg font-bold`}
          >
            {caseData.triage.level}
          </span>
        </div>

        {/* Patient Info */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">
            Patient Information
          </h2>
          <div className="text-sm text-gray-700 space-y-1">
            <p>
              Age: {caseData.patient.age} • Sex: {caseData.patient.sex}
            </p>
            {caseData.patient.chiefComplaint && (
              <p>Chief Complaint: {caseData.patient.chiefComplaint}</p>
            )}
            <p>
              Smoker: {caseData.patient.smoker ? "Yes" : "No"} •
              Immunocompromised:{" "}
              {caseData.patient.immunocompromised ? "Yes" : "No"}
            </p>
          </div>
        </div>

        {/* Chest X-Ray Image */}
        {caseData.imageData && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">
              Chest X-Ray
            </h2>
            <img
              src={caseData.imageData}
              alt="Chest X-Ray"
              className="max-w-full max-h-96 rounded border mx-auto"
            />
          </div>
        )}

        {/* Collapsible Clinical Details */}
        {filledVitals.length > 0 && (
          <CollapsibleSection title="Vitals" count={filledVitals.length}>
            <div className="space-y-2 text-sm text-gray-700">
              {filledVitals.map(([key, v]) => (
                <div key={key} className="flex justify-between">
                  <span>{VITAL_LABELS[key]}</span>
                  <span className="font-medium">
                    {(v as Vital).value?.toUpperCase()}
                    {(v as Vital).individualBaseline && (
                      <span className="text-xs text-gray-400 ml-1">
                        (individual baseline)
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </CollapsibleSection>
        )}

        {filledSymptoms.length > 0 && (
          <CollapsibleSection title="Symptoms" count={filledSymptoms.length}>
            <div className="space-y-2 text-sm text-gray-700">
              {filledSymptoms.map(([key, v]) => (
                <div key={key} className="flex justify-between">
                  <span>{SYMPTOM_LABELS[key]}</span>
                  <span className="font-medium">
                    {(v as string).toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          </CollapsibleSection>
        )}

        {filledExam.length > 0 && (
          <CollapsibleSection title="Exam Findings" count={filledExam.length}>
            <div className="space-y-2 text-sm text-gray-700">
              {filledExam.map(([key, v]) => (
                <div key={key} className="flex justify-between">
                  <span>{EXAM_LABELS[key]}</span>
                  <span className="font-medium">
                    {(v as string).toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          </CollapsibleSection>
        )}

        {/* Triage Reason */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">
            Triage Summary
          </h2>
          <p className="text-sm text-gray-700">{caseData.triage.reason}</p>
        </div>

        {/* Predictions */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Model Predictions
          </h2>
          {(
            Object.entries(caseData.predictions) as [string, number][]
          ).map(([condition, probability]) => (
            <div key={condition} className="mb-4">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium text-gray-700 capitalize">
                  {condition}
                </span>
                <span className="text-sm">
                  <span className="font-semibold">
                    {(probability * 100).toFixed(1)}%
                  </span>
                  {" — "}
                  <span
                    className={`font-semibold ${FLAG_COLORS[caseData.triage.flags[condition as keyof typeof caseData.triage.flags]]}`}
                  >
                    {caseData.triage.flags[
                      condition as keyof typeof caseData.triage.flags
                    ].toUpperCase()}
                  </span>
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-blue-500 h-3 rounded-full"
                  style={{ width: `${probability * 100}%` }}
                />
              </div>
            </div>
          ))}
          <div
            className={`mt-6 p-3 rounded-lg ${
              caseData.triage.level === "URGENT"
                ? "bg-red-50 border border-red-200"
                : caseData.triage.level === "REVIEW"
                  ? "bg-yellow-50 border border-yellow-200"
                  : "bg-green-50 border border-green-200"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-700">
                Overall Assessment
              </span>
              <span
                className={`font-bold ${
                  caseData.triage.level === "URGENT"
                    ? "text-red-600"
                    : caseData.triage.level === "REVIEW"
                      ? "text-yellow-600"
                      : "text-green-600"
                }`}
              >
                {caseData.triage.level}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {caseData.triage.reason}
            </p>
          </div>
          <p className="text-xs text-gray-400 mt-4">
            Model: ResNet50 CXR •{" "}
            {new Date(caseData.createdAt).toLocaleString()}
          </p>
        </div>

        {/* Report */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">
            AI-Generated Report
          </h2>
          {report ? (
            <div className="prose prose-sm max-w-none text-gray-700 bg-gray-50 p-4 rounded">
              <Markdown>{report}</Markdown>
            </div>
          ) : loadingReport ? (
            <p className="text-sm text-gray-500">Generating report...</p>
          ) : null}
        </div>

        {/* Similar Resolved Case */}
        {similarCase && caseData.similarityScore && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold text-indigo-800 mb-2">
              Similar Resolved Case
            </h2>
            <div className="bg-white rounded-lg p-4 border border-indigo-100">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="font-semibold text-gray-900">
                    {similarCase.patient.name}
                  </p>
                  <p className="text-sm text-gray-500">
                    {similarCase.patient.age}y {similarCase.patient.sex}
                  </p>
                </div>
                <div className="text-right">
                  <span className="inline-block bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-semibold">
                    Resolved: {similarCase.resolution?.replace("_", " ").toUpperCase()}
                  </span>
                </div>
              </div>
              <Link
                href={`/case/${similarCase.id}`}
                className="text-sm text-indigo-600 font-semibold hover:underline"
              >
                View full case →
              </Link>
            </div>
          </div>
        )}

        {/* Resolve Case */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">
            Resolve Case
          </h2>
          {caseData.resolution ? (
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="inline-block bg-purple-100 text-purple-800 px-4 py-2 rounded-full font-semibold">
                  {caseData.resolution.replace("_", " ").toUpperCase()}
                </span>
                <span className="text-sm text-gray-500">
                  Resolved {caseData.resolvedAt ? new Date(caseData.resolvedAt).toLocaleString() : ""}
                </span>
              </div>
              {caseData.resolutionNotes && (
                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded mt-2">
                  <span className="font-medium text-gray-700">Notes: </span>
                  {caseData.resolutionNotes}
                </p>
              )}
            </div>
          ) : (
            <div>
              <p className="text-sm text-gray-500 mb-3">
                Record the final clinical diagnosis for this case:
              </p>
              <textarea
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="Optional notes (e.g. clinical reasoning, follow-up needed...)"
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm mb-3"
                rows={2}
              />
              <div className="flex flex-wrap gap-2">
                {RESOLUTION_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => openConfirm(opt.value)}
                    disabled={resolving}
                    className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-purple-50 hover:border-purple-400 hover:text-purple-700 transition-colors disabled:opacity-50"
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Confirmation Modal */}
        {showConfirm && selectedResolution && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Confirm Resolution
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Are you sure you want to resolve this case as{" "}
                <span className="font-semibold text-purple-700">
                  {RESOLUTION_OPTIONS.find((o) => o.value === selectedResolution)?.label}
                </span>
                ?
              </p>
              {resolutionNotes.trim() && (
                <div className="bg-gray-50 rounded p-3 mb-4">
                  <p className="text-xs text-gray-500 mb-1">Notes:</p>
                  <p className="text-sm text-gray-700">{resolutionNotes}</p>
                </div>
              )}
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowConfirm(false);
                    setSelectedResolution(null);
                  }}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmResolve}
                  disabled={resolving}
                  className="px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 disabled:opacity-50"
                >
                  {resolving ? "Resolving..." : "Confirm"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Export */}
        <button
          onClick={() => {
            const bundle = { ...caseData, report };
            const blob = new Blob([JSON.stringify(bundle, null, 2)], {
              type: "application/json",
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `case-${caseData.id}.json`;
            a.click();
          }}
          className="w-full bg-gray-800 text-white py-3 rounded-lg font-semibold hover:bg-gray-900"
        >
          Export Case Bundle (JSON)
        </button>
      </div>
    </div>
  );
}