import Anthropic from "@anthropic-ai/sdk";
import { config, assertLlm } from "./config";
import { ResumeProfile, JobListing, MatchedJob } from "./types";

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
