"use client";

import { useState } from "react";
import {
  Building2,
  MapPin,
  DollarSign,
  Clock,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  Bookmark,
  Copy,
  Check,
} from "lucide-react";
import { MatchedJob } from "@/lib/types";

function ScorePill({ score }: { score: number }) {
  const [bg, text, border] =
    score >= 80
      ? ["bg-emerald-50", "text-emerald-700", "border-emerald-200"]
      : score >= 60
      ? ["bg-blue-50", "text-blue-700", "border-blue-200"]
      : score >= 40
      ? ["bg-amber-50", "text-amber-700", "border-amber-200"]
      : ["bg-red-50", "text-red-600", "border-red-200"];

  const label =
    score >= 80 ? "Excellent" : score >= 60 ? "Good" : score >= 40 ? "Fair" : "Low";

  return (
    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border ${bg} ${border}`}>
      <span className={`font-bold text-base ${text}`}>{score}%</span>
      <span className={`text-xs ${text} opacity-80`}>{label} match</span>
    </div>
  );
}

function Bar({ score }: { score: number }) {
  const color =
    score >= 80
      ? "bg-emerald-500"
      : score >= 60
      ? "bg-blue-500"
      : score >= 40
      ? "bg-amber-400"
      : "bg-red-400";
  return (
    <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
    </div>
  );
}

interface Props {
  job: MatchedJob;
  rank: number;
  isSaved?: boolean;
  onSave?: () => void;
  onUnsave?: () => void;
}

export default function JobCard({ job, rank, isSaved = false, onSave, onUnsave }: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const rawDate = job.postedAt ? new Date(job.postedAt) : null;
  const date =
    rawDate && !isNaN(rawDate.getTime())
      ? rawDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })
      : null;

  function copyUrl() {
    if (!job.applyUrl) return;
    navigator.clipboard.writeText(job.applyUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      <div className="p-5 space-y-3">
        {/* Title row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            {/* Rank badge */}
            <div className="w-9 h-9 shrink-0 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold">
              {rank}
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-gray-900 leading-snug truncate">{job.title}</h3>
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5" /> {job.company}
                </span>
                {job.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" /> {job.location}
                  </span>
                )}
                {job.salary && (
                  <span className="flex items-center gap-1 text-emerald-600 font-medium">
                    <DollarSign className="w-3.5 h-3.5" /> {job.salary}
                  </span>
                )}
                {date && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> {date}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Bookmark toggle */}
            <button
              onClick={() => (isSaved ? onUnsave?.() : onSave?.())}
              title={isSaved ? "Remove bookmark" : "Save job"}
              className={`p-1.5 rounded-lg transition-colors ${
                isSaved
                  ? "text-blue-600 bg-blue-50 hover:bg-blue-100"
                  : "text-gray-300 hover:text-gray-500 hover:bg-gray-100"
              }`}
            >
              <Bookmark className="w-4 h-4" fill={isSaved ? "currentColor" : "none"} />
            </button>
            <ScorePill score={job.matchScore} />
          </div>
        </div>

        {/* Score bar */}
        <Bar score={job.matchScore} />

        {/* Match reason */}
        <p className="text-sm text-gray-600 leading-relaxed">{job.matchReason}</p>

        {/* Skill chips */}
        {((job.matchingSkills ?? []).length > 0 || (job.missingSkills ?? []).length > 0) && (
          <div className="flex flex-wrap gap-1.5">
            {(job.matchingSkills ?? []).slice(0, 5).map((s) => (
              <span
                key={s}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs rounded-full"
              >
                <CheckCircle2 className="w-3 h-3" /> {s}
              </span>
            ))}
            {(job.missingSkills ?? []).slice(0, 3).map((s) => (
              <span
                key={s}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 text-red-600 text-xs rounded-full"
              >
                <XCircle className="w-3 h-3" /> {s}
              </span>
            ))}
          </div>
        )}

        {/* Toggle description */}
        {job.description && (
          <button
            onClick={() => setOpen(!open)}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            {open ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
            {open ? "Hide" : "Show"} description
          </button>
        )}

        {open && (
          <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line border-t border-gray-100 pt-3">
            {job.description.slice(0, 900)}
            {job.description.length > 900 ? "…" : ""}
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
        <span className="text-xs text-gray-400">via {job.source}</span>
        <div className="flex items-center gap-3">
          {job.applyUrl && (
            <button
              onClick={copyUrl}
              title="Copy apply link"
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          )}
          {job.applyUrl && (
            <a
              href={job.applyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
            >
              Apply Now <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
