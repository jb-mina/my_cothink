/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useRef } from "react";
import styles from "./page.module.css";

// ─── Types ────────────────────────────────────────────────────────────────────

type RStatus = "loading" | "done" | "error";
type MResponse = { status: RStatus; content: string };
type Synthesis = {
  agreement: string;
  uniqueInsights: string;
  contradictions: string;
  bestAnswer: string;
  attributions: Record<string, string>;
  followUps: string[];
};
type Turn = {
  question: string;
  responses: Record<string, { status: string; content: string }>;
  synthesis: Synthesis | null;
};
type Thread = { id: string; title: string; createdAt: number; turns: Turn[] };

// ─── Constants ────────────────────────────────────────────────────────────────

const MODELS = [
  { id: "openai/gpt-4o",                name: "GPT-4o",               shortName: "ChatGPT",    color: "#10a37f" },
  { id: "google/gemini-3-flash-preview", name: "Gemini 3 Flash",       shortName: "Gemini",     color: "#4285f4" },
  { id: "anthropic/claude-sonnet-4-6",  name: "Claude Sonnet 4.6",    shortName: "Claude",     color: "#d4954a" },
  { id: "perplexity/sonar-pro",         name: "Perplexity Sonar Pro", shortName: "Perplexity", color: "#20b2aa" },
  { id: "x-ai/grok-4.1-fast",          name: "Grok 4.1 Fast",        shortName: "Grok",       color: "#e8562a" },
] as const;

const MEDIATORS = [
  { id: "anthropic",                    shortName: "Claude 4",   name: "Claude Sonnet 4",      color: "#42c8a0" },
  { id: "openai/gpt-4o",               shortName: "GPT-4o",     name: "GPT-4o",               color: "#10a37f" },
  { id: "google/gemini-3-flash-preview",shortName: "Gemini 3",   name: "Gemini 3 Flash",       color: "#4285f4" },
  { id: "x-ai/grok-4.1-fast",          shortName: "Grok 4.1",   name: "Grok 4.1 Fast",        color: "#e8562a" },
  { id: "perplexity/sonar-pro",         shortName: "Perplexity", name: "Perplexity Sonar Pro", color: "#20b2aa" },
] as const;

// ─── Storage ──────────────────────────────────────────────────────────────────

const SK = "cothink_threads";

function loadThreads(): Thread[] {
  try { return JSON.parse(localStorage.getItem(SK) ?? "[]") as Thread[]; }
  catch { return []; }
}

function saveThread(thread: Thread): void {
  try {
    const all = loadThreads();
    const idx = all.findIndex((t) => t.id === thread.id);
    if (idx >= 0) all[idx] = thread; else all.unshift(thread);
    localStorage.setItem(SK, JSON.stringify(all.slice(0, 60)));
  } catch { /* ignore */ }
}

function deleteThread(id: string): Thread[] {
  const all = loadThreads().filter((t) => t.id !== id);
  localStorage.setItem(SK, JSON.stringify(all));
  return all;
}

// ─── Markdown renderer ────────────────────────────────────────────────────────

function inlineFmt(text: string): React.ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g).map((p, i) => {
    if (/^\*\*[^*]+\*\*$/.test(p)) return <strong key={i}>{p.slice(2, -2)}</strong>;
    if (/^\*[^*]+\*$/.test(p))     return <em key={i}>{p.slice(1, -1)}</em>;
    if (/^`[^`]+`$/.test(p))       return <code key={i} className={styles.ic}>{p.slice(1, -1)}</code>;
    return p;
  });
}

function Markdown({ content }: { content: string }): React.ReactElement {
  const lines = content.split("\n");
  const out: React.ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const l = lines[i];
    // code block
    if (l.startsWith("```")) {
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) { code.push(lines[i]); i++; }
      out.push(<pre key={i} className={styles.codeBlock}><code>{code.join("\n")}</code></pre>);
    }
    // table
    else if (l.trim().startsWith("|") && i + 1 < lines.length && lines[i + 1].includes("---")) {
      const hdr = l.split("|").filter((c) => c.trim()).map((c) => c.trim());
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        rows.push(lines[i].split("|").filter((c) => c.trim()).map((c) => c.trim()));
        i++;
      }
      out.push(
        <div key={i} className={styles.tblWrap}>
          <table className={styles.tbl}>
            <thead><tr>{hdr.map((h, j) => <th key={j}>{h}</th>)}</tr></thead>
            <tbody>{rows.map((r, j) => <tr key={j}>{r.map((c, k) => <td key={k}>{c}</td>)}</tr>)}</tbody>
          </table>
        </div>
      );
      continue;
    }
    else if (l.startsWith("#### ")) out.push(<p key={i} className={styles.h4}>{inlineFmt(l.slice(5))}</p>);
    else if (l.startsWith("### "))  out.push(<p key={i} className={styles.h3}>{inlineFmt(l.slice(4))}</p>);
    else if (l.startsWith("## "))   out.push(<p key={i} className={styles.h2}>{inlineFmt(l.slice(3))}</p>);
    else if (l.startsWith("# "))    out.push(<p key={i} className={styles.h1}>{inlineFmt(l.slice(2))}</p>);
    else if (l.trim() === "---")    out.push(<hr key={i} className={styles.mdHr} />);
    else if (l.match(/^[\s]*[-*]\s/)) {
      const items = [l.replace(/^[\s]*[-*]\s/, "")];
      let j = i + 1;
      while (j < lines.length && lines[j].match(/^[\s]*[-*]\s/)) { items.push(lines[j].replace(/^[\s]*[-*]\s/, "")); j++; }
      out.push(<ul key={i} className={styles.mdUl}>{items.map((it, k) => <li key={k}>{inlineFmt(it)}</li>)}</ul>);
      i = j - 1;
    }
    else if (l.match(/^\d+\.\s/)) {
      const items = [l.replace(/^\d+\.\s/, "")];
      let j = i + 1;
      while (j < lines.length && lines[j].match(/^\d+\.\s/)) { items.push(lines[j].replace(/^\d+\.\s/, "")); j++; }
      out.push(<ol key={i} className={styles.mdOl}>{items.map((it, k) => <li key={k}>{inlineFmt(it)}</li>)}</ol>);
      i = j - 1;
    }
    else if (l.trim() === "") out.push(<div key={i} className={styles.mdSp} />);
    else out.push(<p key={i} className={styles.mdP}>{inlineFmt(l)}</p>);
    i++;
  }
  return <>{out}</>;
}

// ─── Model Tabs ───────────────────────────────────────────────────────────────

function ModelTabs({
  selModels, responses, queryKey,
}: {
  selModels: string[];
  responses: Record<string, MResponse>;
  queryKey: number;
}): React.ReactElement {
  const [active, setActive] = useState(0);

  // reset on new query
  useEffect(() => { setActive(0); }, [queryKey]);

  // auto-focus first completed tab
  const statusStr = selModels.map((id) => responses[id]?.status ?? "").join(",");
  useEffect(() => {
    const first = selModels.findIndex((id) => responses[id]?.status === "done");
    if (first >= 0) setActive(first);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusStr]);

  const activeId    = selModels[active] ?? "";
  const activeModel = MODELS.find((m) => m.id === activeId);
  const activeResp  = responses[activeId];

  return (
    <div className={styles.tabContainer}>
      <div className={styles.tabBar}>
        {selModels.map((id, i) => {
          const m = MODELS.find((x) => x.id === id);
          if (!m) return null;
          const r = responses[id];
          const on = i === active;
          const dotBg =
            r?.status === "done"  ? m.color :
            r?.status === "error" ? "#ff6060" : "transparent";
          return (
            <button key={id}
              className={`${styles.tabBtn} ${on ? styles.tabActive : ""}`}
              onClick={() => setActive(i)}
              style={on ? { borderBottomColor: m.color, color: m.color } : undefined}>
              <span className={styles.tabDot} style={{
                background: dotBg,
                border: r?.status === "loading" ? `1.5px solid ${m.color}` : "none",
                animation: r?.status === "loading" ? "spin 0.8s linear infinite" : "none",
              }} />
              {m.shortName}
              {r?.status === "done"  && <span style={{ color: m.color,   fontSize: 10 }}>✓</span>}
              {r?.status === "error" && <span style={{ color: "#ff6060", fontSize: 10 }}>✕</span>}
            </button>
          );
        })}
      </div>
      <div className={styles.tabContent}>
        {!activeResp || activeResp.status === "loading" ? (
          <div className={styles.ldAnim}>
            {[0, 1, 2].map((k) => (
              <div key={k} className={styles.ld}
                style={{ background: `${activeModel?.color ?? "#42c8a0"}90`, animationDelay: `${k * 0.18}s` }} />
            ))}
          </div>
        ) : activeResp.status === "error" ? (
          <div className={styles.rError}>{activeResp.content}</div>
        ) : (
          <div className={styles.tabBody}><Markdown content={activeResp.content} /></div>
        )}
      </div>
    </div>
  );
}

// ─── Synthesis Panel ──────────────────────────────────────────────────────────

function SynthPanel({
  s, onFollowUp, customQ, setCustomQ, onCustomSubmit, compact,
}: {
  s: Synthesis;
  onFollowUp: (q: string) => void;
  customQ?: string;
  setCustomQ?: (v: string) => void;
  onCustomSubmit?: () => void;
  compact?: boolean;
}): React.ReactElement {
  return (
    <div className={compact ? styles.synthCompact : styles.synthCard}>
      <div className={styles.synthTag}>Claude Synthesis</div>

      <div className={styles.aGrid}>
        <div>
          <div className={styles.aTitle}>공통된 관점</div>
          <div className={styles.aText}><Markdown content={s.agreement} /></div>
        </div>
        <div>
          <div className={styles.aTitle}>고유한 인사이트</div>
          <div className={styles.aText}><Markdown content={s.uniqueInsights} /></div>
        </div>
      </div>

      {s.contradictions && s.contradictions !== "없음" && (
        <div style={{ marginBottom: 16 }}>
          <div className={styles.aTitle}>모순 및 이견</div>
          <div className={`${styles.aText} ${styles.contradiction}`}>
            <Markdown content={s.contradictions} />
          </div>
        </div>
      )}

      <hr className={styles.divider} />

      {Object.keys(s.attributions ?? {}).length > 0 && (
        <div className={styles.attrSec}>
          <div className={styles.aTitle}>모델별 기여 — 종합 답변 출처</div>
          <div className={styles.attrList}>
            {Object.entries(s.attributions).map(([name, note]) => {
              const m = MODELS.find((x) => x.name === name || x.shortName === name);
              const c = m?.color ?? "#5a7090";
              return (
                <div key={name} className={styles.attrItem}>
                  <span className={styles.attrBadge} style={{ color: c, borderColor: `${c}50`, background: `${c}12` }}>{name}</span>
                  <span className={styles.attrNote}>{note}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className={styles.bestLabel}>∷ 종합 답변</div>
      <div className={styles.bestBox}><Markdown content={s.bestAnswer} /></div>

      <div className={styles.fuSec}>
        <div className={styles.fuLabel}>제안 후속 질문</div>
        <div className={styles.fuList}>
          {(s.followUps ?? []).map((q, i) => (
            <button key={i} className={styles.fuBtn} onClick={() => onFollowUp(q)}>
              <span className={styles.fuArrow}>→</span><span>{q}</span>
            </button>
          ))}
        </div>

        {!compact && setCustomQ && (
          <>
            <div className={styles.fuLabel} style={{ marginTop: 14 }}>직접 입력</div>
            <div className={styles.customRow}>
              <input
                className={styles.customInput}
                placeholder="후속 질문을 직접 입력하세요..."
                value={customQ ?? ""}
                onChange={(e) => setCustomQ(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && customQ?.trim()) onCustomSubmit?.(); }}
              />
              <button className={styles.customBtn} onClick={onCustomSubmit} disabled={!customQ?.trim()}>→</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Home(): React.ReactElement {
  const [question,    setQuestion]    = useState("");
  const [customQ,     setCustomQ]     = useState("");
  const [selModels,   setSelModels]   = useState<string[]>(MODELS.map((m) => m.id));
  const [mediatorId,  setMediatorId]  = useState("anthropic");
  const [responses,   setResponses]   = useState<Record<string, MResponse>>({});
  const [synthesis,   setSynthesis]   = useState<Synthesis | null>(null);
  const [phase,       setPhase]       = useState<"idle" | "querying" | "synthesizing" | "done">("idle");
  const [queryKey,    setQueryKey]    = useState(0);
  const [error,       setError]       = useState("");
  const [threads,     setThreads]     = useState<Thread[]>([]);
  const [activeThread,setActiveThread]= useState<Thread | null>(null);
  const [viewThread,  setViewThread]  = useState<Thread | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const synthRef  = useRef<HTMLDivElement>(null);
  const threadRef = useRef<Thread | null>(null);

  useEffect(() => { setThreads(loadThreads()); }, []);

  useEffect(() => {
    if (synthesis) {
      setTimeout(() => synthRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 300);
    }
  }, [synthesis]);

  const toggleModel = (id: string) =>
    setSelModels((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);

  const selectedMediator = MEDIATORS.find((m) => m.id === mediatorId) ?? MEDIATORS[0];

  // ── Core query function ──────────────────────────────────────────────────

  const runQuery = async (q: string): Promise<void> => {
    const trimmed = q.trim();
    if (!trimmed) { setError("질문을 입력해주세요."); return; }
    if (selModels.length < 2) { setError("최소 2개 모델을 선택해주세요."); return; }

    setViewThread(null);
    setError(""); setResponses({}); setSynthesis(null);
    setPhase("querying"); setQuestion(trimmed); setCustomQ("");
    setQueryKey((k) => k + 1);

    const init: Record<string, MResponse> = {};
    selModels.forEach((id) => { init[id] = { status: "loading", content: "" }; });
    setResponses(init);

    const results: { id: string; name: string; content: string }[] = [];

    await Promise.allSettled(
      selModels.map(async (modelId) => {
        const model = MODELS.find((m) => m.id === modelId);
        if (!model) return;
        try {
          const res = await fetch("/api/query", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ modelId, question: trimmed }),
          });
          const data = await res.json() as { content?: string; error?: string };
          if (data.error) throw new Error(data.error);
          const content = data.content ?? "";
          setResponses((p) => ({ ...p, [modelId]: { status: "done", content } }));
          results.push({ id: modelId, name: model.name, content });
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : "Unknown error";
          setResponses((p) => ({ ...p, [modelId]: { status: "error", content: msg } }));
        }
      })
    );

    if (results.length === 0) {
      setError("모든 모델 호출 실패 — 각 탭의 에러 메시지를 확인해주세요.");
      setPhase("done");
      return;
    }

    setPhase("synthesizing");
    try {
      const res = await fetch("/api/synthesize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed, modelResponses: results, mediatorId }),
      });
      const data = await res.json() as Synthesis & { error?: string };
      if (data.error) throw new Error(data.error);
      setSynthesis(data);

      // Save to thread
      const turn: Turn = {
        question: trimmed,
        responses: Object.fromEntries(results.map((r) => [r.id, { status: "done", content: r.content }])),
        synthesis: data,
      };
      const existing = threadRef.current;
      const thread: Thread = existing
        ? { ...existing, turns: [...existing.turns, turn] }
        : { id: String(Date.now()), title: trimmed.slice(0, 70), createdAt: Date.now(), turns: [turn] };

      threadRef.current = thread;
      setActiveThread(thread);
      saveThread(thread);
      setThreads(loadThreads());
    } catch (e: unknown) {
      setError("종합 분석 실패: " + (e instanceof Error ? e.message : "unknown"));
    }

    setPhase("done");
  };

  const newThread = (): void => {
    setQuestion(""); setResponses({}); setSynthesis(null);
    setPhase("idle"); setError(""); setCustomQ("");
    setActiveThread(null); setViewThread(null);
    threadRef.current = null;
  };

  const handleDeleteThread = (id: string, e: React.MouseEvent): void => {
    e.stopPropagation();
    setThreads(deleteThread(id));
    if (viewThread?.id === id) setViewThread(null);
    if (activeThread?.id === id) { setActiveThread(null); threadRef.current = null; }
  };

  const handleViewFollowUp = (thread: Thread, q: string): void => {
    threadRef.current = thread;
    setActiveThread(thread);
    setViewThread(null);
    void runQuery(q);
  };

  const isRunning = phase === "querying" || phase === "synthesizing";

  // ── Sidebar ──────────────────────────────────────────────────────────────

  const sidebar = (
    <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : styles.sidebarClosed}`}>
      <div className={styles.sidebarTop}>
        <button className={styles.newBtn} onClick={newThread}>＋ 새 탐구</button>
      </div>
      <div className={styles.threadList}>
        {threads.length === 0 && <div className={styles.emptyNote}>저장된 탐구가 없어요</div>}
        {threads.map((t) => {
          const isActive = t.id === (viewThread?.id ?? activeThread?.id ?? "");
          return (
            <div key={t.id}
              className={`${styles.threadItem} ${isActive ? styles.threadActive : ""}`}
              onClick={() => setViewThread(t)}>
              <div className={styles.tTitle}>{t.title}</div>
              <div className={styles.tMeta}>{t.turns.length}턴 · {new Date(t.createdAt).toLocaleDateString("ko")}</div>
              <button className={styles.delBtn} onClick={(e) => handleDeleteThread(t.id, e)}>×</button>
            </div>
          );
        })}
      </div>
    </aside>
  );

  // ── Header ───────────────────────────────────────────────────────────────

  const header = (
    <header className={styles.header}>
      <button className={styles.sbToggle} onClick={() => setSidebarOpen((p) => !p)}>
        {sidebarOpen ? "◀" : "▶"}
      </button>
      <div className={styles.logoArea}>
        <span className={styles.logo}>coThink</span>
        <span className={styles.logoTag}>Multi-Model Reasoning</span>
      </div>
      <div className={styles.mediatorTag} style={{
        color: selectedMediator.color,
        borderColor: `${selectedMediator.color}40`,
        background: `${selectedMediator.color}10`,
      }}>
        ✦ mediator: {selectedMediator.name}
      </div>
    </header>
  );

  // ── Thread view ───────────────────────────────────────────────────────────

  if (viewThread) {
    return (
      <div className={styles.layout} data-sidebar={sidebarOpen ? "open" : "closed"}>
        {sidebar}
        <div className={styles.content}>
          {header}
          <div className={styles.scrollArea}>
            <div className={styles.threadViewHdr}>
              <h2 className={styles.threadViewTitle}>{viewThread.title}</h2>
              <button className={styles.backBtn} onClick={() => setViewThread(null)}>← 새 질문</button>
            </div>
            {viewThread.turns.map((turn, ti) => (
              <div key={ti} className={styles.turnBlock}>
                <div className={styles.turnQ}>
                  <span className={styles.turnQN}>Q{ti + 1}</span>
                  {turn.question}
                </div>
                <div className={styles.tGrid}>
                  {Object.entries(turn.responses).map(([modelId, r]) => {
                    const m = MODELS.find((x) => x.id === modelId);
                    if (!m || r.status !== "done") return null;
                    return (
                      <div key={modelId} className={styles.rCard} style={{ border: `1px solid ${m.color}20` }}>
                        <div className={styles.rHead}>
                          <div className={styles.dot} style={{ background: m.color }} />
                          <span className={styles.rName} style={{ color: m.color }}>{m.name}</span>
                        </div>
                        <div className={styles.rBody}><Markdown content={r.content} /></div>
                      </div>
                    );
                  })}
                </div>
                {turn.synthesis && (
                  <SynthPanel
                    s={turn.synthesis}
                    onFollowUp={(q) => handleViewFollowUp(viewThread, q)}
                    compact
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Active session ────────────────────────────────────────────────────────

  return (
    <div className={styles.layout} data-sidebar={sidebarOpen ? "open" : "closed"}>
      {sidebar}
      <div className={styles.content}>
        {header}
        <div className={styles.scrollArea}>
          <div className={styles.session}>

            {/* Model selector */}
            <div className={styles.panel}>
              <div className={styles.panelLabel}>Models — {selModels.length} / {MODELS.length}</div>
              <div className={styles.chips}>
                {MODELS.map((m) => {
                  const on = selModels.includes(m.id);
                  return (
                    <button key={m.id} className={styles.chip} onClick={() => toggleModel(m.id)}
                      style={{ borderColor: on ? m.color : "#151f30", color: on ? m.color : "#3a5270", background: on ? `${m.color}12` : "transparent" }}>
                      {m.shortName}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Mediator selector */}
            <div className={styles.panel}>
              <div className={styles.panelLabel}>Mediator — 종합 분석 모델</div>
              <div className={styles.chips}>
                {MEDIATORS.map((m) => {
                  const on = mediatorId === m.id;
                  return (
                    <button key={m.id} className={styles.chip} onClick={() => setMediatorId(m.id)}
                      style={{ borderColor: on ? m.color : "#151f30", color: on ? m.color : "#3a5270", background: on ? `${m.color}12` : "transparent" }}>
                      {on && "✦ "}{m.shortName}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Thread context */}
            {activeThread !== null && (
              <div className={styles.threadCtx}>
                <span>
                  쓰레드 {activeThread.turns.length}번째 질문 진행 중
                  {" — "}<em>{activeThread.title.slice(0, 40)}{activeThread.title.length > 40 ? "..." : ""}</em>
                </span>
                <button onClick={newThread}>새 쓰레드</button>
              </div>
            )}

            {/* Question input */}
            <div className={styles.qWrap}>
              <textarea
                className={styles.qInput}
                placeholder="질문을 입력하세요"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") void runQuery(question); }}
              />
              <div className={styles.qActions}>
                <button className={styles.runBtn} onClick={() => void runQuery(question)} disabled={isRunning}>
                  {isRunning ? "실행 중..." : "→ coThink"}
                </button>
                {Object.keys(responses).length > 0 && (
                  <button className={styles.resetBtn} onClick={newThread}>새 질문</button>
                )}
                <span className={styles.hint}>⌘↵</span>
              </div>
            </div>

            {error && <div className={styles.errorBox}>⚠ {error}</div>}

            {isRunning && (
              <div className={styles.phaseBar}>
                <div className={styles.spin} />
                {phase === "querying"
                  ? `${selModels.length}개 모델에 동시 질의 중...`
                  : `${selectedMediator.name}이(가) 종합 분석 중...`}
              </div>
            )}

            {/* Model tabs */}
            {Object.keys(responses).length > 0 && (
              <ModelTabs selModels={selModels} responses={responses} queryKey={queryKey} />
            )}

            {/* Synthesis */}
            {synthesis !== null && (
              <div ref={synthRef}>
                <SynthPanel
                  s={synthesis}
                  onFollowUp={(q) => void runQuery(q)}
                  customQ={customQ}
                  setCustomQ={setCustomQ}
                  onCustomSubmit={() => { if (customQ.trim()) void runQuery(customQ); }}
                />
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
