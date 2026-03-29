import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropicClient = new Anthropic();

function buildPrompt(question: string, formatted: string, modelNames: string): string {
  return `You are a synthesis mediator. Multiple AI models answered the same question. Analyze their responses and synthesize the best answer.

Question: "${question}"

Model Responses:
${formatted}

Respond with ONLY valid JSON (no markdown, no backticks, no extra text):
{
  "agreement": "What the models broadly agree on (2-3 sentences in Korean)",
  "uniqueInsights": "Unique perspectives only 1-2 models provided (2-3 sentences in Korean)",
  "contradictions": "Where models disagreed or gave conflicting info. Write '없음' if none. (Korean)",
  "bestAnswer": "The strongest synthesized answer integrating the best from all responses (3-5 sentences in Korean)",
  "attributions": {
    "[Model Name]": "이 모델이 종합 답변에 기여한 핵심 내용 (1줄, Korean)"
  },
  "followUps": ["후속 질문 1 (Korean)", "후속 질문 2 (Korean)", "후속 질문 3 (Korean)"]
}

For attributions, only include models whose response meaningfully contributed. Use exact model names from: ${modelNames}`;
}

export async function POST(req: NextRequest) {
  const { question, modelResponses, mediatorId = "anthropic" } = await req.json();

  const formatted = (modelResponses as { name: string; content: string }[])
    .map((r) => `[${r.name}]\n${r.content}`)
    .join("\n\n---\n\n");

  const modelNames = (modelResponses as { name: string }[]).map((r) => r.name).join(", ");
  const prompt = buildPrompt(question, formatted, modelNames);

  try {
    let text = "";

    if (mediatorId === "anthropic") {
      // Use Anthropic SDK directly
      const message = await anthropicClient.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1200,
        messages: [{ role: "user", content: prompt }],
      });
      text = (message.content[0] as { text: string }).text;
    } else {
      // Use OpenRouter for any other model
      if (!process.env.OPENROUTER_API_KEY) {
        return NextResponse.json({ error: "OPENROUTER_API_KEY not configured" }, { status: 500 });
      }
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://cothink.vercel.app",
          "X-Title": "coThink",
        },
        body: JSON.stringify({
          model: mediatorId,
          messages: [{ role: "user", content: prompt }],
          max_tokens: 1200,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error?.message || `HTTP ${res.status}`);
      text = data.choices?.[0]?.message?.content || "{}";
    }

    const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
    return NextResponse.json(parsed);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
