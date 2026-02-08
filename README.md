# CXR Triage

An AI-powered chest X-ray triage tool that helps emergency departments prioritize patients faster. Upload an X-ray, get instant risk flags, and let clinicians focus where it matters most.

## The Problem

In busy ERs, chest X-rays pile up. Radiologists are overwhelmed, and critical findings like pneumothorax can sit unread for hours. Delayed reads cost lives, especially in under-resourced hospitals where specialist coverage is thin.

## Our Solution

CXR Triage puts AI to work at the point of care:

1. A clinician uploads a chest X-ray alongside patient info
2. A deep learning model (ResNet50) instantly screens for **pneumothorax, pneumonia, and lung nodules**
3. The system flags the case as **URGENT**, **REVIEW**, or **ROUTINE** — so the sickest patients get seen first
4. An AI-generated report summarizes the findings in clinical language, ready for physician review
5. Over time, resolved cases build a knowledge base — new cases are matched against past ones for reference

This isn't replacing radiologists. It's giving them a head start.

## Why This Matters

- **Time to treatment** — flagging a tension pneumothorax in seconds vs. waiting hours in a queue can be the difference between life and death
- **Resource equity** — rural and understaffed hospitals don't always have overnight radiology coverage. AI triage fills that gap
- **Clinician trust** — every prediction comes with a full clinical report explaining the reasoning, not just a number. Clinicians can verify, override, and record the real outcome
- **Learning system** — when clinicians resolve cases, the system remembers. Similar future cases surface past outcomes, creating institutional knowledge that doesn't walk out the door at shift change

## How It Works

```
Patient arrives → X-ray uploaded → Model scores risk → Case triaged
                                                      ↓
                              Clinician reviews → Resolves case → Knowledge base grows
                                                                        ↓
                                                        Future similar cases get linked
```

**The AI pipeline:**
- **Image analysis**: ResNet50 classifies the X-ray for three conditions, outputting probability scores
- **Triage logic**: Probabilities are mapped to urgency flags (>=60% urgent, >=30% review, <30% routine)
- **Report generation**: Gemini synthesizes predictions + patient context into a structured clinical report
- **OCR intake**: Patient cards (images, PDFs) are parsed automatically to reduce manual data entry
- **Case matching**: A weighted similarity algorithm compares new cases against resolved ones, with imaging predictions weighted highest (54% of the score) because the X-ray is the most diagnostically reliable signal

## Features

- Upload chest X-rays and get instant AI predictions
- Three-level triage: URGENT / REVIEW / ROUTINE
- Full patient intake — vitals, symptoms, exam findings, risk factors
- OCR-powered patient card scanning (images, PDFs, JSON)
- AI-generated clinical reports (formatted markdown)
- Case resolution with diagnosis and clinician notes
- Similar resolved case matching for clinical reference
- Export case bundles as JSON

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS |
| ML Model | PyTorch ResNet50, served via FastAPI |
| AI/LLM | Google Gemini 2.0 Flash (via OpenRouter) |
| OCR | Gemini vision for patient card extraction |

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.9+
- A trained `best_model.pth` file
- An [OpenRouter](https://openrouter.ai/) API key

### Setup

```bash
# Install frontend
cd cxr-triage
npm install

# Set up model server
cd model
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Place your model weights at `model/best_model.pth`.

Create `.env.local` in the project root:

```env
OPENROUTER_API_KEY=your_key_here
```

### Run

```bash
# Terminal 1 — model server
cd model && source venv/bin/activate && uvicorn serve:app --port 8000

# Terminal 2 — web app
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
cxr-triage/
├── model/
│   ├── serve.py              # FastAPI model server (ResNet50 inference)
│   └── requirements.txt
├── src/
│   ├── app/
│   │   ├── page.tsx           # Dashboard
│   │   ├── new-case/          # Patient intake + X-ray upload
│   │   ├── case/[id]/         # Case detail + resolve + report
│   │   └── api/
│   │       ├── infer/         # Proxy to model server
│   │       ├── cases/         # Case CRUD
│   │       ├── ocr/           # Patient card OCR
│   │       └── report/        # AI report generation
│   └── lib/
│       ├── store.ts           # In-memory case store
│       ├── triage.ts          # Triage computation
│       └── similarity.ts      # Case similarity scoring
└── .env.local
```

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Supabase integration (server)

This project can optionally use Supabase as a secure backend. To enable it, set these environment variables in your deployment or local `.env`:

- `SUPABASE_URL` — your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` — server-side service role key (keep secret)

Run the provided SQL migration in `supabase/migrations/001_init.sql` to create `doctors` and `cases` tables.

When Supabase is not configured the app will fall back to an in-memory store for local development.

### Client env vars

For frontend auth to work set these env vars in addition to the server ones:

- `NEXT_PUBLIC_SUPABASE_URL` — your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — your Supabase anon/public key

### Optional: restrict allowed sign-in emails

If you want to limit sign-ins to an institutional email domain (recommended for hospital staff), set:

- `NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN` — e.g. `hospital.org`

When set, the login UI will only allow emails ending with `@hospital.org`.

### Quick setup & testing

1. Install deps:

```bash
npm install
```

2. Run the migration against your Supabase database (using `psql` or `supabase` CLI):

```bash
# example using psql
psql $SUPABASE_DB_URL -f supabase/migrations/001_init.sql
```

3. Start dev server:

```bash
npm run dev
```

4. Open http://localhost:3000/login and sign in with a doctor email and password. After signing in, create a new case at `/new-case`.

Notes:
- Keep your service role key secret; use it only on server-side.
 - If you don't configure Supabase, the app will continue using an in-memory store (no persistence).
=======
## Limitations

- Storage is in-memory (prototype — cases don't persist across restarts)
- Model validation accuracy is ~55% (proof of concept, not clinical-grade)
- Standard image formats only (no DICOM)
- Requires physician review — this assists, it does not diagnose

## Team

Built at the CXC Hackathon.
>>>>>>> d67e274ce22dd12c94364d8edd84e2953e3f4436
