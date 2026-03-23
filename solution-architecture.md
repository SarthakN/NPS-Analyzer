# Solution Architecture

## High-Level Overview

The NPS Analyzer is a client-side React application with optional backend services. Analysis runs in the browser; persistence and AI features use Supabase and OpenAI.

```
┌─────────────────────────────────────────────────────────────────┐
│                        React SPA (Vite)                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐               │
│  │   Discover  │  │   Results   │  │  Configure  │               │
│  │  (Upload)    │──│  (Dashboard)│  │ (Roadmap)│               │
│  └─────────────┘  └─────────────┘  └─────────────┘               │
│         │                  │                  │                   │
│         ▼                  ▼                  ▼                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  NPS Analysis (client)  │  Comment Insights  │  State/Storage │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
         │                  │                  │
         ▼                  ▼                  ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Session    │    │  Supabase   │    │   OpenAI    │
│  Storage    │    │  (Auth/DB)  │    │  (Optional) │
└─────────────┘    └─────────────┘    └─────────────┘
```

## Core Components

### 1. Data Flow

| Step | Component | Responsibility |
|------|-----------|----------------|
| 1 | `NpsUpload` | Accept CSV file, validate type/size, read as text |
| 2 | `analyzeNpsCsv()` | Parse CSV (PapaParse), classify scores, aggregate by account/role/state |
| 3 | Session storage | Persist `NpsAnalysisResult` for Results page |
| 4 | `Results` page | Render tables, map, charts; optionally run comment insights |
| 5 | `generateCommentInsights()` | Call OpenAI to extract themes; match to Roadmap |

### 2. NPS Analysis Engine (`src/lib/npsAnalysis.ts`)

- **Input:** CSV text with columns: Survey Score, Account Name, Roles, Inferred State Name, Survey Comment
- **Classification:** Promoters (9–10), Passives (7–8), Detractors (0–6)
- **Output:** `NpsAnalysisResult` with overall NPS, `byAccount`, `byRole`, `byState`, `surveyComments`
- **Flexibility:** Column names are matched case-insensitively against common variants

### 3. Comment Insights (`src/lib/commentLabels.ts`)

- Uses OpenAI to extract themes and issues from survey comments
- Second pass: checks which configured Roadmap items would resolve each issue
- Results shown as expandable insight cards on the Results page

### 4. Configure / Initiatives

- **Storage:** Supabase `nps_initiatives` table (when authenticated) or session storage
- **Products:** PowerSchool Applicant Tracking, Sourcing, Records, Smart Find Express
- **AI:** Optional OpenAI integration to generate Roadmap descriptions from summaries

### 5. Persistence

| Data | Storage | Scope |
|------|---------|-------|
| Analysis result | Session storage | Per tab, lost on close |
| Roadmap | Supabase + session | Per user when logged in |
| OpenAI API key | Session storage | Per session, not persisted |

## Technology Stack

| Layer | Technology |
|-------|------------|
| Build | Vite 7 |
| Framework | React 18, TypeScript |
| UI | shadcn/ui, Tailwind CSS, Radix UI |
| Charts | Recharts |
| Maps | react-simple-maps |
| CSV | PapaParse |
| Backend | Supabase (auth, PostgreSQL) |
| AI | OpenAI API (optional) |

## Key Design Decisions

1. **Client-side analysis** — CSV parsing and NPS computation run in the browser. No server required for core workflow; fast and privacy-friendly.
2. **Session storage for results** — Analysis is ephemeral. For long-term retention, a future enhancement could persist to Supabase.
3. **Optional auth** — Configure works without login (session storage); login enables cloud-synced Roadmap.
4. **Flexible CSV schema** — Multiple column name variants supported to accommodate different survey tools.
5. **Modular AI** — OpenAI is optional; core NPS analysis works without it.

## File Structure (Relevant Paths)

```
src/
├── lib/
│   ├── npsAnalysis.ts      # CSV parsing, NPS calculation
│   └── commentLabels.ts    # OpenAI theme extraction, initiative resolution
├── components/
│   ├── NpsUpload.tsx       # File upload UI
│   ├── NpsScoreCell.tsx    # Score display with color coding
│   └── NpsStateMap.tsx     # US state choropleth
├── pages/
│   ├── Discover.tsx        # Landing + upload
│   ├── Results.tsx         # Dashboard
│   └── Configure.tsx       # Roadmap management
└── integrations/supabase/ # Auth, DB client
```

## Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `VITE_SUPABASE_URL` | Yes | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Yes | Supabase anon key |
| `VITE_GOOGLE_MAPS_API_KEY` | No | Event location features |
| OpenAI API key | No | Entered in Configure UI; stored in session |
