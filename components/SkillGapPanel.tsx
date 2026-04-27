"use client";

import { TrendingUp } from "lucide-react";
import { MatchedJob } from "@/lib/types";

export default function SkillGapPanel({ jobs }: { jobs: MatchedJob[] }) {
  const counts: Record<string, number> = {};
  for (const job of jobs) {
    for (const skill of job.missingSkills ?? []) {
      const key = skill.trim();
      if (key) counts[key] = (counts[key] ?? 0) + 1;
    }
  }

  const top = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  if (top.length === 0) return null;

  const max = top[0][1];

  return (
    <div className="bg-white rounded-2xl border border-amber-200 p-5 space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <TrendingUp className="w-4 h-4 text-amber-500 shrink-0" />
        <h3 className="font-semibold text-gray-800">Top Skill Gaps</h3>
        <span className="text-xs text-gray-400 ml-auto">
          across {jobs.length} matched job{jobs.length !== 1 ? "s" : ""}
        </span>
      </div>
      <p className="text-xs text-gray-500 -mt-1">
        Skills that appear most in job requirements you're missing — learn these to boost your
        match score.
      </p>
      <div className="space-y-2.5">
        {top.map(([skill, count]) => (
          <div key={skill} className="flex items-center gap-3">
            <span className="text-sm text-gray-700 w-36 truncate shrink-0">{skill}</span>
            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-400 rounded-full transition-all duration-500"
                style={{ width: `${(count / max) * 100}%` }}
              />
            </div>
            <span className="text-xs text-gray-400 w-14 text-right shrink-0">
              {count}/{jobs.length} jobs
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
