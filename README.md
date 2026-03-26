# DeltaCash 💸

> **AI-powered cash flow intelligence for SMEs** — Know your runway. Act before the crisis.

DeltaCash is a full-stack liquidity management platform built for small and medium enterprises. It combines a deterministic financial engine, a multi-agent AI orchestrator, ML-based payment prediction, and OCR invoice ingestion into a single dashboard — giving founders and CFOs real-time clarity on where their cash is, and how long it will last.

---

## Table of Contents

- [Why DeltaCash](#why-deltacash)
- [Key Features](#key-features)
- [Architecture Overview](#architecture-overview)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
- [How It Works](#how-it-works)
  - [True Liquidity Engine](#true-liquidity-engine)
  - [Days-to-Zero (DTZ)](#days-to-zero-dtz)
  - [Multi-Agent AI Pipeline](#multi-agent-ai-pipeline)
  - [ML Ensemble Predictor](#ml-ensemble-predictor)
  - [OCR Invoice Ingestion](#ocr-invoice-ingestion)
  - [MCP Bank Integration](#mcp-bank-integration)
- [API Reference](#api-reference)
- [Project Structure](#project-structure)
- [Environment Variables](#environment-variables)
- [Running Tests](#running-tests)
- [Roadmap](#roadmap)
- [License](#license)

---

## Why DeltaCash

Most SMEs manage cash flow in spreadsheets — reactive, error-prone, and always a step behind. DeltaCash flips that:

- **Proactive**: See your runway today, not after the crisis hits.
- **Actionable**: AI agents don't just flag problems — they prioritize obligations and draft vendor negotiation emails automatically.
- **Transparent**: Every ML prediction comes with a reasoning chain. No black boxes.

---

## Key Features

| Feature | Description |
|---|---|
| **True Liquidity Score** | Real-time balance minus near-term obligations and tax reserves |
| **Days-to-Zero (DTZ) Gauge** | Visual runway indicator with green / yellow / red warning levels |
| **30-Day Cash Flow Timeline** | Day-by-day projection of inflows, outflows, and available balance |
| **Stress Test Mode** | Simulate what happens if all receivables are delayed by 30 days |
| **Obligation Delay Simulator** | Drag a payment date and instantly see the DTZ impact |
| **Multi-Agent AI Triage** | Analyzer → Prioritizer → Negotiator pipeline ranks obligations and writes emails |
| **ML Payment Predictor** | Gradient Boosting + Random Forest ensemble predicts which receivables will be late |
| **OCR Invoice Ingestion** | Upload images or PDFs; vendor, amount, and date extracted automatically |
| **MCP Bank Feed** | Model Context Protocol simulator for bank transaction context injection |
| **Negotiation Email Generator** | LLM-powered (Gemini) or template-based vendor deferral emails |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js)                    │
│  Dashboard · Timeline · Calculator · Input · Stress Test    │
└───────────────────────┬─────────────────────────────────────┘
                        │ REST API
┌───────────────────────▼─────────────────────────────────────┐
│                   Backend (FastAPI)                          │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  Liquidity   │  │  LangGraph   │  │  ML Predictor    │  │
│  │  Engine      │  │  Agents      │  │  (GB + RF        │  │
│  │  (DTZ, True  │  │  Analyzer →  │  │   Ensemble)      │  │
│  │  Liquidity)  │  │  Prioritizer │  │                  │  │
│  └──────────────┘  │  Negotiator  │  └──────────────────┘  │
│                    └──────────────┘                         │
│  ┌──────────────┐  ┌──────────────┐                         │
│  │  OCR Engine  │  │  MCP Bank    │                         │
│  │  (EasyOCR +  │  │  Simulator   │                         │
│  │  Tesseract)  │  │              │                         │
│  └──────────────┘  └──────────────┘                         │
└─────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

**Backend**
- [FastAPI](https://fastapi.tiangolo.com/) — REST API framework
- [LangGraph](https://github.com/langchain-ai/langgraph) — Multi-agent orchestration
- [LangChain + Google Gemini](https://python.langchain.com/) — LLM integration
- [scikit-learn](https://scikit-learn.org/) — Gradient Boosting + Random Forest ensemble
- [EasyOCR](https://github.com/JaidedAI/EasyOCR) + [pytesseract](https://github.com/madmaze/pytesseract) — OCR pipeline
- [pdfplumber](https://github.com/jsvine/pdfplumber) — PDF text extraction
- [Pydantic v2](https://docs.pydantic.dev/) — Data validation and schemas

**Frontend**
- [Next.js 14](https://nextjs.org/) (App Router)
- [Tailwind CSS](https://tailwindcss.com/)
- [Recharts](https://recharts.org/) — Cash flow timeline charts
- [Radix UI](https://www.radix-ui.com/) — Accessible component primitives
- [@dnd-kit](https://dndkit.com/) — Drag-and-drop obligation scheduler
- [Lucide React](https://lucide.dev/) — Icons

---

## Getting Started

### Prerequisites

- Python 3.10+
- Node.js 18+
- (Optional) Tesseract OCR installed on system — for PDF/image invoice parsing
- (Optional) `GOOGLE_API_KEY` — for LLM-powered email generation via Gemini

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment template
cp .env.example .env
# Add your GOOGLE_API_KEY if using LLM email generation

# Start the API server
uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`. Interactive docs at `http://localhost:8000/docs`.

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start the dev server
npm run dev
```

The app will be available at `http://localhost:3000`.

---

## How It Works

### True Liquidity Engine

The `LiquidityEngine` class in `backend/logic/engine.py` is a pure deterministic math engine — no AI, no magic. It calculates:

```
True Liquidity = Bank Balance − Obligations due in 7 days − Tax Reserve (20% of receivables)
```

This gives a realistic, conservative view of cash that's actually available to spend today.

### Days-to-Zero (DTZ)

DTZ is the number of days until the running balance first hits zero, computed by projecting daily cash flows up to 365 days forward. If cash never hits zero in the projection window, DeltaCash estimates extra runway from the burn rate and caps at `999+`.

**Warning levels:**
- 🟢 Green: DTZ > 30 days
- 🟡 Yellow: 15–30 days
- 🔴 Red: < 15 days

### Multi-Agent AI Pipeline

Three LangGraph nodes run in sequence on every analysis request:

1. **Analyzer** — Checks if DTZ is below the critical threshold (10 days) and flags pending obligations.
2. **Prioritizer** — Ranks each obligation using:
   ```
   Priority Score = (penalty_rate × urgency × 100) / relationship_weight
   ```
   Critical vendor relationships are protected; flexible ones are candidates for deferral.
3. **Negotiator** — For each deferral candidate, generates a vendor email. Uses Google Gemini if `GOOGLE_API_KEY` is set; falls back to a professional template otherwise. Tone is automatically calibrated: *Humble/Urgent* for critical vendors, *Firm/Strategic* for flexible ones.

All three nodes produce a full Chain-of-Thought log visible in the dashboard.

### ML Ensemble Predictor

`backend/ml/predictor.py` trains a **Gradient Boosting + Random Forest ensemble** (60/40 weighted) on 3,000 synthetic SME payment records at startup (or loads a cached `ensemble_model.pkl`).

**Features used:**
| Feature | Description |
|---|---|
| `historical_delay_days` | Vendor's average historical delay |
| `amount_bucket` | Invoice size tier (small / medium / large) |
| `days_until_due` | Payment urgency |
| `on_time_rate` | Vendor's on-time payment rate |
| `penalty_severity` | Late penalty as fraction per day |
| `month_of_year` | Seasonal factor (tax quarter pressure) |
| `day_of_week` | Weekend timing effect |

Every prediction returns a full reasoning chain with per-feature importance scores — no black boxes.

### OCR Invoice Ingestion

Upload an invoice image or PDF and DeltaCash extracts vendor name, amount, and date automatically.

**Extraction pipeline (priority order):**
1. EasyOCR (deep-learning based, preferred for images)
2. pytesseract (fallback for images)
3. pdfplumber (for PDFs with a text layer)
4. pdfplumber + pytesseract (for scanned PDFs)

After extraction, fuzzy matching against the bank statement detects duplicate entries before they're added as obligations.

### MCP Bank Integration

DeltaCash implements a [Model Context Protocol](https://modelcontextprotocol.io/) simulator (`backend/mcp/simulator.py`) that returns a standardized JSON envelope of bank transactions. This is the integration point for connecting real banking APIs — replace the simulator with any MCP-compliant bank feed without changing the rest of the system.

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Health check |
| `POST` | `/api/liquidity` | Calculate True Liquidity and DTZ |
| `POST` | `/api/simulate/delay` | Simulate obligation deferral impact |
| `POST` | `/api/stress-test` | Run 30-day receivables delay stress test |
| `POST` | `/api/stress-test/reset` | Reset stress test mode |
| `POST` | `/api/agent/analyze` | Run full multi-agent triage pipeline |
| `POST` | `/api/upload` | Upload invoice image or PDF for OCR |
| `GET` | `/api/mcp/bank-data` | Fetch MCP-formatted bank feed |
| `GET` | `/api/dashboard` | Aggregated dashboard data |
| `GET` | `/api/ml/predictions` | ML payment delay predictions |
| `GET` | `/api/obligations` | List all obligations |

Full interactive documentation is available at `http://localhost:8000/docs` when the backend is running.

---

## Project Structure

```
deltacash/
├── backend/
│   ├── main.py                  # FastAPI app entry point
│   ├── dependencies.py          # Shared DI / state
│   ├── state_store.py           # In-memory application state
│   ├── requirements.txt
│   ├── agents/
│   │   └── orchestrator.py      # LangGraph multi-agent pipeline
│   ├── ingestion/
│   │   └── ocr.py               # OCR + duplicate detection engine
│   ├── logic/
│   │   └── engine.py            # LiquidityEngine (DTZ, True Liquidity)
│   ├── mcp/
│   │   └── simulator.py         # MCP bank data simulator
│   ├── ml/
│   │   ├── predictor.py         # Ensemble ML predictor
│   │   └── ensemble_model.pkl   # Cached trained model
│   ├── models/
│   │   └── schemas.py           # All Pydantic data schemas
│   ├── routers/                 # FastAPI route handlers
│   │   ├── agent.py
│   │   ├── dashboard.py
│   │   ├── liquidity.py
│   │   ├── mcp.py
│   │   ├── ml_router.py
│   │   ├── obligations.py
│   │   ├── simulate.py
│   │   └── upload.py
│   ├── data/
│   │   └── mock_bank_statement.csv
│   └── tests/
│       └── test_engine.py
└── frontend/
    ├── app/
    │   ├── layout.tsx
    │   └── page.tsx
    ├── components/
    │   ├── ActionCenter.tsx
    │   ├── DashboardLayout.tsx
    │   ├── DTZGauge.tsx          # Circular runway indicator
    │   ├── EmailModal.tsx
    │   ├── LiquidityGraph.tsx
    │   ├── ObligationsList.tsx
    │   ├── OCRUpload.tsx
    │   ├── SplashLogin.tsx
    │   ├── StressTestButton.tsx
    │   └── tabs/
    │       ├── CalculatorTab.tsx
    │       ├── HomeTab.tsx
    │       ├── InputTab.tsx
    │       └── TimelineTab.tsx
    ├── lib/
    │   ├── api.ts               # Backend API client
    │   └── utils.ts
    └── types/
        └── index.ts
```

---

## Environment Variables

Create a `.env` file in the `backend/` directory:

```env
# Required for LLM-powered negotiation email generation
# If not set, the system falls back to professional templates
GOOGLE_API_KEY=your_google_gemini_api_key_here
```

---

## Running Tests

```bash
cd backend
pytest tests/
```

The test suite covers the core `LiquidityEngine` — DTZ calculation, True Liquidity math, and delay simulation.

---

## Roadmap

- [ ] Real bank API integration (via MCP-compliant connectors)
- [ ] Multi-currency support
- [ ] WhatsApp / email alerts when DTZ drops below threshold
- [ ] Historical cash flow analytics
- [ ] Team roles and multi-user support
- [ ] Export to PDF / Excel

---

## License

MIT License. See [LICENSE](LICENSE) for details.
