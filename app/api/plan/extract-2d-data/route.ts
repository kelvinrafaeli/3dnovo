import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3001";

// Increase max duration for this route (Gemini extraction can take 2+ minutes)
export const maxDuration = 300; // 5 minutes (Vercel/serverless)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const response = await fetch(`${BACKEND_URL}/api/plan/extract-2d-data`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(300000), // 5 minute timeout
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Proxy error";
    console.error("[api/plan/extract-2d-data] Proxy error:", message);
    return NextResponse.json(
      { error: `Proxy error: ${message}` },
      { status: 502 }
    );
  }
}
