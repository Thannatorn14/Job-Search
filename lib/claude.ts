import Anthropic from "@anthropic-ai/sdk";
import { config, assertLlm } from "./config";
import { ResumeProfile, JobListing, MatchedJob, ResumeCritique } from "./types";

// ── Timeout helper ─────────────────────────────────────────────────────────────

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms)
    ),
  ]);
}

// ── Low-level providers ───────────────────────────────────────────────────────

async function callOllama(prompt: string, maxTokens = 2048): Promise<string> {
  const res = await fetch(`${config.ollamaUrl}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: config.ollamaModel,
      prompt,
      stream: false,
      format: "json",
      options: { num_predict: maxTokens },
    }),
    signal: AbortSignal.timeout(90_000),
  });
  if (!res.ok) throw new Error(`Ollama error: ${res.status} ${res.statusText}`);
  const data = await res.json();
  return data.response as string;
}

async function callClaude(prompt: string, maxTokens = 2048): Promise<string> {
  const client = new Anthropic({ apiKey: config.anthropicApiKey });
  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: maxTokens,
    messages: [{ role: "user", content: prompt }],
  });
  return msg.content[0].type === "text" ? msg.content[0].text.trim() : "";
}

async function callLLM(prompt: string, maxTokens = 2048): Promise<string> {
  assertLlm();
  const raw = await withTimeout(
    config.useOllama
      ? callOllama(prompt, maxTokens)
      : callClaude(prompt, maxTokens),
    120_000,
    "LLM call"
  );
  // Strip accidental markdown fences the model sometimes wraps JSON in
  return raw.replace(/^```[a-z]*\n?/, "").replace(/\n?```$/, "").trim();
}

// ── Public functions ──────────────────────────────────────────────────────────

// Avoid flooding the LLM with huge PDFs — 8 000 chars ≈ ~2 000 tokens
const MAX_RESUME_CHARS = 8000;

const VALID_LEVELS = ["entry", "mid", "senior", "executive"] as const;

export async function analyzeResume(resumeText: string): Promise<ResumeProfile> {
  const truncated = resumeText.slice(0, MAX_RESUME_CHARS);

  const prompt = `Analyze this resume and return a JSON object with ONLY these fields (no extra text):
{
  "name": string or null,
  "email": string or null,
  "summary": "2-3 sentence professional summary",
  "skills": ["up to 20 skills"],
  "jobTitles": ["3-6 current or target job titles"],
  "experienceLevel": "entry" | "mid" | "senior" | "executive",
  "yearsOfExperience": number,
  "education": ["degrees and certifications"],
  "industries": ["up to 5 relevant industries"],
  "searchQueries": ["5-7 job search queries to find best matches, e.g. 'senior React developer TypeScript'"]
}

Resume:
${truncated}`;

  const json = await callLLM(prompt, 2048);
  let parsed: ResumeProfile;
  try {
    parsed = JSON.parse(json) as ResumeProfile;
  } catch {
    throw new Error("Failed to parse resume analysis response. Please try again.");
  }

  // Normalize: ensure arrays exist and values are the right types
  return {
    ...parsed,
    name: parsed.name ?? undefined,
    email: parsed.email ?? undefined,
    skills: Array.isArray(parsed.skills) ? parsed.skills : [],
    jobTitles: Array.isArray(parsed.jobTitles) ? parsed.jobTitles : [],
    education: Array.isArray(parsed.education) ? parsed.education : [],
    industries: Array.isArray(parsed.industries) ? parsed.industries : [],
    searchQueries: Array.isArray(parsed.searchQueries) ? parsed.searchQueries : [],
    experienceLevel: VALID_LEVELS.includes(parsed.experienceLevel)
      ? parsed.experienceLevel
      : "mid",
    yearsOfExperience:
      typeof parsed.yearsOfExperience === "number" ? parsed.yearsOfExperience : 0,
    summary: parsed.summary ?? "",
  };
}

export async function matchJobsToResume(
  profile: ResumeProfile,
  jobs: JobListing[]
): Promise<MatchedJob[]> {
  if (jobs.length === 0) return [];

  const listings = jobs
    .map(
      (j, i) =>
        `[${i}] "${j.title}" at ${j.company} — ${j.location}\n${j.description.slice(0, 400)}`
    )
    .join("\n\n---\n\n");

  const prompt = `You are a recruiting expert. Score each job for this candidate and return ONLY a JSON array (no extra text):

CANDIDATE:
Skills: ${profile.skills.join(", ")}
Level: ${profile.experienceLevel} (${profile.yearsOfExperience} yrs)
Targets: ${profile.jobTitles.join(", ")}
Industries: ${profile.industries.join(", ")}
Summary: ${profile.summary}

JOBS:
${listings}

Return array of objects (one per job):
[{
  "index": number,
  "matchScore": number (0-100, be realistic),
  "matchReason": "1-2 sentences",
  "matchingSkills": ["skills candidate has that match"],
  "missingSkills": ["skills job wants that candidate lacks"]
}]`;

  const json = await callLLM(prompt, 4096);

  type ScoreItem = {
    index: number;
    matchScore: number;
    matchReason: string;
    matchingSkills: string[];
    missingSkills: string[];
  };

  let scores: ScoreItem[];
  try {
    const raw = JSON.parse(json);
    // LLM sometimes wraps the array in an object like { results: [...] }
    scores = Array.isArray(raw) ? raw : (raw.results ?? raw.jobs ?? raw.matches ?? []);
  } catch {
    throw new Error("Failed to parse job matching response. Please try again.");
  }

  if (!Array.isArray(scores)) {
    throw new Error("Unexpected AI response format. Please try again.");
  }

  return scores
    .filter((s) => typeof s.index === "number" && s.index >= 0 && s.index < jobs.length)
    .map((s) => ({
      ...jobs[s.index],
      matchScore: Math.min(100, Math.max(0, Math.round(s.matchScore ?? 0))),
      matchReason: s.matchReason ?? "",
      matchingSkills: Array.isArray(s.matchingSkills) ? s.matchingSkills : [],
      missingSkills: Array.isArray(s.missingSkills) ? s.missingSkills : [],
    }));
}

export async function generateCoverLetter(
  profile: ResumeProfile,
  job: JobListing
): Promise<string> {
  const candidateName = profile.name ?? "the applicant";

  const prompt = `Write a professional, tailored cover letter for this job application.

CANDIDATE:
Name: ${candidateName}
Skills: ${profile.skills.slice(0, 12).join(", ")}
Experience: ${profile.experienceLevel}-level, ${profile.yearsOfExperience} years
Education: ${profile.education.join("; ")}
Summary: ${profile.summary}

JOB:
Title: ${job.title}
Company: ${job.company}
Location: ${job.location}
Description: ${job.description.slice(0, 700)}

Write exactly 3 paragraphs:
1. Opening — genuine enthusiasm for this specific role and company, referencing something specific from the description.
2. Body — connect the candidate's top 3 relevant skills or achievements to the job's key requirements.
3. Closing — confident call to action, invite to discuss further, sign off with the candidate's name.

Return ONLY the cover letter text. No subject line, no placeholders like [Your Name], no markdown.`;

  return callLLM(prompt, 1024);
}

export async function critiqueResume(
  profile: ResumeProfile,
  jobs: MatchedJob[]
): Promise<ResumeCritique> {
  // Aggregate skill gaps from matched jobs for market context
  const missingCounts: Record<string, number> = {};
  for (const job of jobs) {
    for (const skill of job.missingSkills ?? []) {
      const k = skill.trim();
      if (k) missingCounts[k] = (missingCounts[k] ?? 0) + 1;
    }
  }
  const topMissing = Object.entries(missingCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([skill, count]) => `${skill} (${count}/${jobs.length} jobs)`);

  const avgScore =
    jobs.length > 0
      ? Math.round(jobs.reduce((s, j) => s + j.matchScore, 0) / jobs.length)
      : null;

  const marketSection =
    jobs.length > 0
      ? `MARKET FEEDBACK (from ${jobs.length} AI-matched jobs):
Average match score: ${avgScore}%
Top skill gaps: ${topMissing.join(", ") || "none identified"}`
      : "No matched jobs available yet — critique based on profile alone.";

  const prompt = `You are a senior career coach and expert resume reviewer. Analyze this candidate's resume profile and return specific, actionable feedback.

CANDIDATE PROFILE:
Target roles: ${profile.jobTitles.join(", ")}
Summary: ${profile.summary}
Skills listed: ${profile.skills.join(", ")}
Experience: ${profile.experienceLevel}-level, ${profile.yearsOfExperience} years
Education: ${profile.education.join("; ")}
Industries: ${profile.industries.join(", ")}

${marketSection}

Return ONLY a JSON object (no extra text, no markdown fences):
{
  "overallScore": number (0–100, be honest and calibrated),
  "grade": "A+" | "A" | "A-" | "B+" | "B" | "B-" | "C+" | "C" | "D",
  "headline": "One sentence capturing the biggest strength AND the biggest gap",
  "sections": [
    {
      "name": "Professional Summary",
      "score": number,
      "status": "strong" | "good" | "needs-work" | "missing",
      "issues": ["up to 2 specific issues"],
      "suggestions": ["up to 2 concrete fixes"]
    },
    {
      "name": "Work Experience",
      "score": number,
      "status": "strong" | "good" | "needs-work" | "missing",
      "issues": ["up to 2 specific issues"],
      "suggestions": ["up to 2 concrete fixes"]
    },
    {
      "name": "Skills Section",
      "score": number,
      "status": "strong" | "good" | "needs-work" | "missing",
      "issues": ["up to 2 specific issues"],
      "suggestions": ["up to 2 concrete fixes"]
    },
    {
      "name": "Education",
      "score": number,
      "status": "strong" | "good" | "needs-work" | "missing",
      "issues": ["up to 2 specific issues"],
      "suggestions": ["up to 2 concrete fixes"]
    },
    {
      "name": "ATS & Keywords",
      "score": number,
      "status": "strong" | "good" | "needs-work" | "missing",
      "issues": ["up to 2 specific issues"],
      "suggestions": ["up to 2 concrete fixes"]
    }
  ],
  "quickWins": ["3–5 specific improvements each doable in under 10 minutes"],
  "marketAlignment": "2 sentences: how well the candidate fits current market demand and what single change would most improve their match rate"
}`;

  const json = await callLLM(prompt, 2048);
  try {
    const raw = JSON.parse(json);
    // Ensure required fields exist
    return {
      overallScore: Math.min(100, Math.max(0, raw.overallScore ?? 50)),
      grade: raw.grade ?? "B",
      headline: raw.headline ?? "",
      sections: Array.isArray(raw.sections) ? raw.sections : [],
      quickWins: Array.isArray(raw.quickWins) ? raw.quickWins : [],
      marketAlignment: raw.marketAlignment ?? "",
    };
  } catch {
    throw new Error("Failed to parse resume critique. Please try again.");
  }
}
