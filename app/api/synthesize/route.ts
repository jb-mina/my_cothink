import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

interface ModelResponse {
  name: string;
  content: string;
}

function buildPrompt(question: string, formatted: string, modelNames: string): string {
  return `You are a synthesis mediator. Multiple AI models answered the same question. Analyze their responses and produce a synthesis.

Question: "${question}"

Model Responses:
${formatted}

Respond with ONLY valid JSON (no markdown, no backticks, no extra text whatsoever):
{
  "agreement": "What the models broadly agree on (2-3 sentences in Korean)",
  "uniqueInsights": "Unique perspectives only 1-2 models provided (2-3 sentences in Korean)",
  "contradictions": "Where models disagreed. Write '없음' if none. (Korean)",
  "bestAnswer": "The strongest synthesized answer integrating the best from all responses (3-5 sentences in Korean)",
  "attributions": {
    "Model Name": "이 모델이 종합 답변에 기여한 핵심 내용 1줄 (Korean)"
  },
  "followUps": ["후속 질문 1 (Korean)", "후속 질문 2 (Korean)", "후속 질문 3 (Korean)"]
}

For attributions, only include models that meaningfully contributed. Available model names: ${modelNames}`;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json() as {
      question: string;
      modelResponses: ModelResponse[];
      mediatorId?: string;
    };

    const { question, modelResponses, mediatorId = "anthropic" } = body;

    const formatted = modelResponses
      .map((r) => `[${r.name}]\n${r.content}`)
      .join("\n\n---\n\n");

    const modelNames = modelResponses.map((r) => r.name).join(", ");
    const prompt = buildPrompt(question, formatted, modelNames);

    let text = "";

    if (mediatorId === "anthropic") {
      const message = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1200,
        messages: [{ role: "user", content: prompt }],
      });
      const block = message.content[0];
      text = block.type === "text" ? block.text : "{}";
    } else {
      const apiKey = process.env.OPENROUTER_API_KEY;
      if (!apiKey) {
        return NextResponse.json({ error: "OPENROUTER_API_KEY not configured" }, { status: 500 });
      }
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
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
      const data = await res.json() as {
        choices?: { message?: { content?: string } }[];
        error?: { message?: string };
      };
      if (!res.ok || data.error) {
        throw new Error(data.error?.message ?? `HTTP ${res.status}`);
      }
      text = data.choices?.[0]?.message?.content ?? "{}";
    }

    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean) as Record<string, unknown>;
    return NextResponse.json(parsed);

  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
