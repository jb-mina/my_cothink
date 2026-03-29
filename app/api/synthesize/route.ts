import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

export async function POST(req: NextRequest) {
  try {
    const { question, modelResponses, mediatorId = "anthropic" } = await req.json();

    const formatted = modelResponses
      .map((r: { name: string; content: string }) => `[${r.name}]\n${r.content}`)
      .join("\n\n---\n\n");

    const modelNames = modelResponses.map((r: { name: string }) => r.name).join(", ");

    const prompt = `You are a synthesis mediator. Multiple AI models answered the same question.

Question: "${question}"

Model Responses:
${formatted}

Respond ONLY with valid JSON (no markdown, no backticks):
{
  "agreement": "공통된 관점 2-3문장 (Korean)",
  "uniqueInsights": "고유한 인사이트 2-3문장 (Korean)",
  "contradictions": "모순 및 이견, 없으면 '없음' (Korean)",
  "bestAnswer": "종합 답변 3-5문장 (Korean)",
  "attributions": { "Model Name": "기여 내용 1줄 (Korean)" },
  "followUps": ["후속 질문1", "후속 질문2", "후속 질문3"]
}
Available model names: ${modelNames}. Only include in attributions if meaningfully contributed.`;

    let text = "";

    if (mediatorId === "anthropic") {
      const msg = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1200,
        messages: [{ role: "user", content: prompt }],
      });
      const block = msg.content[0];
      text = block.type === "text" ? block.text : "{}";
    } else {
      const apiKey = process.env.OPENROUTER_API_KEY;
      if (!apiKey) return NextResponse.json({ error: "OPENROUTER_API_KEY missing" }, { status: 500 });
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "HTTP-Referer": "https://cothink.vercel.app", "X-Title": "coThink" },
        body: JSON.stringify({ model: mediatorId, messages: [{ role: "user", content: prompt }], max_tokens: 1200 }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error?.message || `HTTP ${res.status}`);
      text = data.choices?.[0]?.message?.content || "{}";
    }

    const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
    return NextResponse.json(parsed);
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "unknown" }, { status: 500 });
  }
}
