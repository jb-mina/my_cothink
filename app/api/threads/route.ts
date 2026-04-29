import { NextResponse } from "next/server";
import { getCurrentCode } from "../../../lib/auth";
import { listThreads } from "../../../lib/threads";

export async function GET() {
  const code = getCurrentCode();
  if (!code) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const threads = await listThreads(code);
    return NextResponse.json(threads);
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "unknown" },
      { status: 500 }
    );
  }
}
