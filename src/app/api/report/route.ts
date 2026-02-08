import { NextResponse } from "next/server";
import OpenAI from "openai";
import { addAuditEntry } from "@/lib/auditLog";

const client = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

function buildPatientSection(patient: any): string {
  let lines: string[] = [];

  lines.push(`Name: ${patient.name}`);
  lines.push(`Age: ${patient.age}`);
  lines.push(`Sex: ${patient.sex}`);
  if (patient.chiefComplaint) {
    lines.push(`Chief Complaint: ${patient.chiefComplaint}`);
  }

  // Vitals - only include filled ones
  const vitalLabels: Record<string, string> = {
    spo2: "Oxygen Saturation (SpO₂)",
    bp: "Blood Pressure",
    rr: "Respiratory Rate",
    hr: "Heart Rate",
    temperature: "Temperature",
  };
  const filledVitals = Object.entries(patient.vitals || {})
    .filter(([, v]: [string, any]) => v.value !== null)
    .map(([key, v]: [string, any]) => {
      const baseline = v.individualBaseline
        ? " (relative to individual baseline)"
        : " (relative to population average)";
      return `${vitalLabels[key]}: ${v.value.toUpperCase()}${baseline}`;
    });
  if (filledVitals.length > 0) {
    lines.push("");
    lines.push("VITALS:");
    lines.push(...filledVitals);
  }

  // Symptoms - only include filled ones
  const symptomLabels: Record<string, string> = {
    breathlessness: "Breathlessness / Dyspnea",
    dyspneaOnExertion: "Dyspnea on Exertion",
    cough: "Cough Severity",
    chestPain: "Chest Pain Severity",
    sputum: "Sputum / Productive Cough",
    hemoptysis: "Hemoptysis",
  };
  const filledSymptoms = Object.entries(patient.symptoms || {})
    .filter(([, v]) => v !== null)
    .map(([key, v]) => `${symptomLabels[key]}: ${(v as string).toUpperCase()}`);
  if (filledSymptoms.length > 0) {
    lines.push("");
    lines.push("SYMPTOMS:");
    lines.push(...filledSymptoms);
  }

  // Exam findings - only include filled ones
  const examLabels: Record<string, string> = {
    breathSounds: "Breath Sounds (decreased)",
    crackles: "Crackles / Crepitations",
    bronchialBreathSounds: "Bronchial Breath Sounds",
    trachealDeviation: "Tracheal Deviation",
  };
  const filledExam = Object.entries(patient.examFindings || {})
    .filter(([, v]) => v !== null)
    .map(([key, v]) => `${examLabels[key]}: ${(v as string).toUpperCase()}`);
  if (filledExam.length > 0) {
    lines.push("");
    lines.push("EXAM FINDINGS:");
    lines.push(...filledExam);
  }

  // Risk factors
  const risks: string[] = [];
  if (patient.smoker) risks.push("Smoker");
  if (patient.immunocompromised) risks.push("Immunocompromised");
  if (risks.length > 0) {
    lines.push("");
    lines.push(`RISK FACTORS: ${risks.join(", ")}`);
  }

  return lines.join("\n");
}

export async function POST(req: Request) {
  const body = await req.json();
  const { patient, predictions, triage, caseId } = body;

  const patientSection = buildPatientSection(patient);

  const prompt = `You are a medical report assistant for an emergency radiology triage system.
You are NOT a diagnostician. You are summarizing AI model outputs and patient context into a structured report.

PATIENT INFO:
${patientSection}

AI MODEL PREDICTIONS (chest X-ray):
- Pneumothorax: ${(predictions.pneumothorax * 100).toFixed(1)}%
- Pneumonia: ${(predictions.pneumonia * 100).toFixed(1)}%
- Nodule: ${(predictions.nodule * 100).toFixed(1)}%

COMPUTED TRIAGE LEVEL: ${triage.level}
TRIAGE REASON: ${triage.reason}

Write a structured ER-style radiology report with these sections:
1. IMPRESSION - Brief summary of findings, integrating both the AI predictions and the patient's clinical presentation (vitals, symptoms, exam findings) where available
2. URGENCY - Restate the triage level and what it means clinically
3. CLINICAL CORRELATION - Note how the patient's symptoms and exam findings relate to (or diverge from) the AI predictions
4. SUGGESTED NEXT STEPS - What a physician might consider doing next based on the full clinical picture
5. LIMITATIONS - State clearly that this is AI-assisted, not a definitive diagnosis, no heatmap/localization available, and requires physician review

IMPORTANT CONSTRAINTS:
- Do NOT claim a definitive diagnosis
- Do NOT hallucinate findings not supported by the data above
- Do NOT contradict the computed triage level
- If a vital or symptom is marked relative to individual baseline, note this distinction
- Only reference clinical data that was actually provided — do not assume values for fields that were not reported
- Use professional medical language appropriate for an ER setting`;

  try {
    const completion = await client.chat.completions.create({
      model: "google/gemini-2.0-flash-001",
      messages: [{ role: "user", content: prompt }],
    });

    const report =
      completion.choices[0]?.message?.content || "Report generation failed.";

    if (caseId) {
      addAuditEntry("REPORT_GENERATED", caseId, "system", "Model: Gemini 2.0 Flash");
    }

    return NextResponse.json({ report });
  } catch (error) {
    console.error("Gemini API error:", error);
    return NextResponse.json(
      { error: "Failed to generate report" },
      { status: 500 }
    );
  }
}