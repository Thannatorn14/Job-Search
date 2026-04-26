"use client";

import { Briefcase, GraduationCap, Building2, Code2, User } from "lucide-react";
import { ResumeProfile } from "@/lib/types";

const levelStyle: Record<string, string> = {
  entry: "bg-green-100 text-green-700",
  mid: "bg-blue-100 text-blue-700",
  senior: "bg-violet-100 text-violet-700",
  executive: "bg-orange-100 text-orange-700",
};

export default function ProfileCard({ profile }: { profile: ResumeProfile }) {
  const skills = profile.skills ?? [];
  const education = profile.education ?? [];
  const industries = profile.industries ?? [];
  const levelClass = levelStyle[profile.experienceLevel] ?? "bg-gray-100 text-gray-700";
  const levelLabel = profile.experienceLevel
    ? profile.experienceLevel.charAt(0).toUpperCase() + profile.experienceLevel.slice(1)
    : "Unknown";
  const years = profile.yearsOfExperience ?? 0;

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <User className="w-4 h-4 text-blue-500 shrink-0" />
        <h3 className="font-semibold text-gray-800">Resume Analysis</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Left */}
        <div className="space-y-3 text-sm">
          {profile.name && (
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-400">Name</p>
              <p className="font-medium text-gray-900 mt-0.5">{profile.name}</p>
            </div>
          )}

          <div className="flex gap-2">
            <Briefcase className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-400">Experience</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${levelClass}`}>
                  {levelLabel}-level
                </span>
                <span className="text-gray-600">
                  {years} yr{years !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
          </div>

          {education.length > 0 && (
            <div className="flex gap-2">
              <GraduationCap className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-400">Education</p>
                <p className="text-gray-700 mt-0.5">{education.slice(0, 2).join(", ")}</p>
              </div>
            </div>
          )}

          {industries.length > 0 && (
            <div className="flex gap-2">
              <Building2 className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-400">Industries</p>
                <p className="text-gray-700 mt-0.5">{industries.join(", ")}</p>
              </div>
            </div>
          )}
        </div>

        {/* Right – skills */}
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Code2 className="w-4 h-4 text-gray-400" />
            <p className="text-xs uppercase tracking-wide text-gray-400">Top Skills</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {skills.slice(0, 14).map((s) => (
              <span
                key={s}
                className="px-2 py-0.5 bg-white border border-gray-200 text-gray-700 text-xs rounded-full"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Summary */}
      {profile.summary && (
        <div className="pt-3 border-t border-blue-100">
          <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">AI Summary</p>
          <p className="text-sm text-gray-700 leading-relaxed">{profile.summary}</p>
        </div>
      )}
    </div>
  );
}
