"use client";

import { useState } from "react";
import { Briefcase, Zap, Search, RotateCcw } from "lucide-react";
import ResumeInput from "@/components/ResumeInput";
import ProfileCard from "@/components/ProfileCard";
import JobCard from "@/components/JobCard";
import ProgressBar from "@/components/ProgressBar";
import { MatchedJob, ResumeProfile, SearchStatus } from "@/lib/types";

const IDLE: SearchStatus = { stage: "idle", message: "", progress: 0 };

export default function Page() {
  const [profile, setProfile] = useState<ResumeProfile | null>(null);
  const [jobs, setJobs] = useState<MatchedJob[]>([]);
  const [status, setStatus] = useState<SearchStatus>(IDLE);
  const [minScore, setMinScore] = useState(0);

  const loading =
    status.stage === "analyzing" ||
    status.stage === "searching" ||
    status.stage === "matching";

  const reset = () => {
    setProfile(null);
    setJobs([]);
    setStatus(IDLE);
    setMinScore(0);
  };

  async function handleSubmit(text: string, file?: File) {
    setStatus({ stage: "analyzing", message: "Reading your resume…", progress: 10 });
    setProfile(null);
    setJobs([]);

    try {
      /* ── Step 1: analyse resume ── */
      const form = new FormData();
      if (file) form.append("file", file);
      else form.append("text", text);

      const r1 = await fetch("/api/analyze-resume", { method: "POST", body: form });
      if (!r1.ok) throw new Error((await r1.json()).error ?? "Resume analysis failed.");

      const { profile: p } = await r1.json();
      setProfile(p);
      setStatus({
        stage: "searching",
        message: `Searching live jobs for "${p.jobTitles.slice(0, 2).join(", ")}"…`,
        progress: 40,
      });

      /* ── Step 2: search + match ── */
      const r2 = await fetch("/api/search-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile: p }),
      });
      if (!r2.ok) throw new Error((await r2.json()).error ?? "Job search failed.");

      setStatus({ stage: "matching", message: "Scoring job matches with AI…", progress: 80 });

      const { jobs: matched, message } = await r2.json();
      setJobs(matched ?? []);
      setStatus({
        stage: "done",
        message: message ?? `Found ${matched?.length ?? 0} jobs — ranked by AI match score.`,
        progress: 100,
      });
    } catch (err) {
      setStatus({
        stage: "error",
        message: err instanceof Error ? err.message : "Something went wrong.",
        progress: 0,
      });
    }
  }

  const visible = jobs.filter((j) => j.matchScore >= minScore);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* ── Nav ── */}
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
              <Briefcase className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-900">AI Job Matcher</span>
            <span className="text-xs text-gray-400 hidden sm:inline">· Powered by Claude</span>
          </div>

          <div className="flex items-center gap-3">
            {status.stage !== "idle" && (
              <button
                onClick={reset}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Start over
              </button>
            )}
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full">
              <Zap className="w-3.5 h-3.5 text-blue-500" />
              Real-time search
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-10 space-y-8">
        {/* ── Hero (shown only before first search) ── */}
        {status.stage === "idle" && (
          <>
            <div className="text-center space-y-3 pt-4">
              <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 leading-tight">
                Find Your{" "}
                <span className="bg-gradient-to-r from-blue-600 to-indigo-500 bg-clip-text text-transparent">
                  Perfect Job
                </span>
              </h1>
              <p className="text-gray-500 text-lg max-w-xl mx-auto">
                Upload your resume. Claude AI will search live job boards and rank every
                listing by how well it matches <em>your</em> skills.
              </p>
            </div>

            {/* Steps */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { icon: "📄", title: "Upload Resume", body: "PDF or plain text" },
                { icon: "🔍", title: "Live Search", body: "Adzuna · JSearch · Remotive · Arbeitnow · The Muse" },
                { icon: "🎯", title: "AI Ranking", body: "Match scores + skill gaps" },
              ].map((s) => (
                <div key={s.title} className="bg-white rounded-2xl border border-gray-100 p-5 text-center shadow-sm">
                  <div className="text-3xl mb-2">{s.icon}</div>
                  <p className="font-semibold text-gray-800 text-sm">{s.title}</p>
                  <p className="text-xs text-gray-400 mt-1">{s.body}</p>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── Upload card ── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <h2 className="font-semibold text-gray-800 mb-5 flex items-center gap-2">
            <Search className="w-4 h-4 text-blue-500" />
            {profile ? "Search again with a new resume" : "Your Resume"}
          </h2>
          <ResumeInput onSubmit={handleSubmit} loading={loading} />
        </div>

        {/* ── Progress ── */}
        {status.stage !== "idle" && <ProgressBar status={status} />}

        {/* ── Profile card ── */}
        {profile && <ProfileCard profile={profile} />}

        {/* ── Results ── */}
        {jobs.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900 text-lg">
                {visible.length} Job{visible.length !== 1 ? "s" : ""} Found
              </h2>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-500">Min match</span>
                <select
                  value={minScore}
                  onChange={(e) => setMinScore(Number(e.target.value))}
                  className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300 text-sm"
                >
                  <option value={0}>All</option>
                  <option value={40}>40 %+</option>
                  <option value={60}>60 %+</option>
                  <option value={80}>80 %+</option>
                </select>
              </div>
            </div>

            {visible.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400">
                No jobs pass the filter.{" "}
                <button onClick={() => setMinScore(0)} className="text-blue-500 hover:underline ml-1">
                  Clear filter
                </button>
              </div>
            ) : (
              <div className="grid gap-4">
                {visible.map((job, i) => (
                  <JobCard key={job.id} job={job} rank={i + 1} />
                ))}
              </div>
            )}
          </section>
        )}

        {/* ── Empty state ── */}
        {status.stage === "done" && jobs.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-14 text-center space-y-3">
            <p className="text-4xl">🔍</p>
            <p className="font-semibold text-gray-700">No live jobs found</p>
            <p className="text-sm text-gray-400 max-w-sm mx-auto">
              Remotive, Arbeitnow, and The Muse are free and require no API keys. For more
              results, add{" "}
              <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">ADZUNA_*</code> or{" "}
              <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">RAPIDAPI_KEY</code> in{" "}
              <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">.env.local</code>.
            </p>
          </div>
        )}
      </main>

      <footer className="text-center py-10 text-xs text-gray-400">
        AI Job Matcher · Built with Claude by Anthropic · Job data via Adzuna, JSearch, Remotive, Arbeitnow &amp; The Muse
      </footer>
    </div>
  );
}
