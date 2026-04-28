import { NextResponse } from "next/server";
import { config } from "@/lib/config";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    llm: config.useOllama ? "ollama" : config.anthropicApiKey ? "claude" : "none",
    jobSources: {
      adzuna: config.hasAdzuna,
      jsearch: config.hasJSearch,
      remotive: true,
      arbeitnow: true,
      themuse: true,
    },
  });
}
