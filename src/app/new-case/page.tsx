"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const VITAL_FIELDS = [
  { key: "spo2", label: "Oxygen Saturation (SpO₂)" },
  { key: "bp", label: "Blood Pressure (BP)" },
  { key: "rr", label: "Respiratory Rate (RR)" },
  { key: "hr", label: "Pulse / Heart Rate (HR)" },
  { key: "temperature", label: "Temperature" },
];

const SYMPTOM_FIELDS = [
  { key: "breathlessness", label: "Breathlessness / Dyspnea" },
  { key: "dyspneaOnExertion", label: "Dyspnea on Exertion" },
  { key: "cough", label: "Cough Severity" },
  { key: "chestPain", label: "Chest Pain Severity" },
  { key: "sputum", label: "Sputum / Productive Cough" },
  { key: "hemoptysis", label: "Hemoptysis (Coughing Blood)" },
];

const EXAM_FIELDS = [
  { key: "breathSounds", label: "Breath Sounds (decreased)" },
  { key: "crackles", label: "Crackles / Crepitations" },
  { key: "bronchialBreathSounds", label: "Bronchial Breath Sounds" },
  { key: "trachealDeviation", label: "Tracheal Deviation to Opposite Side" },
];

type VitalState = { value: string | null; individualBaseline: boolean };

function TriStateSelector({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string | null;
  onChange: (val: string | null) => void;
}) {
  return (
    <div className="flex gap-1">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(value === opt ? null : opt)}
          className={`px-3 py-1 rounded text-sm border transition-colors ${
            value === opt
              ? opt === "low" || opt === "absent"
                ? "bg-blue-100 border-blue-500 text-blue-700"
                : opt === "normal"
                  ? "bg-green-100 border-green-500 text-green-700"
                  : opt === "high" || opt === "present"
                    ? "bg-red-100 border-red-500 text-red-700"
                    : "bg-gray-200 border-gray-400 text-gray-700"
              : "bg-gray-50 border-gray-300 text-gray-500 hover:bg-gray-100"
          }`}
        >
          {opt.charAt(0).toUpperCase() + opt.slice(1)}
        </button>
      ))}
    </div>
  );
}

export default function NewCasePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [patientCardFile, setPatientCardFile] = useState<File | null>(null);

  const [basic, setBasic] = useState({
    name: "",
    age: "",
    sex: "",
    chiefComplaint: "",
  });

  const [vitals, setVitals] = useState<Record<string, VitalState>>({
    spo2: { value: null, individualBaseline: false },
    bp: { value: null, individualBaseline: false },
    rr: { value: null, individualBaseline: false },
    hr: { value: null, individualBaseline: false },
    temperature: { value: null, individualBaseline: false },
  });

  const [symptoms, setSymptoms] = useState<Record<string, string | null>>({
    breathlessness: null,
    dyspneaOnExertion: null,
    cough: null,
    chestPain: null,
    sputum: null,
    hemoptysis: null,
  });

  const [examFindings, setExamFindings] = useState<Record<string, string | null>>({
    breathSounds: null,
    crackles: null,
    bronchialBreathSounds: null,
    trachealDeviation: null,
  });

  const [smoker, setSmoker] = useState(false);
  const [immunocompromised, setImmunocompromised] = useState(false);

  function applyOcrData(data: any) {
    if (data.name) setBasic((prev) => ({ ...prev, name: data.name }));
    if (data.age) setBasic((prev) => ({ ...prev, age: data.age.toString() }));
    if (data.sex) setBasic((prev) => ({ ...prev, sex: data.sex }));
    if (data.chiefComplaint)
      setBasic((prev) => ({ ...prev, chiefComplaint: data.chiefComplaint }));

    if (data.vitals) {
      setVitals((prev) => {
        const updated = { ...prev };
        for (const key of Object.keys(updated)) {
          if (data.vitals[key]?.value) {
            updated[key] = {
              value: data.vitals[key].value,
              individualBaseline: data.vitals[key].individualBaseline || false,
            };
          }
        }
        return updated;
      });
    }

    if (data.symptoms) {
      setSymptoms((prev) => {
        const updated = { ...prev };
        for (const key of Object.keys(updated)) {
          if (data.symptoms[key]) {
            updated[key] = data.symptoms[key];
          }
        }
        return updated;
      });
    }

    if (data.examFindings) {
      setExamFindings((prev) => {
        const updated = { ...prev };
        for (const key of Object.keys(updated)) {
          if (data.examFindings[key]) {
            updated[key] = data.examFindings[key];
          }
        }
        return updated;
      });
    }

    if (data.smoker === true || data.smoker === "true") setSmoker(true);
    if (data.immunocompromised === true || data.immunocompromised === "true")
      setImmunocompromised(true);
  }

  async function handlePatientCard(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPatientCardFile(file);

    const isJSON = file.name.endsWith(".json");
    const isImage = file.type.startsWith("image/");
    const isPDF = file.type === "application/pdf";

    if (isJSON) {
      const text = await file.text();
      try {
        const data = JSON.parse(text);
        applyOcrData(data);
      } catch {
        alert("Invalid JSON patient card");
      }
    } else if (isImage || isPDF) {
      setOcrLoading(true);
      try {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/ocr", {
          method: "POST",
          body: formData,
        });
        const result = await res.json();
        if (result.error) {
          alert("OCR failed: " + result.error);
        } else {
          applyOcrData(result.data);
        }
      } catch {
        alert("Failed to process patient card");
      } finally {
        setOcrLoading(false);
      }
    } else {
      alert("Unsupported file type. Please upload a JSON, image, or PDF.");
    }
  }

  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const base64 = await fileToBase64(file);
    setImagePreview(base64);
  }

  async function handleSubmit() {
    if (!imageFile) {
      alert("Please upload a chest X-ray image");
      return;
    }
    if (!basic.name || !basic.age || !basic.sex) {
      alert("Please fill in at least name, age, and sex");
      return;
    }

    setLoading(true);

    try {
      const inferRes = await fetch("/api/infer", {
        method: "POST",
        body: imageFile,
      });
      const inferData = await inferRes.json();
      if (!inferRes.ok || inferData.error) {
        alert("Model inference failed: " + (inferData.error || "Unknown error"));
        setLoading(false);
        return;
      }
      const { predictions } = inferData;

      const caseRes = await fetch("/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient: {
            name: basic.name,
            age: parseInt(basic.age),
            sex: basic.sex,
            chiefComplaint: basic.chiefComplaint,
            vitals,
            symptoms,
            examFindings,
            smoker,
            immunocompromised,
          },
          predictions,
          imageFilename: imageFile.name,
          imageData: imagePreview || (await fileToBase64(imageFile)),
        }),
      });
      if (!caseRes.ok) {
        const errData = await caseRes.json().catch(() => ({}));
        alert("Failed to save case: " + (errData.error || caseRes.statusText));
        setLoading(false);
        return;
      }
      const { id } = await caseRes.json();

      router.push(`/case/${id}`);
    } catch (error) {
      console.error("Error:", error);
      alert("Something went wrong. Check console for details.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          New Case — CXR Triage
        </h1>

        {/* Patient Card Upload */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">
            Patient Card (Optional)
          </h2>
          <p className="text-sm text-gray-500 mb-3">
            Upload a patient card to autofill the form — supports JSON, images,
            and PDFs
          </p>
          <input
            type="file"
            accept=".json,image/png,image/jpeg,image/jpg,application/pdf"
            onChange={handlePatientCard}
            disabled={ocrLoading}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          {ocrLoading && (
            <p className="text-sm text-blue-600 mt-2">
              Extracting patient data from file...
            </p>
          )}
          {patientCardFile && !ocrLoading && (
            <p className="text-sm text-green-600 mt-2">
              ✓ Loaded: {patientCardFile.name}
            </p>
          )}
        </div>

        {/* Basic Info */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Basic Information
          </h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name
              </label>
              <input
                type="text"
                value={basic.name}
                onChange={(e) =>
                  setBasic((prev) => ({ ...prev, name: e.target.value }))
                }
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                placeholder="Patient name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Age
              </label>
              <input
                type="number"
                value={basic.age}
                onChange={(e) =>
                  setBasic((prev) => ({ ...prev, age: e.target.value }))
                }
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                placeholder="Age"
              />
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sex
            </label>
            <select
              value={basic.sex}
              onChange={(e) =>
                setBasic((prev) => ({ ...prev, sex: e.target.value }))
              }
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            >
              <option value="">Select</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Chief Complaint
            </label>
            <textarea
              value={basic.chiefComplaint}
              onChange={(e) =>
                setBasic((prev) => ({
                  ...prev,
                  chiefComplaint: e.target.value,
                }))
              }
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              rows={2}
              placeholder="Primary reason for visit"
            />
          </div>
        </div>

        {/* Vitals */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Vitals</h2>
          <div className="space-y-4">
            {VITAL_FIELDS.map(({ key, label }) => (
              <div
                key={key}
                className="flex items-center justify-between gap-4"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-700">{label}</p>
                </div>
                <TriStateSelector
                  options={["low", "normal", "high"]}
                  value={vitals[key].value}
                  onChange={(val) =>
                    setVitals((prev) => ({
                      ...prev,
                      [key]: { ...prev[key], value: val },
                    }))
                  }
                />
                <label className="flex items-center gap-1 text-xs text-gray-500 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={vitals[key].individualBaseline}
                    onChange={(e) =>
                      setVitals((prev) => ({
                        ...prev,
                        [key]: {
                          ...prev[key],
                          individualBaseline: e.target.checked,
                        },
                      }))
                    }
                  />
                  Individual baseline
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Symptoms */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Symptoms (Severity)
          </h2>
          <div className="space-y-4">
            {SYMPTOM_FIELDS.map(({ key, label }) => (
              <div
                key={key}
                className="flex items-center justify-between gap-4"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-700">{label}</p>
                </div>
                <TriStateSelector
                  options={["low", "normal", "high"]}
                  value={symptoms[key]}
                  onChange={(val) =>
                    setSymptoms((prev) => ({ ...prev, [key]: val }))
                  }
                />
              </div>
            ))}
          </div>
        </div>

        {/* Exam Findings */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Exam Findings
          </h2>
          <div className="space-y-4">
            {EXAM_FIELDS.map(({ key, label }) => (
              <div
                key={key}
                className="flex items-center justify-between gap-4"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-700">{label}</p>
                </div>
                <TriStateSelector
                  options={["absent", "normal", "present"]}
                  value={examFindings[key]}
                  onChange={(val) =>
                    setExamFindings((prev) => ({ ...prev, [key]: val }))
                  }
                />
              </div>
            ))}
          </div>
        </div>

        {/* Risk Factors */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Risk Factors
          </h2>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={smoker}
                onChange={(e) => setSmoker(e.target.checked)}
              />
              Smoker
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={immunocompromised}
                onChange={(e) => setImmunocompromised(e.target.checked)}
              />
              Immunocompromised
            </label>
          </div>
        </div>

        {/* X-ray Upload */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">
            Chest X-Ray
          </h2>
          <input
            type="file"
            accept="image/png,image/jpeg,image/jpg"
            onChange={handleImageUpload}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          {imagePreview && (
            <div className="mt-4">
              <img
                src={imagePreview}
                alt="X-ray preview"
                className="max-w-full max-h-64 rounded border"
              />
            </div>
          )}
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold text-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {loading ? "Analyzing..." : "Run Analysis"}
        </button>
      </div>
    </div>
  );
}