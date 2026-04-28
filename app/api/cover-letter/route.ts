import { NextRequest, NextResponse } from "next/server";
import { generateCoverLetter } from "@/lib/claude";
import { assertLlm } from "@/lib/config";
import { ResumeProfile, JobListing } from "@/lib/types";

// Allow up to 60 s on Vercel Pro / AWS Lambda
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    assertLlm();

    const body = await req.json();
    const profile: ResumeProfile = body.profile;
    const job: JobListing = body.job;

    if (!profile || !job) {
      return NextResponse.json(
        { error: "Missing profile or job in request body." },
        { status: 400 }
      );
    }

    if (!profile.skills?.length || !profile.summary) {
      return NextResponse.json(
        { error: "Profile is incomplete. Please re-analyze your resume first." },
        { status: 400 }
      );
    }

    const coverLetter = await generateCoverLetter(profile, job);
    return NextResponse.json({ coverLetter });
  } catch (err) {
    console.error("[cover-letter]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to generate cover letter." },
      { status: 500 }
    );
  }
}
