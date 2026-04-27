"use client";

import { Bookmark, ExternalLink, Trash2 } from "lucide-react";
import { ApplicationStatus, SavedJob } from "@/hooks/useSavedJobs";

const STATUS_OPTIONS: { value: ApplicationStatus; label: string; bg: string }[] = [
  { value: "saved", label: "Saved", bg: "bg-gray-100 text-gray-600" },
  { value: "applied", label: "Applied", bg: "bg-blue-100 text-blue-700" },
  { value: "interviewing", label: "Interviewing", bg: "bg-violet-100 text-violet-700" },
  { value: "offered", label: "Offered ✓", bg: "bg-emerald-100 text-emerald-700" },
  { value: "rejected", label: "Rejected", bg: "bg-red-100 text-red-600" },
];

interface Props {
  saved: Record<string, SavedJob>;
  updateStatus: (id: string, status: ApplicationStatus) => void;
  removeJob: (id: string) => void;
}

export default function SavedJobsTab({ saved, updateStatus, removeJob }: Props) {
  const entries = Object.values(saved).sort(
    (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
  );

  if (entries.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-14 text-center space-y-3">
        <p className="text-4xl">🔖</p>
        <p className="font-semibold text-gray-700">No saved jobs yet</p>
        <p className="text-sm text-gray-400 max-w-xs mx-auto">
          Click the bookmark icon on any job card to save it here and track your applications.
        </p>
      </div>
    );
  }

  // Summary counts
  const counts = entries.reduce<Record<ApplicationStatus, number>>(
    (acc, { status }) => ({ ...acc, [status]: (acc[status] ?? 0) + 1 }),
    {} as Record<ApplicationStatus, number>
  );

  return (
    <div className="space-y-4">
      {/* Status summary */}
      <div className="flex flex-wrap gap-2">
        {STATUS_OPTIONS.filter((o) => counts[o.value]).map((o) => (
          <span key={o.value} className={`text-xs font-medium px-3 py-1 rounded-full ${o.bg}`}>
            {o.label}: {counts[o.value]}
          </span>
        ))}
      </div>

      <div className="grid gap-3">
        {entries.map(({ job, status }) => {
          const statusOpt = STATUS_OPTIONS.find((s) => s.value === status) ?? STATUS_OPTIONS[0];
          return (
            <div
              key={job.id}
              className="bg-white rounded-2xl border border-gray-200 p-4 flex flex-wrap sm:flex-nowrap items-center gap-3"
            >
              <Bookmark className="w-4 h-4 text-blue-500 shrink-0" fill="currentColor" />

              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate text-sm">{job.title}</p>
                <p className="text-xs text-gray-500 truncate">
                  {job.company}
                  {job.location ? ` · ${job.location}` : ""}
                </p>
              </div>

              <span className="text-sm font-bold text-blue-600 shrink-0">{job.matchScore}%</span>

              <select
                value={status}
                onChange={(e) => updateStatus(job.id, e.target.value as ApplicationStatus)}
                className={`text-xs font-medium px-2.5 py-1.5 rounded-lg border-0 outline-none cursor-pointer appearance-none ${statusOpt.bg}`}
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              {job.applyUrl && (
                <a
                  href={job.applyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-600 transition-colors shrink-0"
                  title="Open application"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}

              <button
                onClick={() => removeJob(job.id)}
                className="text-gray-300 hover:text-red-400 transition-colors shrink-0"
                title="Remove"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
