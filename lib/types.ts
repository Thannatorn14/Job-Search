export interface ResumeProfile {
  name?: string;
  email?: string;
  summary: string;
  skills: string[];
  jobTitles: string[];
  experienceLevel: "entry" | "mid" | "senior" | "executive";
  yearsOfExperience: number;
  education: string[];
  industries: string[];
  searchQueries: string[];
}

export interface JobListing {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  salary?: string;
  jobType?: string;
  postedAt?: string;
  applyUrl: string;
  source: string;
}

export interface MatchedJob extends JobListing {
  matchScore: number;
  matchReason: string;
  matchingSkills: string[];
  missingSkills: string[];
}

export type SearchStage = "idle" | "analyzing" | "searching" | "matching" | "done" | "error";

export interface SearchStatus {
  stage: SearchStage;
  message: string;
  progress: number;
}

export interface CritiqueSection {
  name: string;
  score: number;
  status: "strong" | "good" | "needs-work" | "missing";
  issues: string[];
  suggestions: string[];
}

export interface ResumeCritique {
  overallScore: number;
  grade: string;
  headline: string;
  sections: CritiqueSection[];
  quickWins: string[];
  marketAlignment: string;
}
