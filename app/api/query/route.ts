import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { modelId, question } = await req.json();

  if (!process.env.OPENROUTER_API_KEY) {
    return NextResponse.json({ error: "OPENROUTER_API_KEY not configured" }, { status: 500 });
  }

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://cothink.vercel.app",
        "X-Title": "coThink",
      },
      body: JSON.stringify({
        model: modelId,
        messages: [{ role: "user", content: question }],
        max_tokens: 800,
      }),
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      const msg = data.error?.message || data.error || `HTTP ${res.status}`;
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const content = data.choices?.[0]?.message?.content || "(빈 응답)";
    return NextResponse.json({ content });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
