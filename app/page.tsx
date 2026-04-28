"use client";

import { useState } from "react";
import {
  Briefcase,
  Zap,
  Search,
  RotateCcw,
  Download,
  Bookmark,
  SlidersHorizontal,
  X,
} from "lucide-react";
import ResumeInput from "@/components/ResumeInput";
import ProfileCard from "@/components/ProfileCard";
import JobCard from "@/components/JobCard";
import ProgressBar from "@/components/ProgressBar";
import SkillGapPanel from "@/components/SkillGapPanel";
import ResumeCritiquePanel from "@/components/ResumeCritiquePanel";
import SavedJobsTab from "@/components/SavedJobsTab";
import CoverLetterModal from "@/components/CoverLetterModal";
import { useSavedJobs } from "@/hooks/useSavedJobs";
import { MatchedJob, ResumeProfile, SearchStatus } from "@/lib/types";

const IDLE: SearchStatus = { stage: "idle", message: "", progress: 0 };

export default function Page() {
  const [profile, setProfile] = useState<ResumeProfile | null>(null);
  const [jobs, setJobs] = useState<MatchedJob[]>([]);
  const [status, setStatus] = useState<SearchStatus>(IDLE);

  // Filters
  const [minScore, setMinScore] = useState(0);
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");

  // Tab: "results" | "saved"
  const [view, setView] = useState<"results" | "saved">("results");

  const { saved, saveJob, removeJob, updateStatus, isSaved } = useSavedJobs();
  const savedCount = Object.keys(saved).length;

  // Cover letter modal
  const [coverLetterJob, setCoverLetterJob] = useState<MatchedJob | null>(null);

  const loading =
    status.stage === "analyzing" ||
    status.stage === "searching" ||
    status.stage === "matching";

  const reset = () => {
    setProfile(null);
    setJobs([]);
    setStatus(IDLE);
    setMinScore(0);
    setSearch("");
    setSourceFilter("");
    setView("results");
  };

  async function handleSubmit(text: string, file?: File) {
    setStatus({ stage: "analyzing", message: "Reading your resume…", progress: 10 });
    setProfile(null);
    setJobs([]);
    setSearch("");
    setSourceFilter("");

    try {
      const form = new FormData();
      if (file) form.append("file", file);
      else form.append("text", text);

      const r1 = await fetch("/api/analyze-resume", { method: "POST", body: form });
      if (!r1.ok) {
        const b = await r1.json().catch(() => ({}));
        throw new Error(b.error ?? "Resume analysis failed.");
      }
      const { profile: p } = await r1.json();
      setProfile(p);

      setStatus({
        stage: "searching",
        message: `Searching live jobs for "${(p.jobTitles ?? []).slice(0, 2).join(", ")}"…`,
        progress: 40,
      });

      const r2 = await fetch("/api/search-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile: p }),
      });

      setStatus({ stage: "matching", message: "Scoring job matches with AI…", progress: 80 });

      if (!r2.ok) {
        const b = await r2.json().catch(() => ({}));
        throw new Error(b.error ?? "Job search failed.");
      }

      const { jobs: matched, message, total } = await r2.json();
      setJobs(matched ?? []);
      setStatus({
        stage: "done",
        message:
          message ??
          `Found ${matched?.length ?? 0} matched jobs${total ? ` from ${total} listings` : ""} — ranked by AI score.`,
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

  // Collect unique sources for the filter dropdown
  const sources = [...new Set(jobs.map((j) => j.source))].sort();

  // Apply all filters
  const visible = jobs.filter((j) => {
    if (j.matchScore < minScore) return false;
    if (sourceFilter && j.source !== sourceFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      if (
        !j.title.toLowerCase().includes(q) &&
        !j.company.toLowerCase().includes(q) &&
        !j.location.toLowerCase().includes(q)
      )
        return false;
    }
    return true;
  });

  const hasFilters = search !== "" || sourceFilter !== "" || minScore !== 0;

  function exportCsv() {
    if (visible.length === 0) return;
    const headers = [
      "Rank",
      "Title",
      "Company",
      "Location",
      "Match Score",
      "Salary",
      "Job Type",
      "Source",
      "Posted",
      "Apply URL",
      "Match Reason",
    ];
    const esc = (v: string | undefined) =>
      `"${(v ?? "").replace(/"/g, '""').replace(/\n/g, " ")}"`;
    const rows = visible.map((job, i) => [
      i + 1,
      esc(job.title),
      esc(job.company),
      esc(job.location),
      job.matchScore,
      esc(job.salary),
      esc(job.jobType),
      esc(job.source),
      esc(job.postedAt),
      esc(job.applyUrl),
      esc(job.matchReason),
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `job-matches-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

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
            {savedCount > 0 && (
              <button
                onClick={() => setView("saved")}
                className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 transition-colors font-medium"
              >
                <Bookmark className="w-3.5 h-3.5" fill="currentColor" />
                {savedCount} saved
              </button>
            )}
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
        {/* ── Hero ── */}
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
                Upload your resume. Claude AI will search live job boards and rank every listing
                by how well it matches <em>your</em> skills.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {[
                { icon: "📄", title: "Upload Resume", body: "PDF or plain text" },
                {
                  icon: "🔍",
                  title: "Live Search",
                  body: "Adzuna · JSearch · Remotive · Arbeitnow · The Muse",
                },
                { icon: "🎯", title: "AI Ranking", body: "Match scores + skill gaps" },
              ].map((s) => (
                <div
                  key={s.title}
                  className="bg-white rounded-2xl border border-gray-100 p-5 text-center shadow-sm"
                >
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

        {/* ── Resume critique panel ── */}
        {profile && (
          <ResumeCritiquePanel profile={profile} jobs={jobs} />
        )}

        {/* ── Skill gap panel ── */}
        {jobs.length > 0 && <SkillGapPanel jobs={jobs} />}

        {/* ── Results / Saved tabs ── */}
        {(jobs.length > 0 || savedCount > 0) && (
          <section className="space-y-4">
            {/* ── Tab bar + controls ── */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Tab switcher */}
              <div className="flex bg-gray-100 rounded-xl p-1 gap-1 shrink-0">
                <button
                  onClick={() => setView("results")}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    view === "results"
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Results
                  {jobs.length > 0 && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-semibold">
                      {visible.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setView("saved")}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    view === "saved"
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <Bookmark className="w-3.5 h-3.5" />
                  Saved
                  {savedCount > 0 && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-semibold">
                      {savedCount}
                    </span>
                  )}
                </button>
              </div>

              {/* Filters (only in results view) */}
              {view === "results" && jobs.length > 0 && (
                <>
                  {/* Text search */}
                  <div className="relative flex-1 min-w-[140px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search title, company…"
                      className="w-full pl-8 pr-8 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
                    />
                    {search && (
                      <button
                        onClick={() => setSearch("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Source filter */}
                  {sources.length > 1 && (
                    <select
                      value={sourceFilter}
                      onChange={(e) => setSourceFilter(e.target.value)}
                      className="border border-gray-200 rounded-lg px-2.5 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
                    >
                      <option value="">All sources</option>
                      {sources.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  )}

                  {/* Min score */}
                  <select
                    value={minScore}
                    onChange={(e) => setMinScore(Number(e.target.value))}
                    className="border border-gray-200 rounded-lg px-2.5 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
                  >
                    <option value={0}>All scores</option>
                    <option value={40}>40%+</option>
                    <option value={60}>60%+</option>
                    <option value={80}>80%+</option>
                  </select>

                  {/* Clear filters */}
                  {hasFilters && (
                    <button
                      onClick={() => {
                        setSearch("");
                        setSourceFilter("");
                        setMinScore(0);
                      }}
                      className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 transition-colors"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" /> Clear
                    </button>
                  )}

                  {/* Export CSV */}
                  <button
                    onClick={exportCsv}
                    disabled={visible.length === 0}
                    className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 bg-white rounded-lg px-3 py-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                    title="Export visible jobs to CSV"
                  >
                    <Download className="w-3.5 h-3.5" /> Export CSV
                  </button>
                </>
              )}
            </div>

            {/* ── Tab content ── */}
            {view === "results" ? (
              jobs.length === 0 ? null : visible.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400">
                  No jobs match your filters.{" "}
                  <button
                    onClick={() => {
                      setSearch("");
                      setSourceFilter("");
                      setMinScore(0);
                    }}
                    className="text-blue-500 hover:underline ml-1"
                  >
                    Clear filters
                  </button>
                </div>
              ) : (
                <div className="grid gap-4">
                  {visible.map((job, i) => (
                    <JobCard
                      key={job.id}
                      job={job}
                      rank={i + 1}
                      isSaved={isSaved(job.id)}
                      onSave={() => saveJob(job)}
                      onUnsave={() => removeJob(job.id)}
                      onCoverLetter={profile ? () => setCoverLetterJob(job) : undefined}
                    />
                  ))}
                </div>
              )
            ) : (
              <SavedJobsTab
                saved={saved}
                updateStatus={updateStatus}
                removeJob={removeJob}
              />
            )}
          </section>
        )}

        {/* ── Empty state (no results) ── */}
        {status.stage === "done" && jobs.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-14 text-center space-y-3">
            <p className="text-4xl">🔍</p>
            <p className="font-semibold text-gray-700">No live jobs found</p>
            <p className="text-sm text-gray-400 max-w-sm mx-auto">
              Remotive, Arbeitnow, and The Muse are free — no API keys needed. For more results,
              add{" "}
              <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">ADZUNA_*</code> or{" "}
              <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">RAPIDAPI_KEY</code> in{" "}
              <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">.env.local</code>.
            </p>
          </div>
        )}
      </main>

      <footer className="text-center py-10 text-xs text-gray-400">
        AI Job Matcher · Built with Claude by Anthropic · Job data via Adzuna, JSearch, Remotive,
        Arbeitnow &amp; The Muse
      </footer>

      {/* ── Cover letter modal ── */}
      {coverLetterJob && profile && (
        <CoverLetterModal
          profile={profile}
          job={coverLetterJob}
          onClose={() => setCoverLetterJob(null)}
        />
      )}
    </div>
  );
}
