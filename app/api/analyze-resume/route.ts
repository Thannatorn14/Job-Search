import { NextRequest, NextResponse } from "next/server";
import { analyzeResume } from "@/lib/claude";

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

export async function POST(req: NextRequest) {
  try {
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

      if (file.name.toLowerCase().endsWith(".pdf")) {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const pdfParse = require("pdf-parse");
        const result = await pdfParse(buf);
        resumeText = result.text;
      } else {
        resumeText = buf.toString("utf-8");
      }
    } else if (text) {
      resumeText = text;
    }

    if (!resumeText.trim()) {
      return NextResponse.json({ error: "No resume content provided." }, { status: 400 });
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
