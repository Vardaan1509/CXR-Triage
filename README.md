# CXR Triage

An AI-powered chest X-ray triage system that helps emergency departments prioritize patients faster. Upload an X-ray, get instant risk flags, and let clinicians focus where it matters most.

## The Problem

In busy ERs, chest X-rays pile up. Radiologists are overwhelmed, and critical findings like pneumothorax can sit unread for hours. Delayed reads cost lives — especially in under-resourced hospitals where specialist coverage is thin or nonexistent overnight.

## Our Solution

CXR Triage puts AI to work at the point of care:

1. A clinician uploads a chest X-ray alongside patient information
2. A deep learning model (ResNet50) instantly screens for **pneumothorax**, **pneumonia**, and **lung nodules**
3. The system flags the case as **URGENT**, **REVIEW**, or **ROUTINE** so the sickest patients get seen first
4. An AI-generated clinical report summarizes findings in professional medical language, ready for physician review
5. Resolved cases build a knowledge base — new cases are automatically matched against past ones for clinical reference
6. Every action is tracked in an audit log for compliance and accountability

This isn't replacing radiologists. It's giving them a head start.

## Why This Matters

- **Time to treatment** — flagging a tension pneumothorax in seconds vs. waiting hours in a queue can be the difference between life and death
- **Resource equity** — rural and understaffed hospitals don't always have overnight radiology coverage. AI triage fills that gap
- **Clinician trust** — every prediction comes with a full clinical report explaining the reasoning, not just a number. Clinicians can verify, override, and record the real outcome
- **Learning system** — when clinicians resolve cases, the system remembers. Similar future cases surface past outcomes, creating institutional knowledge that doesn't walk out the door at shift change
- **Accountability** — a full audit trail tracks who created, viewed, and resolved every case

## How It Works

```
Patient arrives → X-ray uploaded → Model scores risk → Case triaged
                                                      ↓
                              Clinician reviews → Resolves case → Knowledge base grows
                                                                        ↓
                                                        Future similar cases get linked
```

**The AI pipeline:**

- **Image analysis**: A fine-tuned ResNet50 classifies the X-ray for three conditions, outputting probability scores
- **Triage logic**: Probabilities are mapped to urgency flags (≥60% urgent, ≥30% review, <30% routine). The highest flag across all conditions determines the overall triage level
- **Report generation**: Google Gemini 2.5 Flash synthesizes model predictions + patient context into a structured ER-style radiology report
- **OCR intake**: Patient cards (images, PDFs) are parsed automatically via Gemini vision to reduce manual data entry
- **Case matching**: A clinically-weighted similarity algorithm compares new cases against resolved ones, with X-ray model predictions weighted highest (54% of the score) because the imaging is the most diagnostically reliable signal. A 60% similarity threshold is required for a match

## Features

### Clinical Workflow
- Upload chest X-rays and get instant AI predictions
- Three-level triage: **URGENT** / **REVIEW** / **ROUTINE**
- Full patient intake — vitals, symptoms, exam findings, risk factors
- OCR-powered patient card scanning (images, PDFs, JSON)
- AI-generated clinical reports with structured sections (impression, urgency, clinical correlation, next steps, limitations)
- Case resolution with diagnosis selection and clinician notes
- Confirmation modal before finalizing a resolution

### Intelligence
- ResNet50 multi-label classification for pneumothorax, pneumonia, and lung nodules
- Similar resolved case matching using a percentage-based clinically-weighted algorithm
- Gemini-powered report generation and OCR extraction

### Dashboard & Monitoring
- Real-time triage stats (Urgent / Review / Routine / Resolved counts)
- Clickable stat cards to filter the case list by triage level
- Color-coded prediction bars (red = urgent, yellow = review, green = low)
- Audit log with filtering by action type and case ID

### Data & Compliance
- Audit trail tracking case creation, report generation, case viewing, and case resolution
- Human-readable case IDs (CXR-001, CXR-002, etc.)
- Export case bundles as JSON
- Supabase integration for persistent storage and doctor-scoped data
- Email domain restriction for institutional access control

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4 |
| ML Model | PyTorch ResNet50, served via FastAPI + Uvicorn |
| AI / LLM | Google Gemini 2.0 Flash (via OpenRouter) |
| OCR | Gemini vision for patient card extraction |
| Auth & DB | Supabase (PostgreSQL, Row Level Security, Auth) |
| Markdown | react-markdown for formatted clinical reports |

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.9+
- A trained `best_model.pth` file (ResNet50, 4-class: no_finding, nodule, pneumonia, pneumothorax)
- An [OpenRouter](https://openrouter.ai/) API key

### Setup

```bash
# Clone and install frontend
cd cxr-triage
npm install

# Set up Python model server
cd model
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Place your model weights at `model/best_model.pth`.

Create `.env.local` in the project root:

```env
# Required
OPENROUTER_API_KEY=your_openrouter_key

# Optional — Supabase (falls back to in-memory store if not set)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# Optional — restrict sign-in to a specific email domain
NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN=hospital.org
```

### Run

```bash
# Terminal 1 — model server
cd model && source venv/bin/activate && uvicorn serve:app --port 8000

# Terminal 2 — web app
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Supabase Setup (optional)

If using Supabase for persistent storage:

1. Create a Supabase project
2. Run the migration to create the `doctors` and `cases` tables:

```bash
psql $SUPABASE_DB_URL -f supabase/migrations/001_init.sql
```

3. Add the Supabase environment variables to `.env.local`
4. Create doctor accounts via the Supabase Auth dashboard

When Supabase is not configured, the app falls back to an in-memory store for local development. Cases won't persist across server restarts in this mode.

## Project Structure

```
cxr-triage/
├── model/
│   ├── serve.py                    # FastAPI model server (ResNet50 inference)
│   └── requirements.txt            # Python dependencies
├── src/
│   ├── app/
│   │   ├── page.tsx                # Dashboard — case list, triage stats, filters
│   │   ├── layout.tsx              # Root layout with nav bar and auth wrapper
│   │   ├── globals.css             # Global styles + Tailwind config
│   │   ├── login/page.tsx          # Authentication page
│   │   ├── new-case/page.tsx       # Patient intake form + X-ray upload
│   │   ├── case/[id]/page.tsx      # Case detail — predictions, report, resolve
│   │   ├── audit/page.tsx          # Audit log viewer with filters
│   │   ├── auth/RequireAuth.tsx    # Auth guard wrapper
│   │   ├── components/Header.tsx   # Sticky nav bar
│   │   └── api/
│   │       ├── infer/route.ts      # Proxy to FastAPI model server
│   │       ├── cases/route.ts      # Case creation (POST) and listing (GET)
│   │       ├── cases/[id]/route.ts # Case detail (GET) and resolution (PATCH)
│   │       ├── ocr/route.ts        # Patient card OCR via Gemini
│   │       ├── report/route.ts     # AI report generation via Gemini
│   │       ├── audit/route.ts      # Audit log retrieval
│   │       └── auth/upsert-doctor/ # Doctor record management
│   └── lib/
│       ├── store.ts                # Case storage (in-memory + Supabase)
│       ├── triage.ts               # Triage computation logic
│       ├── similarity.ts           # Clinically-weighted case matching
│       ├── auditLog.ts             # Audit trail (in-memory)
│       ├── auth.ts                 # Server-side auth helpers
│       ├── supabase.ts             # Server-side Supabase client
│       └── supabaseClient.ts       # Client-side Supabase client
├── supabase/
│   └── migrations/001_init.sql     # Database schema
└── .env.local                      # Environment variables
```

## Limitations

- Audit log is in-memory only (resets on server restart); case storage persists with Supabase
- Model validation accuracy is ~55% (proof of concept, not clinical-grade)
- Standard image formats only (no DICOM support)
- Requires physician review — this system assists triage, it does not diagnose
- Similar case matching improves as more cases are resolved; limited value with a small case pool

## Team

Built at the CXC Hackathon.
