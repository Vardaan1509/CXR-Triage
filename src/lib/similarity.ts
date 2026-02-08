import { Case, getResolvedCases } from "./store";

const SIMILARITY_THRESHOLD = 0.6; // 60%

// ── Ordinal scales for adjacency scoring ────────────────────────────────────
const VITAL_SCALE = ["low", "normal", "high"];
const EXAM_SCALE = ["absent", "normal", "present"];

function ordinalScore(
  a: string | null,
  b: string | null,
  scale: string[],
  maxPts: number,
  adjacentPts: number
): { earned: number; max: number } {
  // If either is null, skip this field entirely
  if (a === null || b === null) return { earned: 0, max: 0 };
  if (a === b) return { earned: maxPts, max: maxPts };
  const diff = Math.abs(scale.indexOf(a) - scale.indexOf(b));
  return { earned: diff === 1 ? adjacentPts : 0, max: maxPts };
}

// ── Compute similarity between two cases (percentage-based) ─────────────────
export function computeSimilarity(a: Case, b: Case): number {
  let earned = 0;
  let maxPossible = 0;

  // ── Demographics + Risk Factors (always present, 9 max) ───────────────
  // Sex: 2 pts
  maxPossible += 2;
  if (a.patient.sex === b.patient.sex) earned += 2;

  // Age: 3 pts max
  maxPossible += 3;
  const ageDiff = Math.abs(a.patient.age - b.patient.age);
  if (ageDiff <= 5) earned += 3;
  else if (ageDiff <= 10) earned += 1;

  // Smoker: 2 pts
  maxPossible += 2;
  if (a.patient.smoker === b.patient.smoker) earned += 2;

  // Immunocompromised: 2 pts
  maxPossible += 2;
  if (a.patient.immunocompromised === b.patient.immunocompromised) earned += 2;

  // ── Predictions (10 pts each, 30 max — always present) ────────────────
  if (a.predictions && b.predictions) {
    const conditions = ["pneumothorax", "pneumonia", "nodule"] as const;
    for (const cond of conditions) {
      maxPossible += 10;
      const diff = Math.abs(a.predictions[cond] - b.predictions[cond]);
      if (diff <= 0.05) earned += 10;
      else if (diff <= 0.10) earned += 6;
      else if (diff <= 0.20) earned += 3;
    }
  }

  // ── Exam Findings (2 pts each, 8 max — only non-null pairs) ──────────
  const examKeys = [
    "breathSounds",
    "crackles",
    "bronchialBreathSounds",
    "trachealDeviation",
  ] as const;
  for (const key of examKeys) {
    const result = ordinalScore(
      a.patient.examFindings[key],
      b.patient.examFindings[key],
      EXAM_SCALE,
      2,
      0.5
    );
    earned += result.earned;
    maxPossible += result.max;
  }

  // ── Symptoms (1 pt each, 6 max — only non-null pairs) ────────────────
  const symptomKeys = [
    "breathlessness",
    "dyspneaOnExertion",
    "cough",
    "chestPain",
    "sputum",
    "hemoptysis",
  ] as const;
  for (const key of symptomKeys) {
    const result = ordinalScore(
      a.patient.symptoms[key],
      b.patient.symptoms[key],
      VITAL_SCALE,
      1,
      0.25
    );
    earned += result.earned;
    maxPossible += result.max;
  }

  // ── Vitals (0.5 pts each, 2.5 max — only non-null pairs) ─────────────
  const vitalKeys = ["spo2", "bp", "rr", "hr", "temperature"] as const;
  for (const key of vitalKeys) {
    const result = ordinalScore(
      a.patient.vitals[key].value,
      b.patient.vitals[key].value,
      VITAL_SCALE,
      0.5,
      0.15
    );
    earned += result.earned;
    maxPossible += result.max;
  }

  // Avoid division by zero
  if (maxPossible === 0) return 0;

  return earned / maxPossible;
}

// ── Find the most similar resolved case (if above threshold) ────────────────
export function findMostSimilarCase(
  targetCase: Case
): { caseId: string; score: number } | null {
  const resolved = getResolvedCases();
  let bestMatch: { caseId: string; score: number } | null = null;

  for (const candidate of resolved) {
    if (candidate.id === targetCase.id) continue;
    const score = computeSimilarity(targetCase, candidate);
    if (score >= SIMILARITY_THRESHOLD && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { caseId: candidate.id, score };
    }
  }

  return bestMatch;
}
