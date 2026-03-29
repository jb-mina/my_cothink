"use client";

import { useState } from "react";
import styles from "./page.module.css";

const MODELS = [
  { id: "openai/gpt-4o", name: "GPT-4o", shortName: "ChatGPT", color: "#10a37f" },
  { id: "google/gemini-3-flash-preview", name: "Gemini 3 Flash", shortName: "Gemini", color: "#4285f4" },
  { id: "anthropic/claude-sonnet-4-6", name: "Claude Sonnet 4.6", shortName: "Claude", color: "#d4954a" },
  { id: "perplexity/sonar-pro", name: "Perplexity Sonar Pro", shortName: "Perplexity", color: "#20b2aa" },
  { id: "x-ai/grok-4.1-fast", name: "Grok 4.1 Fast", shortName: "Grok", color: "#e8562a" },
];

type ResponseState = { status: "loading" | "done" | "error"; content: string };
type SynthesisResult = {
  agreement: string;
  uniqueInsights: string;
  contradictions: string;
  bestAnswer: string;
  followUps: string[];
};

export default function Home() {
  const [question, setQuestion] = useState("");
  const [selectedModels, setSelectedModels] = useState([
    "openai/gpt-4o",
    "google/gemini-3-flash-preview",
    "anthropic/claude-sonnet-4-6",
    "perplexity/sonar-pro",
    "x-ai/grok-4.1-fast",
  ]);
  const [responses, setResponses] = useState<Record<string, ResponseState>>({});
  const [synthesis, setSynthesis] = useState<SynthesisResult | null>(null);
  const [phase, setPhase] = useState<"idle" | "querying" | "synthesizing" | "done">("idle");
  const [error, setError] = useState("");

  const toggleModel = (id: string) =>
    setSelectedModels((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const handleSubmit = async () => {
    if (!question.trim()) { setError("질문을 입력해주세요."); return; }
    if (selectedModels.length < 2) { setError("최소 2개 모델을 선택해주세요."); return; }

    setError(""); setResponses({}); setSynthesis(null); setPhase("querying");

    const init: Record<string, ResponseState> = {};
    selectedModels.forEach((id) => { init[id] = { status: "loading", content: "" }; });
    setResponses(init);

    const modelResults: { id: string; name: string; content: string }[] = [];

    await Promise.allSettled(
      selectedModels.map(async (modelId) => {
        const model = MODELS.find((m) => m.id === modelId)!;
        try {
          const res = await fetch("/api/query", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ modelId, question }),
          });
          const data = await res.json();
          if (data.error) throw new Error(data.error);
          setResponses((prev) => ({ ...prev, [modelId]: { status: "done", content: data.content } }));
          modelResults.push({ id: modelId, name: model.name, content: data.content });
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : "Unknown error";
          setResponses((prev) => ({ ...prev, [modelId]: { status: "error", content: msg } }));
        }
      })
    );

    if (modelResults.length >= 1) {
      setPhase("synthesizing");
      try {
        const res = await fetch("/api/synthesize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question, modelResponses: modelResults }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setSynthesis(data);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        setError("종합 분석 실패: " + msg);
      }
    } else {
      setError("모든 모델 호출 실패 — 각 카드의 에러 메시지를 확인해주세요.");
    }

    setPhase("done");
  };

  const handleFollowUp = (q: string) => {
    setQuestion(q);
    setResponses({});
    setSynthesis(null);
    setPhase("idle");
  };

  const handleReset = () => {
    setQuestion(""); setResponses({}); setSynthesis(null); setPhase("idle"); setError("");
  };

  const isRunning = phase === "querying" || phase === "synthesizing";

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div>
          <div className={styles.logo}>coThink</div>
          <div className={styles.logoTag}>Multi-Model Reasoning Environment</div>
        </div>
        <div className={styles.mediatorTag}>mediator: Claude Sonnet 4</div>
      </header>

      <main className={styles.main}>
        {/* Model selector */}
        <div className={styles.panel}>
          <div className={styles.panelLabel}>Models — {selectedModels.length} selected</div>
          <div className={styles.chips}>
            {MODELS.map((m) => {
              const on = selectedModels.includes(m.id);
              return (
                <button
                  key={m.id}
                  className={styles.chip}
                  onClick={() => toggleModel(m.id)}
                  style={{
                    borderColor: on ? m.color : "#151f30",
                    color: on ? m.color : "#3a5270",
                    background: on ? `${m.color}12` : "transparent",
                  }}
                >
                  {m.shortName}{m.id.includes(":free") ? " (free)" : ""}
                </button>
              );
            })}
          </div>
        </div>

        {/* Question input */}
        <div className={styles.qWrap}>
          <textarea
            className={styles.qInput}
            placeholder="질문을 입력하세요 — 어떤 맥락이든 괜찮습니다"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") handleSubmit(); }}
          />
          <div className={styles.qActions}>
            <button className={styles.runBtn} onClick={handleSubmit} disabled={isRunning}>
              {isRunning ? "실행 중..." : "→ coThink"}
            </button>
            {(synthesis || Object.keys(responses).length > 0) && (
              <button className={styles.resetBtn} onClick={handleReset}>새 질문</button>
            )}
            <span className={styles.hint}>⌘↵ or Ctrl↵</span>
          </div>
        </div>

        {error && <div className={styles.errorBox}>⚠ {error}</div>}

        {isRunning && (
          <div className={styles.phaseBar}>
            <div className={styles.spin} />
            {phase === "querying"
              ? `${selectedModels.length}개 모델에 동시 질의 중...`
              : "Claude가 답변들을 종합 분석 중..."}
          </div>
        )}

        {/* Model response cards */}
        {Object.keys(responses).length > 0 && (
          <>
            <div className={styles.responsesGrid}>
              {selectedModels.map((id) => {
                const m = MODELS.find((x) => x.id === id)!;
                const r = responses[id];
                if (!r) return null;
                return (
                  <div key={id} className={styles.rCard} style={{ border: `1px solid ${m.color}20` }}>
                    <div className={styles.rHead}>
                      <div className={styles.dot} style={{ background: m.color }} />
                      <span className={styles.rName} style={{ color: m.color }}>{m.name}</span>
                      <span className={styles.rStatus} style={{ color: r.status === "error" ? "#ff6060" : r.status === "done" ? "#2a4060" : "#3a5270" }}>
                        {r.status === "loading" ? "waiting..." : r.status === "error" ? "failed" : "done"}
                      </span>
                    </div>
                    {r.status === "loading" ? (
                      <div className={styles.loadingAnim}>
                        {[0, 1, 2].map((i) => (
                          <div key={i} className={styles.ld} style={{ background: `${m.color}90`, animationDelay: `${i * 0.18}s` }} />
                        ))}
                      </div>
                    ) : r.status === "error" ? (
                      <div className={styles.rError}>{r.content}</div>
                    ) : (
                      <div className={styles.rBody}>{r.content}</div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Synthesis panel */}
            {synthesis && (
              <div className={styles.synthCard}>
                <div className={styles.synthTag}>Claude Synthesis</div>

                <div className={styles.analysisGrid}>
                  <div>
                    <div className={styles.aTitle}>공통된 관점</div>
                    <div className={styles.aText}>{synthesis.agreement}</div>
                  </div>
                  <div>
                    <div className={styles.aTitle}>고유한 인사이트</div>
                    <div className={styles.aText}>{synthesis.uniqueInsights}</div>
                  </div>
                </div>

                {synthesis.contradictions && synthesis.contradictions !== "없음" && (
                  <div style={{ marginBottom: 18 }}>
                    <div className={styles.aTitle}>모순 및 이견</div>
                    <div className={styles.aText} style={{ color: "#e0906a" }}>{synthesis.contradictions}</div>
                  </div>
                )}

                <hr className={styles.divider} />

                <div className={styles.bestLabel}>∷ 종합 답변</div>
                <div className={styles.bestBox}>{synthesis.bestAnswer}</div>

                {synthesis.followUps?.length > 0 && (
                  <div className={styles.followupSection}>
                    <div className={styles.fuLabel}>제안 후속 질문 — 클릭하면 바로 입력</div>
                    <div className={styles.fuList}>
                      {synthesis.followUps.map((q, i) => (
                        <button key={i} className={styles.fuBtn} onClick={() => handleFollowUp(q)}>
                          <span className={styles.fuArrow}>→</span>
                          <span>{q}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
