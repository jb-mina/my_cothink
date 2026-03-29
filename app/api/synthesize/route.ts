import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export async function POST(req: NextRequest) {
  const { question, modelResponses } = await req.json();

  const formatted = (modelResponses as { name: string; content: string }[])
    .map((r) => `[${r.name}]\n${r.content}`)
    .join("\n\n---\n\n");

  const modelNames = (modelResponses as { name: string }[]).map((r) => r.name).join(", ");

  const prompt = `You are a synthesis mediator. Multiple AI models answered the same question. Analyze their responses.

Question: "${question}"

Model Responses:
${formatted}

Respond with ONLY valid JSON (no markdown, no backticks):
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

For attributions, use these exact model names where relevant: ${modelNames}
Only include models whose response meaningfully contributed to the bestAnswer. Omit models with errors or minimal contribution.`;

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1200,
      messages: [{ role: "user", content: prompt }],
    });

    const text = (message.content[0] as { text: string }).text;
    const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
    return NextResponse.json(parsed);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
