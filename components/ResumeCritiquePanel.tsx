"use client";

import { useState } from "react";
import {
  ClipboardCheck,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle2,
  Zap,
  Lightbulb,
  RefreshCw,
} from "lucide-react";
import { ResumeProfile, MatchedJob, ResumeCritique, CritiqueSection } from "@/lib/types";

// ── Helpers ────────────────────────────────────────────────────────────────────

function gradeStyle(grade: string) {
  if (grade.startsWith("A")) return "text-emerald-700 bg-emerald-50 border-emerald-200";
  if (grade.startsWith("B")) return "text-blue-700 bg-blue-50 border-blue-200";
  if (grade.startsWith("C")) return "text-amber-700 bg-amber-50 border-amber-200";
  return "text-red-700 bg-red-50 border-red-200";
}

function scoreBar(score: number) {
  if (score >= 80) return "bg-emerald-500";
  if (score >= 60) return "bg-blue-500";
  if (score >= 40) return "bg-amber-400";
  return "bg-red-400";
}

const STATUS_LABEL: Record<CritiqueSection["status"], string> = {
  strong: "Strong",
  good: "Good",
  "needs-work": "Needs Work",
  missing: "Missing",
};

const STATUS_COLOR: Record<CritiqueSection["status"], string> = {
  strong: "text-emerald-600",
  good: "text-blue-600",
  "needs-work": "text-amber-600",
  missing: "text-red-600",
};

// ── Component ──────────────────────────────────────────────────────────────────

interface Props {
  profile: ResumeProfile;
  jobs: MatchedJob[];
}

export default function ResumeCritiquePanel({ profile, jobs }: Props) {
  const [critique, setCritique] = useState<ResumeCritique | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/critique-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile, jobs: jobs.slice(0, 12) }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.error ?? "Critique failed.");
      setCritique(data.critique);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-violet-200 p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="w-4 h-4 text-violet-500 shrink-0" />
          <h3 className="font-semibold text-gray-800">Resume Critique</h3>
          {jobs.length > 0 && (
            <span className="text-xs text-gray-400">
              · tailored to {jobs.length} matched jobs
            </span>
          )}
        </div>
        <button
          onClick={run}
          disabled={loading}
          className="flex items-center gap-1.5 text-sm font-medium bg-violet-600 hover:bg-violet-700 disabled:bg-violet-300 text-white px-4 py-2 rounded-lg transition-colors shrink-0"
        >
          {loading ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Analyzing…
            </>
          ) : critique ? (
            <>
              <RefreshCw className="w-3.5 h-3.5" /> Re-analyze
            </>
          ) : (
            <>
              <Zap className="w-3.5 h-3.5" /> Analyze My Resume
            </>
          )}
        </button>
      </div>

      {/* Idle state */}
      {!critique && !loading && !error && (
        <p className="text-sm text-gray-500">
          Get AI feedback on your resume's strengths, weaknesses, and specific improvements
          {jobs.length > 0 ? " tailored to the jobs you matched with" : ""}.
        </p>
      )}

      {/* Error */}
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          {error}
        </p>
      )}

      {/* Results */}
      {critique && (
        <div className="space-y-5">
          {/* Overall score + grade */}
          <div className="flex items-center gap-4">
            <div className="flex-1 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Overall Score</span>
                <span className="text-sm font-bold text-gray-900">
                  {critique.overallScore}/100
                </span>
              </div>
              <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${scoreBar(critique.overallScore)}`}
                  style={{ width: `${critique.overallScore}%` }}
                />
              </div>
            </div>
            <div
              className={`text-2xl font-bold w-14 h-14 flex items-center justify-center rounded-xl border-2 shrink-0 ${gradeStyle(critique.grade)}`}
            >
              {critique.grade}
            </div>
          </div>

          {/* Headline */}
          {critique.headline && (
            <p className="text-sm text-gray-600 italic leading-relaxed border-l-2 border-violet-200 pl-3">
              {critique.headline}
            </p>
          )}

          {/* Sections */}
          <div className="space-y-2">
            {critique.sections.map((section) => {
              const isOpen = expanded === section.name;
              const hasDetail =
                section.issues.length > 0 || section.suggestions.length > 0;

              return (
                <div
                  key={section.name}
                  className="border border-gray-100 rounded-xl overflow-hidden"
                >
                  <button
                    onClick={() =>
                      hasDetail
                        ? setExpanded(isOpen ? null : section.name)
                        : undefined
                    }
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                      hasDetail ? "hover:bg-gray-50 cursor-pointer" : "cursor-default"
                    }`}
                  >
                    <div className="flex-1 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-800">
                          {section.name}
                        </span>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs font-semibold ${STATUS_COLOR[section.status]}`}
                          >
                            {STATUS_LABEL[section.status]}
                          </span>
                          <span className="text-xs text-gray-400">{section.score}%</span>
                        </div>
                      </div>
                      <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${scoreBar(section.score)}`}
                          style={{ width: `${section.score}%` }}
                        />
                      </div>
                    </div>
                    {hasDetail && (
                      <span className="text-gray-400 shrink-0">
                        {isOpen ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </span>
                    )}
                  </button>

                  {isOpen && hasDetail && (
                    <div className="px-4 pb-4 pt-2 space-y-3 bg-gray-50 border-t border-gray-100">
                      {section.issues.length > 0 && (
                        <div className="space-y-1.5">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                            Issues
                          </p>
                          {section.issues.map((issue, i) => (
                            <div
                              key={i}
                              className="flex items-start gap-2 text-sm text-amber-700"
                            >
                              <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-500" />
                              {issue}
                            </div>
                          ))}
                        </div>
                      )}
                      {section.suggestions.length > 0 && (
                        <div className="space-y-1.5">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                            How to fix
                          </p>
                          {section.suggestions.map((sug, i) => (
                            <div
                              key={i}
                              className="flex items-start gap-2 text-sm text-blue-700"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0 text-blue-500" />
                              {sug}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Quick wins */}
          {critique.quickWins.length > 0 && (
            <div className="bg-violet-50 border border-violet-100 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-violet-500" />
                <p className="text-sm font-semibold text-violet-800">Quick Wins</p>
                <span className="text-xs text-violet-400">each takes under 10 min</span>
              </div>
              <ol className="space-y-1.5">
                {critique.quickWins.map((win, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-violet-700">
                    <span className="shrink-0 font-bold text-violet-400">{i + 1}.</span>
                    {win}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Market alignment */}
          {critique.marketAlignment && (
            <p className="text-sm text-gray-600 leading-relaxed pt-1 border-t border-gray-100">
              <span className="font-semibold text-gray-700">Market fit: </span>
              {critique.marketAlignment}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
