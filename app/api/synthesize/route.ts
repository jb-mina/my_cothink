import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export async function POST(req: NextRequest) {
  const { question, modelResponses } = await req.json();

  const formatted = (modelResponses as { name: string; content: string }[])
    .map((r) => `[${r.name}]\n${r.content}`)
    .join("\n\n---\n\n");

  const prompt = `You are a synthesis mediator. Multiple AI models answered the same question. Analyze their responses concisely.

Question: "${question}"

Model Responses:
${formatted}

Respond with ONLY valid JSON, no markdown, no backticks:
{
  "agreement": "What the models broadly agree on (2-3 sentences)",
  "uniqueInsights": "Unique perspectives only 1-2 models provided (2-3 sentences)",
  "contradictions": "Where models disagreed or gave conflicting info. Write '없음' if none.",
  "bestAnswer": "The strongest synthesized answer integrating the best from all responses (3-5 sentences)",
  "followUps": ["follow-up question 1 in Korean", "follow-up question 2 in Korean", "follow-up question 3 in Korean"]
}`;

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
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
