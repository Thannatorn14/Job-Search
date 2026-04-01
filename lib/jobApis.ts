import { JobListing } from "./types";

const COUNTRY = process.env.ADZUNA_COUNTRY || "us";
const ADZUNA_ID = process.env.ADZUNA_APP_ID || "";
const ADZUNA_KEY = process.env.ADZUNA_APP_KEY || "";
const RAPID_KEY = process.env.RAPIDAPI_KEY || "";

// ── Adzuna ────────────────────────────────────────────────────────────────────

async function searchAdzuna(query: string, perPage = 8): Promise<JobListing[]> {
  if (!ADZUNA_ID || !ADZUNA_KEY) return [];
  const params = new URLSearchParams({
    app_id: ADZUNA_ID,
    app_key: ADZUNA_KEY,
    results_per_page: String(perPage),
    what: query,
  });
  try {
    const res = await fetch(
      `https://api.adzuna.com/v1/api/jobs/${COUNTRY}/search/1?${params}`,
      { cache: "no-store" }
    );
    if (!res.ok) return [];
    const data = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data.results ?? []).map((j: any) => ({
      id: `adzuna-${j.id}`,
      title: j.title ?? "",
      company: j.company?.display_name ?? "Unknown",
      location: j.location?.display_name ?? "",
      description: j.description ?? "",
      salary: salaryRange(j.salary_min, j.salary_max),
      postedAt: j.created ?? undefined,
      applyUrl: j.redirect_url ?? "",
      source: "Adzuna",
    }));
  } catch {
    return [];
  }
}

// ── JSearch (RapidAPI) ────────────────────────────────────────────────────────

async function searchJSearch(query: string, perPage = 6): Promise<JobListing[]> {
  if (!RAPID_KEY) return [];
  const params = new URLSearchParams({
    query,
    page: "1",
    num_pages: "1",
    date_posted: "week",
  });
  try {
    const res = await fetch(`https://jsearch.p.rapidapi.com/search?${params}`, {
      headers: {
        "X-RapidAPI-Key": RAPID_KEY,
        "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
      },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return ((data.data ?? []) as any[]).slice(0, perPage).map((j) => ({
      id: `jsearch-${j.job_id}`,
      title: j.job_title ?? "",
      company: j.employer_name ?? "Unknown",
      location: [j.job_city, j.job_state, j.job_country].filter(Boolean).join(", "),
      description: j.job_description ?? "",
      salary: salaryFromJSearch(j.job_min_salary, j.job_max_salary, j.job_salary_period),
      jobType: j.job_employment_type ?? undefined,
      postedAt: j.job_posted_at_datetime_utc ?? undefined,
      applyUrl: j.job_apply_link ?? j.job_google_link ?? "",
      source: j.job_publisher ?? "JSearch",
    }));
  } catch {
    return [];
  }
}

// ── Remotive (free, no key needed — remote/tech jobs) ─────────────────────────

async function searchRemotive(query: string, limit = 8): Promise<JobListing[]> {
  try {
    const params = new URLSearchParams({ search: query, limit: String(limit) });
    const res = await fetch(`https://remotive.com/api/remote-jobs?${params}`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data.jobs ?? []).map((j: any) => ({
      id: `remotive-${j.id}`,
      title: j.title ?? "",
      company: j.company_name ?? "Unknown",
      location: j.candidate_required_location || "Remote",
      description: j.description ?? "",
      salary: j.salary || "",
      jobType: j.job_type ?? undefined,
      postedAt: j.publication_date ?? undefined,
      applyUrl: j.url ?? "",
      source: "Remotive",
    }));
  } catch {
    return [];
  }
}

// ── Arbeitnow (free, no key needed — EU + remote jobs) ───────────────────────

async function searchArbeitnow(query: string, perPage = 6): Promise<JobListing[]> {
  try {
    const params = new URLSearchParams({ q: query });
    const res = await fetch(`https://www.arbeitnow.com/api/job-board-api?${params}`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return ((data.data ?? []) as any[]).slice(0, perPage).map((j) => ({
      id: `arbeitnow-${j.slug}`,
      title: j.title ?? "",
      company: j.company_name ?? "Unknown",
      location: j.location ?? (j.remote ? "Remote" : ""),
      description: stripHtml(j.description ?? ""),
      jobType: j.job_types?.[0] ?? undefined,
      postedAt: j.created_at ? new Date(j.created_at * 1000).toISOString() : undefined,
      applyUrl: j.url ?? "",
      source: "Arbeitnow",
    }));
  } catch {
    return [];
  }
}

// ── The Muse (free, no key needed — US jobs) ──────────────────────────────────

async function searchTheMuse(query: string, perPage = 6): Promise<JobListing[]> {
  try {
    const params = new URLSearchParams({ query, page: "1", descending: "true" });
    const res = await fetch(`https://www.themuse.com/api/public/jobs?${params}`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return ((data.results ?? []) as any[]).slice(0, perPage).map((j) => ({
      id: `themuse-${j.id}`,
      title: j.name ?? "",
      company: j.company?.name ?? "Unknown",
      location:
        j.locations?.map((l: { name: string }) => l.name).join(", ") || "Remote",
      description: stripHtml(j.contents ?? ""),
      jobType: j.levels?.[0]?.name ?? undefined,
      postedAt: j.publication_date ?? undefined,
      applyUrl: j.refs?.landing_page ?? "",
      source: "The Muse",
    }));
  } catch {
    return [];
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

// ── Aggregator ────────────────────────────────────────────────────────────────

export async function searchAllSources(queries: string[]): Promise<JobListing[]> {
  const top = queries.slice(0, 3);

  const promises = top.flatMap((q) => [
    searchAdzuna(q),
    searchJSearch(q),
    searchRemotive(q),
    searchArbeitnow(q),
    searchTheMuse(q),
  ]);

  const results = await Promise.all(promises);
  const all = results.flat();

  // Deduplicate by title + company
  const seen = new Set<string>();
  return all.filter((j) => {
    const key = `${j.title.toLowerCase()}|${j.company.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ── Salary formatters ─────────────────────────────────────────────────────────

function salaryRange(min?: number, max?: number): string {
  if (!min && !max) return "";
  if (min && max) return `$${Math.round(min / 1000)}k – $${Math.round(max / 1000)}k`;
  if (min) return `From $${Math.round(min / 1000)}k`;
  return `Up to $${Math.round(max! / 1000)}k`;
}

function salaryFromJSearch(min?: number, max?: number, period?: string): string {
  if (!min && !max) return "";
  const s = period === "HOUR" ? "/hr" : period === "YEAR" ? "/yr" : "";
  if (min && max) {
    if (period === "YEAR")
      return `$${Math.round(min / 1000)}k – $${Math.round(max / 1000)}k${s}`;
    return `$${min} – $${max}${s}`;
  }
  return "";
}
