import { NextRequest, NextResponse } from "next/server";
import { searchAllSources } from "@/lib/jobApis";
import { matchJobsToResume } from "@/lib/claude";
import { ResumeProfile } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const profile: ResumeProfile = body.profile;

    if (!profile) {
      return NextResponse.json({ error: "No profile provided." }, { status: 400 });
    }

    const jobs = await searchAllSources(profile.searchQueries);

    if (jobs.length === 0) {
      return NextResponse.json({
        jobs: [],
        message:
          "No jobs found. Remotive, Arbeitnow, and The Muse are free and require no keys. For more results, add ADZUNA_* or RAPIDAPI_KEY to .env.local.",
      });
    }

    const matched = await matchJobsToResume(profile, jobs);
    matched.sort((a, b) => b.matchScore - a.matchScore);

    return NextResponse.json({ jobs: matched });
  } catch (err) {
    console.error("[search-jobs]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to search jobs." },
      { status: 500 }
    );
  }
}
