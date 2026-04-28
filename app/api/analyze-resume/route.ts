import { NextRequest, NextResponse } from "next/server";
import { analyzeResume } from "@/lib/claude";
import { assertLlm } from "@/lib/config";

// Allow up to 60 s on Vercel Pro / AWS Lambda
export const maxDuration = 60;

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

// PDF magic bytes: %PDF
const PDF_MAGIC = Buffer.from([0x25, 0x50, 0x44, 0x46]);

function isPdf(buf: Buffer): boolean {
  return buf.length >= 4 && buf.slice(0, 4).equals(PDF_MAGIC);
}

export async function POST(req: NextRequest) {
  try {
    assertLlm();

    const form = await req.formData();
    const file = form.get("file") as File | null;
    const text = form.get("text") as string | null;

    let resumeText = "";

    if (file && file.size > 0) {
      if (file.size > MAX_FILE_BYTES) {
        return NextResponse.json(
          { error: "File too large. Please upload a file under 10 MB." },
          { status: 413 }
        );
      }

      const buf = Buffer.from(await file.arrayBuffer());
      const ext = file.name.toLowerCase();

      if (ext.endsWith(".pdf")) {
        // Validate actual PDF magic bytes, not just the extension
        if (!isPdf(buf)) {
          return NextResponse.json(
            { error: "File does not appear to be a valid PDF." },
            { status: 400 }
          );
        }
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const pdfParse = require("pdf-parse");
        const result = await pdfParse(buf);
        resumeText = result.text;
      } else if (ext.endsWith(".txt")) {
        resumeText = buf.toString("utf-8");
      } else {
        return NextResponse.json(
          { error: "Unsupported file type. Please upload a PDF or TXT file." },
          { status: 415 }
        );
      }
    } else if (text) {
      resumeText = text;
    }

    if (!resumeText.trim()) {
      return NextResponse.json(
        { error: "No resume content provided." },
        { status: 400 }
      );
    }

    if (resumeText.trim().length < 50) {
      return NextResponse.json(
        { error: "Resume text is too short. Please provide more detail." },
        { status: 400 }
      );
    }

    const profile = await analyzeResume(resumeText);
    return NextResponse.json({ profile });
  } catch (err) {
    console.error("[analyze-resume]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to analyze resume." },
      { status: 500 }
    );
  }
}
