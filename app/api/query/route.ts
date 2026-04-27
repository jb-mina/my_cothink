import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { modelId, question, history } = await req.json();

  if (!process.env.OPENROUTER_API_KEY) {
    return NextResponse.json({ error: "OPENROUTER_API_KEY not configured" }, { status: 500 });
  }

  const messages: { role: "user" | "assistant"; content: string }[] = [];
  for (const h of Array.isArray(history) ? history : []) {
    if (typeof h?.question === "string" && typeof h?.answer === "string") {
      messages.push({ role: "user", content: h.question });
      messages.push({ role: "assistant", content: h.answer });
    }
  }
  messages.push({ role: "user", content: question });

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://getcothink.com",
        "X-Title": "coThink",
      },
      body: JSON.stringify({
        model: modelId,
        messages,
        max_tokens: 4000,
      }),
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      const msg = data.error?.message || data.error || `HTTP ${res.status}`;
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const content = data.choices?.[0]?.message?.content || "(빈 응답)";
    const truncated = data.choices?.[0]?.finish_reason === "length";
    return NextResponse.json({ content, truncated });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
