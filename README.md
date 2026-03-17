# NPS Analyzer

A full-stack application for analyzing Net Promoter Score (NPS) feedback. Upload NPS survey CSV files, visualize scores by account and region, and gain AI-powered insights into customer sentiment.

## What This Product Does

**NPS Analyzer** turns raw NPS feedback into actionable insights:

- **Upload & Analyze** — Upload CSV files containing NPS survey data (scores, comments, account names). The app parses and classifies responses as Promoters (9–10), Passives (7–8), or Detractors (0–6).
- **Results Dashboard** — View overall NPS score, breakdown by account/region, sortable tables, and a US state map showing regional performance.
- **Configure Initiatives** — Define product initiatives and use AI (OpenAI) to generate descriptions. Track which initiatives address specific feedback themes.
- **Comment Insights** — Analyze survey comments for themes, sentiment, and suggested resolutions tied to your initiatives.

The app also includes **event management** features (create, edit, discover events with location support) built on the same stack.

## How to Run

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+ recommended) and npm
- Optional: [nvm](https://github.com/nvm-sh/nvm#installing-and-updating) for managing Node versions

### Quick Start

```sh
# 1. Clone the repository
git clone <YOUR_GIT_URL>
cd nps

# 2. Install dependencies
npm install

# 3. Set up environment variables
# Create a .env file in the project root with:
#   VITE_SUPABASE_URL="your-supabase-url"
#   VITE_SUPABASE_PUBLISHABLE_KEY="your-supabase-anon-key"

# 4. Start the development server
npm run dev
```

The app will be available at `http://localhost:5173` (or the port shown in the terminal).

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build locally |
| `npm run analyze:nps` | Run NPS analysis script (Python) |
| `npm run lint` | Run ESLint |

## Configuration

### Required: Supabase

The app uses [Supabase](https://supabase.com/) for authentication and data storage. Create a project and add to `.env`:

```
VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="your-anon-key"
```

### Optional: Google Maps

For event location features (autocomplete, maps):

1. Enable **Places API (New)** in [Google Cloud Console](https://console.cloud.google.com/)
2. Create an API key
3. Add to `.env`:
   ```
   VITE_GOOGLE_MAPS_API_KEY="your-api-key-here"
   ```

### Optional: OpenAI

For AI-generated initiative descriptions in Configure:

- Add your OpenAI API key when prompted in the Configure page (stored in session storage)

## Technologies

- **Frontend:** React, TypeScript, Vite
- **UI:** shadcn/ui, Tailwind CSS, Radix UI
- **Backend:** Supabase (auth, database)
- **Charts & Maps:** Recharts, react-simple-maps
- **Data:** PapaParse (CSV), TanStack Query

## Project Info

**Lovable Project:** [https://lovable.dev/projects/f1ba0c74-af75-4389-a8ae-60baf80911b5](https://lovable.dev/projects/f1ba0c74-af75-4389-a8ae-60baf80911b5)

Changes made via Lovable are committed automatically to this repo. You can also edit locally and push changes.

## Deployment

Open the [Lovable project](https://lovable.dev/projects/f1ba0c74-af75-4389-a8ae-60baf80911b5) and use **Share → Publish** to deploy. Custom domains can be configured under **Project → Settings → Domains**.
