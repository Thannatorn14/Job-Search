"use client";

import { useCallback, useRef, useState } from "react";
import { FileText, Upload, X, Sparkles } from "lucide-react";

interface Props {
  onSubmit: (text: string, file?: File) => void;
  loading: boolean;
}

const MAX_FILE_MB = 10;
const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;

export default function ResumeInput({ onSubmit, loading }: Props) {
  const [tab, setTab] = useState<"upload" | "paste">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [dragging, setDragging] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const accept = useCallback((f: File) => {
    setFileError(null);
    if (f.size > MAX_FILE_BYTES) {
      setFileError(`File is too large (${(f.size / 1024 / 1024).toFixed(1)} MB). Max is ${MAX_FILE_MB} MB.`);
      return;
    }
    if (f.name.endsWith(".pdf") || f.type === "application/pdf") {
      setFile(f);
      setTab("upload");
    } else if (f.name.endsWith(".txt") || f.type === "text/plain") {
      const reader = new FileReader();
      reader.onload = (e) => {
        setText(e.target?.result as string);
        setTab("paste");
      };
      reader.readAsText(f);
    } else {
      setFileError("Unsupported file type. Please upload a PDF or TXT file.");
    }
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const f = e.dataTransfer.files[0];
      if (f) accept(f);
    },
    [accept]
  );

  const canSubmit =
    !loading &&
    ((tab === "upload" && file !== null) || (tab === "paste" && text.trim().length > 50));

  const handleSubmit = () => {
    if (tab === "upload" && file) onSubmit("", file);
    else if (tab === "paste" && text.trim()) onSubmit(text);
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-5">
      {/* Tabs */}
      <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
        {(["upload", "paste"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
              tab === t
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t === "upload" ? <Upload className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
            {t === "upload" ? "Upload PDF" : "Paste Text"}
          </button>
        ))}
      </div>

      {/* Upload zone */}
      {tab === "upload" && (
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`border-2 border-dashed rounded-2xl p-14 text-center cursor-pointer transition-all ${
            dragging
              ? "border-blue-500 bg-blue-50"
              : file
              ? "border-emerald-400 bg-emerald-50"
              : "border-gray-300 hover:border-blue-400 hover:bg-gray-50"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.txt"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) accept(f); }}
          />
          {file ? (
            <div className="flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
                <FileText className="w-7 h-7 text-emerald-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-800">{file.name}</p>
                <p className="text-sm text-gray-400">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                  setFileError(null);
                  if (inputRef.current) inputRef.current.value = "";
                }}
                className="flex items-center gap-1 text-sm text-red-500 hover:text-red-700"
              >
                <X className="w-3.5 h-3.5" /> Remove
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center">
                <Upload className="w-7 h-7 text-blue-500" />
              </div>
              <div>
                <p className="font-semibold text-gray-700">Drop your resume here or click to browse</p>
                <p className="text-sm text-gray-400 mt-1">PDF or TXT · Max 10 MB</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* File error */}
      {fileError && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2">
          {fileError}
        </p>
      )}

      {/* Paste zone */}
      {tab === "paste" && (
        <div className="relative">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={12}
            placeholder={`Paste your resume here…\n\nInclude:\n• Work experience (titles, companies, dates)\n• Skills (technical & soft)\n• Education & certifications\n• Key achievements`}
            className="w-full p-4 border-2 border-gray-200 rounded-2xl resize-none text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:border-blue-400 transition-colors"
          />
          <span className="absolute bottom-3 right-3 text-xs text-gray-400">
            {text.length} chars
          </span>
        </div>
      )}

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={!canSubmit}
        className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl transition-colors"
      >
        {loading ? (
          <>
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Working…
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" />
            Find Matching Jobs
          </>
        )}
      </button>
    </div>
  );
}
