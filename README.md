# AI Job Matcher

> Upload your resume — Claude AI searches live job boards and ranks every listing by how well it matches **your** skills and experience.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38bdf8?logo=tailwindcss)
![Claude](https://img.shields.io/badge/Claude-claude--sonnet--4--6-blueviolet?logo=anthropic)

---

## What it does

1. **Upload your resume** — drag-and-drop a PDF or paste plain text
2. **Claude analyses it** — extracts skills, job titles, experience level, and generates smart search queries
3. **Live job search** — queries Adzuna and JSearch/RapidAPI in parallel to pull real postings from across the web
4. **AI matching** — Claude scores every job 0–100 % against your profile, explains the fit, and flags matching/missing skills
5. **Ranked results** — jobs sorted by match score with salary, location, and a direct Apply link

---

## Screenshots

### Landing page
```
┌──────────────────────────────────────────────┐
│  🗂 AI Job Matcher  ·  Powered by Claude      │
├──────────────────────────────────────────────┤
│                                              │
│       Find Your Perfect Job                  │
│                                              │
│  📄 Upload Resume  🔍 Live Search  🎯 Ranked  │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │  Drop your resume here or click        │  │
│  │         to browse (PDF / TXT)          │  │
│  └────────────────────────────────────────┘  │
│                                              │
│       [ Find Matching Jobs ]                 │
└──────────────────────────────────────────────┘
```

### Results
```
┌─────────────────────────────────── 87% Excellent match ─┐
│ 1  Senior Frontend Engineer · Stripe · San Francisco     │
│    $140k – $180k/yr  ·  Posted Mar 26                   │
│ ██████████████████████░░░░  87 %                        │
│ Strong TypeScript and React match; team uses Next.js.    │
│ ✅ React  ✅ TypeScript  ✅ Next.js  ❌ GraphQL           │
│                              [ Apply Now → ]             │
└──────────────────────────────────────────────────────────┘
```

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Framework | [Next.js 16](https://nextjs.org) (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4 |
| AI | [Claude claude-sonnet-4-6](https://anthropic.com) via `@anthropic-ai/sdk` |
| Job data | [Adzuna API](https://developer.adzuna.com) + [JSearch (RapidAPI)](https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch) |
| PDF parsing | `pdf-parse` |
| Icons | `lucide-react` |

---

## Getting started

### 1 · Clone and install

```bash
git clone https://github.com/Thannatorn14/Job-Search.git
cd Job-Search
npm install
```

### 2 · Set up API keys

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```env
# Required – https://console.anthropic.com/
ANTHROPIC_API_KEY=sk-ant-...

# Option A: Adzuna (250 free requests/month)
# https://developer.adzuna.com/signup
ADZUNA_APP_ID=your_app_id
ADZUNA_APP_KEY=your_app_key
ADZUNA_COUNTRY=us          # us | gb | au | ca | de | fr | in …

# Option B: JSearch via RapidAPI (searches Indeed, LinkedIn, Glassdoor)
# https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch
RAPIDAPI_KEY=your_rapidapi_key
```

You need **at least one** job API key (Adzuna or RapidAPI) plus the Anthropic key.

### 3 · Run

```bash
npm run dev      # http://localhost:3000
```

---

## Project structure

```
/
├── app/
│   ├── layout.tsx                  # Root layout
│   ├── page.tsx                    # Main page (client)
│   ├── globals.css
│   └── api/
│       ├── analyze-resume/route.ts # POST: parse PDF/text → Claude profile
│       └── search-jobs/route.ts    # POST: search APIs → Claude scoring
├── components/
│   ├── ResumeInput.tsx             # Upload / paste tabs with drag-and-drop
│   ├── ProfileCard.tsx             # Extracted resume summary
│   ├── JobCard.tsx                 # Single job result with score bar
│   └── ProgressBar.tsx             # Live progress indicator
├── lib/
│   ├── types.ts                    # Shared TypeScript interfaces
│   ├── claude.ts                   # analyzeResume() + matchJobsToResume()
│   └── jobApis.ts                  # searchAdzuna() + searchJSearch()
├── .env.local.example
├── next.config.ts
├── tsconfig.json
└── package.json
```

---

## How the AI pipeline works

```
Resume (PDF / text)
        │
        ▼
┌───────────────────┐
│  Claude Sonnet    │  → extracts: skills, titles, experience level,
│  analyzeResume()  │    education, industries, 5-7 search queries
└───────────────────┘
        │
        ▼
┌───────────────────┐
│  Job APIs         │  Adzuna + JSearch called in parallel for each
│  (real-time)      │  search query → deduplicated job listings
└───────────────────┘
        │
        ▼
┌───────────────────┐
│  Claude Sonnet    │  → scores each job 0-100%, writes match reason,
│  matchJobs()      │    identifies matching & missing skills
└───────────────────┘
        │
        ▼
  Ranked results (highest match first)
```

---

## Team

<!-- Add team members here -->
