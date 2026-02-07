import { NextResponse } from "next/server";
import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

export async function POST(req: Request) {
  const body = await req.json();
  const { patient, predictions, triage } = body;

  const prompt = `You are a medical report assistant for an emergency radiology triage system. 
You are NOT a diagnostician. You are summarizing AI model outputs and patient context into a structured report.

PATIENT INFO:
- Name: ${patient.name}
- Age: ${patient.age}
- Sex: ${patient.sex}
- Chief Complaint: ${patient.chiefComplaint}
- Symptoms: ${patient.symptoms.join(", ")}
- Smoker: ${patient.smoker ? "Yes" : "No"}
- Immunocompromised: ${patient.immunocompromised ? "Yes" : "No"}

AI MODEL PREDICTIONS (chest X-ray):
- Pneumothorax: ${(predictions.pneumothorax * 100).toFixed(1)}%
- Pneumonia: ${(predictions.pneumonia * 100).toFixed(1)}%
- Nodule: ${(predictions.nodule * 100).toFixed(1)}%

COMPUTED TRIAGE LEVEL: ${triage.level}
TRIAGE REASON: ${triage.reason}

Write a structured ER-style radiology report with these sections:
1. IMPRESSION - Brief summary of findings
2. URGENCY - Restate the triage level and what it means clinically
3. SUGGESTED NEXT STEPS - What a physician might consider doing next
4. LIMITATIONS - State clearly that this is AI-assisted, not a definitive diagnosis, no heatmap/localization available, and requires physician review

IMPORTANT CONSTRAINTS:
- Do NOT claim a definitive diagnosis
- Do NOT hallucinate findings not supported by the data above
- Do NOT contradict the computed triage level
- Use professional medical language appropriate for an ER setting`;

  try {
    const completion = await client.chat.completions.create({
      model: "google/gemini-2.0-flash-001",
      messages: [{ role: "user", content: prompt }],
    });

    const report = completion.choices[0]?.message?.content || "Report generation failed.";
    return NextResponse.json({ report });
  } catch (error) {
    console.error("Gemini API error:", error);
    return NextResponse.json(
      { error: "Failed to generate report" },
      { status: 500 }
    );
  }
}