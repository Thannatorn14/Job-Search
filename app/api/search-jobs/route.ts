import { NextRequest, NextResponse } from "next/server";
import { searchAllSources } from "@/lib/jobApis";
import { matchJobsToResume } from "@/lib/claude";
import { assertLlm } from "@/lib/config";
import { ResumeProfile } from "@/lib/types";

// Allow up to 60 s on Vercel Pro / AWS Lambda
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    assertLlm();

    const body = await req.json();
    const profile: ResumeProfile = body.profile;

    if (!profile) {
      return NextResponse.json({ error: "No profile provided." }, { status: 400 });
    }

    if (!profile.searchQueries || profile.searchQueries.length === 0) {
      return NextResponse.json(
        {
          error:
            "Resume profile is missing search queries. Please re-analyze your resume.",
        },
        { status: 400 }
      );
    }

    const jobs = await searchAllSources(profile.searchQueries);

    if (jobs.length === 0) {
      return NextResponse.json({
        jobs: [],
        message:
          "No jobs found. Remotive, Arbeitnow, and The Muse are free — no API keys needed. " +
          "For broader results add ADZUNA_* or RAPIDAPI_KEY to .env.local.",
      });
    }

    const matched = await matchJobsToResume(profile, jobs);
    matched.sort((a, b) => b.matchScore - a.matchScore);

    return NextResponse.json({ jobs: matched, total: jobs.length });
  } catch (err) {
    console.error("[search-jobs]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to search jobs." },
      { status: 500 }
    );
  }
}
