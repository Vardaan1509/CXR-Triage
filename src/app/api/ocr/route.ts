import { NextResponse } from "next/server";
import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

const EXTRACT_PROMPT = `You are an OCR assistant. Extract patient information from this patient card.

Return ONLY a valid JSON object with no markdown, no backticks, no explanation. Just the raw JSON.

Use this exact structure, setting null for any field you cannot find:

{
  "name": "string or null",
  "age": "number or null",
  "sex": "Male or Female or Other or null",
  "chiefComplaint": "string or null",
  "vitals": {
    "spo2": { "value": "low or normal or high or null", "individualBaseline": false },
    "bp": { "value": "low or normal or high or null", "individualBaseline": false },
    "rr": { "value": "low or normal or high or null", "individualBaseline": false },
    "hr": { "value": "low or normal or high or null", "individualBaseline": false },
    "temperature": { "value": "low or normal or high or null", "individualBaseline": false }
  },
  "symptoms": {
    "breathlessness": "low or normal or high or null",
    "dyspneaOnExertion": "low or normal or high or null",
    "cough": "low or normal or high or null",
    "chestPain": "low or normal or high or null",
    "sputum": "low or normal or high or null",
    "hemoptysis": "low or normal or high or null"
  },
  "examFindings": {
    "breathSounds": "absent or normal or present or null",
    "crackles": "absent or normal or present or null",
    "bronchialBreathSounds": "absent or normal or present or null",
    "trachealDeviation": "absent or normal or present or null"
  },
  "smoker": "true or false or null",
  "immunocompromised": "true or false or null"
}

IMPORTANT:
- If vitals have numeric values, interpret them as low/normal/high based on standard clinical ranges
- If you see a blood pressure like 140/90, that would be "high"
- If you see SpO2 of 98%, that would be "normal"
- If you see a heart rate of 110, that would be "high"
- Only extract what is clearly visible, do not guess`;

export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get("file") as File;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const base64 = Buffer.from(bytes).toString("base64");
  const mimeType = file.type;
  const isPDF = mimeType === "application/pdf";
  const isImage = mimeType.startsWith("image/");

  if (!isPDF && !isImage) {
    return NextResponse.json(
      { error: "Unsupported file type. Please upload an image or PDF." },
      { status: 400 }
    );
  }

  try {
    const content: any[] = [
      { type: "text", text: EXTRACT_PROMPT },
    ];

    if (isPDF) {
      content.push({
        type: "file",
        file: {
          filename: file.name,
          file_data: `data:application/pdf;base64,${base64}`,
        },
      });
    } else {
      content.push({
        type: "image_url",
        image_url: {
          url: `data:${mimeType};base64,${base64}`,
        },
      });
    }

    const completion = await client.chat.completions.create({
      model: "google/gemini-2.0-flash-001",
      messages: [
        {
          role: "user",
          content,
        },
      ],
    });

    const responseText = completion.choices[0]?.message?.content || "";
    const cleaned = responseText.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    return NextResponse.json({ data: parsed });
  } catch (error) {
    console.error("OCR error:", error);
    return NextResponse.json(
      { error: "Failed to extract patient data from file" },
      { status: 500 }
    );
  }
}