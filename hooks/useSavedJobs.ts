import { useState, useEffect } from "react";
import { MatchedJob } from "@/lib/types";

export type ApplicationStatus =
  | "saved"
  | "applied"
  | "interviewing"
  | "offered"
  | "rejected";

export interface SavedJob {
  job: MatchedJob;
  status: ApplicationStatus;
  savedAt: string;
}

const STORAGE_KEY = "ai-job-matcher-saved";

export function useSavedJobs() {
  const [saved, setSaved] = useState<Record<string, SavedJob>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setSaved(JSON.parse(raw));
    } catch {}
  }, []);

  function persist(next: Record<string, SavedJob>) {
    setSaved(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {}
  }

  function saveJob(job: MatchedJob) {
    persist({
      ...saved,
      [job.id]: { job, status: "saved", savedAt: new Date().toISOString() },
    });
  }

  function removeJob(id: string) {
    const next = { ...saved };
    delete next[id];
    persist(next);
  }

  function updateStatus(id: string, status: ApplicationStatus) {
    if (!saved[id]) return;
    persist({ ...saved, [id]: { ...saved[id], status } });
  }

  function isSaved(id: string) {
    return !!saved[id];
  }

  return { saved, saveJob, removeJob, updateStatus, isSaved };
}
