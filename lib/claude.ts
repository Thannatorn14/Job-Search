import Anthropic from "@anthropic-ai/sdk";
import { ResumeProfile, JobListing, MatchedJob } from "./types";

// ── Provider detection ────────────────────────────────────────────────────────
// Set OLLAMA_URL in .env.local to use Ollama instead of Claude API.
// Example: OLLAMA_URL=http://localhost:11434
const USE_OLLAMA = !!process.env.OLLAMA_URL;
const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.2";

// ── Low-level helpers ─────────────────────────────────────────────────────────

async function callOllama(prompt: string): Promise<string> {
  const res = await fetch(`${OLLAMA_URL}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      prompt,
      stream: false,
      format: "json",
    }),
  });
  if (!res.ok) throw new Error(`Ollama error: ${res.status} ${res.statusText}`);
  const data = await res.json();
  return data.response as string;
}

async function callClaude(prompt: string, maxTokens = 2048): Promise<string> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: maxTokens,
    messages: [{ role: "user", content: prompt }],
  });
  return msg.content[0].type === "text" ? msg.content[0].text.trim() : "";
}

async function callLLM(prompt: string, maxTokens = 2048): Promise<string> {
  const raw = USE_OLLAMA
    ? await callOllama(prompt)
    : await callClaude(prompt, maxTokens);
  // Strip accidental markdown fences
  return raw.replace(/^```[a-z]*\n?/, "").replace(/\n?```$/, "").trim();
}

// ── Public functions ──────────────────────────────────────────────────────────

export async function analyzeResume(resumeText: string): Promise<ResumeProfile> {
  const prompt = `Analyze this resume and return a JSON object with ONLY these fields (no extra text):
{
  "name": string | null,
  "email": string | null,
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
${resumeText}`;

  const json = await callLLM(prompt, 2048);
  try {
    return JSON.parse(json) as ResumeProfile;
  } catch {
    throw new Error("Failed to parse resume analysis response. Please try again.");
  }
}

export async function matchJobsToResume(
  profile: ResumeProfile,
  jobs: JobListing[]
): Promise<MatchedJob[]> {
  if (jobs.length === 0) return [];

  const listings = jobs
    .map(
      (j, i) =>
        `[${i}] "${j.title}" at ${j.company} — ${j.location}\n${j.description.slice(0, 350)}`
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
  let scores: Array<{
    index: number;
    matchScore: number;
    matchReason: string;
    matchingSkills: string[];
    missingSkills: string[];
  }>;
  try {
    scores = JSON.parse(json);
  } catch {
    throw new Error("Failed to parse job matching response. Please try again.");
  }

  return scores.map((s) => ({
    ...jobs[s.index],
    matchScore: s.matchScore,
    matchReason: s.matchReason,
    matchingSkills: s.matchingSkills ?? [],
    missingSkills: s.missingSkills ?? [],
  }));
}
