import { NextRequest, NextResponse } from "next/server";
import { critiqueResume } from "@/lib/claude";
import { assertLlm } from "@/lib/config";
import { ResumeProfile, MatchedJob } from "@/lib/types";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    assertLlm();

    const body = await req.json();
    const profile: ResumeProfile = body.profile;
    const jobs: MatchedJob[] = body.jobs ?? [];

    if (!profile) {
      return NextResponse.json({ error: "No profile provided." }, { status: 400 });
    }

    if (!profile.summary && !profile.skills?.length) {
      return NextResponse.json(
        { error: "Profile is too incomplete to critique. Please re-analyze your resume." },
        { status: 400 }
      );
    }

    const critique = await critiqueResume(profile, jobs);
    return NextResponse.json({ critique });
  } catch (err) {
    console.error("[critique-resume]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to critique resume." },
      { status: 500 }
    );
  }
}
