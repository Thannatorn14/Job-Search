"use client";

import { useEffect, useState } from "react";
import { X, Copy, Check, Download, FileText } from "lucide-react";
import { ResumeProfile, JobListing } from "@/lib/types";

interface Props {
  profile: ResumeProfile;
  job: JobListing;
  onClose: () => void;
}

export default function CoverLetterModal({ profile, job, onClose }: Props) {
  const [letter, setLetter] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/cover-letter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile, job }),
    })
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(data.error ?? "Generation failed.");
        setLetter(data.coverLetter);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [profile, job]);

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  function copy() {
    if (!letter) return;
    navigator.clipboard.writeText(letter).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function download() {
    if (!letter) return;
    const blob = new Blob([letter], { type: "text/plain;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cover-letter-${job.company.replace(/\s+/g, "-").toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[88vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100 gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-500 shrink-0" />
              <h2 className="font-semibold text-gray-900">Cover Letter</h2>
            </div>
            <p className="text-xs text-gray-400 mt-0.5 truncate">
              {job.title} at {job.company}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {letter && (
              <>
                <button
                  onClick={copy}
                  className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg px-3 py-1.5 transition-colors"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  {copied ? "Copied!" : "Copy"}
                </button>
                <button
                  onClick={download}
                  className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg px-3 py-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> Download
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-52 gap-4">
              <span className="w-9 h-9 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
              <p className="text-sm text-gray-500">
                Writing your cover letter for {job.company}…
              </p>
            </div>
          ) : error ? (
            <div className="text-center py-12 space-y-2">
              <p className="font-medium text-red-600">Failed to generate cover letter</p>
              <p className="text-sm text-red-400">{error}</p>
              <button
                onClick={onClose}
                className="mt-4 text-sm text-gray-500 hover:text-gray-700 underline"
              >
                Close
              </button>
            </div>
          ) : (
            <pre className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap font-sans">
              {letter}
            </pre>
          )}
        </div>

        {/* Footer hint */}
        {letter && (
          <div className="px-6 py-3 border-t border-gray-100 text-xs text-gray-400 text-center">
            AI-generated — review and personalise before sending.
          </div>
        )}
      </div>
    </div>
  );
}
