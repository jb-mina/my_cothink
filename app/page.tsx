"use client";
import { useState, useEffect, useRef } from "react";
import styles from "./page.module.css";

// ── Types ─────────────────────────────────────────────────────────────────────
type RS = "loading" | "done" | "error";
type MR = { status: RS; content: string; truncated?: boolean };
type Syn = {
  agreement: string; uniqueInsights: string; contradictions: string;
  bestAnswer: string; attributions: Record<string, string>; followUps: string[];
  _truncated?: boolean;
};
type Turn = { question: string; responses: Record<string, { status: string; content: string; truncated?: boolean }>; synthesis: Syn | null };
type Thread = { id: string; title: string; createdAt: number; turns: Turn[] };

// ── Config ────────────────────────────────────────────────────────────────────
const MODELS = [
  { id: "openai/gpt-4o",                name: "GPT-4o",               short: "ChatGPT",    color: "#10a37f" },
  { id: "google/gemini-3-flash-preview", name: "Gemini 3 Flash",       short: "Gemini",     color: "#4285f4" },
  { id: "anthropic/claude-sonnet-4.5",  name: "Claude Sonnet 4.5",    short: "Claude",     color: "#d4954a" },
  { id: "perplexity/sonar-pro",         name: "Perplexity Sonar Pro", short: "Perplexity", color: "#20b2aa" },
  { id: "x-ai/grok-4.1-fast",          name: "Grok 4.1 Fast",        short: "Grok",       color: "#e8562a" },
];
const MEDIATORS = [
  { id: "anthropic",                    short: "Claude 4",   name: "Claude Sonnet 4",      color: "#42c8a0" },
  { id: "openai/gpt-4o",               short: "GPT-4o",     name: "GPT-4o",               color: "#10a37f" },
  { id: "google/gemini-3-flash-preview",short: "Gemini 3",   name: "Gemini 3 Flash",       color: "#4285f4" },
  { id: "x-ai/grok-4.1-fast",          short: "Grok 4.1",   name: "Grok 4.1 Fast",        color: "#e8562a" },
  { id: "perplexity/sonar-pro",         short: "Perplexity", name: "Perplexity Sonar Pro", color: "#20b2aa" },
];

const HISTORY_LIMIT = 5;

// ── Storage ───────────────────────────────────────────────────────────────────
const SK = "cothink_v1";
const loadAll = (): Thread[] => { try { return JSON.parse(localStorage.getItem(SK) || "[]"); } catch { return []; } };
const saveOne = (t: Thread) => {
  const all = loadAll(); const i = all.findIndex(x => x.id === t.id);
  if (i >= 0) all[i] = t; else all.unshift(t);
  try { localStorage.setItem(SK, JSON.stringify(all.slice(0, 50))); } catch {}
};
const removeOne = (id: string) => {
  const all = loadAll().filter(t => t.id !== id);
  try { localStorage.setItem(SK, JSON.stringify(all)); } catch {}
  return all;
};

// ── Copy ──────────────────────────────────────────────────────────────────────
function CopyBtn({ text, label = "복사" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  const onClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); } catch {}
      document.body.removeChild(ta);
    }
    setDone(true);
    setTimeout(() => setDone(false), 1800);
  };
  return (
    <button className={styles.cpy} onClick={onClick} type="button" aria-label="복사">
      {done ? "✓ 복사됨" : `⧉ ${label}`}
    </button>
  );
}

function formatSynthAsMarkdown(s: Syn): string {
  const parts: string[] = [];
  if (s.bestAnswer) parts.push(`## 종합 답변\n\n${s.bestAnswer}`);
  if (s.agreement) parts.push(`### 공통된 관점\n\n${s.agreement}`);
  if (s.uniqueInsights) parts.push(`### 고유한 인사이트\n\n${s.uniqueInsights}`);
  if (s.contradictions && s.contradictions !== "없음") {
    parts.push(`### 모순 및 이견\n\n${s.contradictions}`);
  }
  const attrs = Object.entries(s.attributions || {});
  if (attrs.length > 0) {
    const lines = attrs.map(([n, note]) => `- **${n}**: ${note}`).join("\n");
    parts.push(`### 모델별 기여\n\n${lines}`);
  }
  if (s.followUps && s.followUps.length > 0) {
    const lines = s.followUps.map(q => `- ${q}`).join("\n");
    parts.push(`### 제안 후속 질문\n\n${lines}`);
  }
  return parts.join("\n\n");
}

function formatTurnAsMarkdown(turn: Turn): string {
  const parts: string[] = [`# ${turn.question}`];
  for (const id of Object.keys(turn.responses)) {
    const m = MODELS.find(x => x.id === id);
    if (!m) continue;
    const r = turn.responses[id];
    if (r.status !== "done" || !r.content) continue;
    parts.push(`## ${m.name}\n\n${r.content}`);
  }
  if (turn.synthesis) {
    parts.push(`---\n\n${formatSynthAsMarkdown(turn.synthesis)}`);
  }
  return parts.join("\n\n");
}

// ── Markdown ──────────────────────────────────────────────────────────────────
function fmt(text: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let s = text, k = 0;
  while (s.length > 0) {
    const b = s.match(/^\*\*(.+?)\*\*/);
    if (b) { out.push(<strong key={k++}>{b[1]}</strong>); s = s.slice(b[0].length); continue; }
    const em = s.match(/^\*([^*\n]+?)\*/);
    if (em) { out.push(<em key={k++}>{em[1]}</em>); s = s.slice(em[0].length); continue; }
    const co = s.match(/^`([^`\n]+?)`/);
    if (co) { out.push(<code key={k++} className={styles.ic}>{co[1]}</code>); s = s.slice(co[0].length); continue; }
    const nx = s.slice(1).search(/\*\*|\*|`/);
    if (nx === -1) { out.push(s); break; }
    out.push(s.slice(0, nx + 1)); s = s.slice(nx + 1);
  }
  return out.length > 0 ? out : [text];
}

function MD({ c }: { c: string }) {
  const lines = c.split("\n");
  const out: React.ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const l = lines[i];
    if (l.startsWith("```")) {
      const code: string[] = []; i++;
      while (i < lines.length && !lines[i].startsWith("```")) { code.push(lines[i]); i++; }
      out.push(<pre key={i} className={styles.pre}><code>{code.join("\n")}</code></pre>);
      i++; continue;
    }
    if (l.trim().startsWith("|") && i + 1 < lines.length && lines[i + 1].includes("---")) {
      const hdr = l.split("|").filter(x => x.trim()).map(x => x.trim()); i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        rows.push(lines[i].split("|").filter(x => x.trim()).map(x => x.trim())); i++;
      }
      out.push(
        <div key={i} className={styles.tw}>
          <table className={styles.tbl}>
            <thead><tr>{hdr.map((h, j) => <th key={j}>{h}</th>)}</tr></thead>
            <tbody>{rows.map((r, j) => <tr key={j}>{r.map((c2, k) => <td key={k}>{c2}</td>)}</tr>)}</tbody>
          </table>
        </div>
      ); continue;
    }
    if (l.startsWith("#### "))     out.push(<p key={i} className={styles.h4}>{fmt(l.slice(5))}</p>);
    else if (l.startsWith("### ")) out.push(<p key={i} className={styles.h3}>{fmt(l.slice(4))}</p>);
    else if (l.startsWith("## "))  out.push(<p key={i} className={styles.h2}>{fmt(l.slice(3))}</p>);
    else if (l.startsWith("# "))   out.push(<p key={i} className={styles.h1}>{fmt(l.slice(2))}</p>);
    else if (l.trim() === "---")   out.push(<hr key={i} className={styles.mhr} />);
    else if (l.match(/^[ \t]*[-*]\s/)) {
      const items = [l.replace(/^[ \t]*[-*]\s/, "")]; let j = i + 1;
      while (j < lines.length && lines[j].match(/^[ \t]*[-*]\s/)) { items.push(lines[j].replace(/^[ \t]*[-*]\s/, "")); j++; }
      out.push(<ul key={i} className={styles.ul}>{items.map((x, k) => <li key={k}>{fmt(x)}</li>)}</ul>);
      i = j; continue;
    }
    else if (l.match(/^\d+\.\s/)) {
      const items = [l.replace(/^\d+\.\s/, "")]; let j = i + 1;
      while (j < lines.length && lines[j].match(/^\d+\.\s/)) { items.push(lines[j].replace(/^\d+\.\s/, "")); j++; }
      out.push(<ol key={i} className={styles.ol}>{items.map((x, k) => <li key={k}>{fmt(x)}</li>)}</ol>);
      i = j; continue;
    }
    else if (l.trim() === "") out.push(<div key={i} className={styles.sp} />);
    else out.push(<p key={i} className={styles.mp}>{fmt(l)}</p>);
    i++;
  }
  return <>{out}</>;
}

// ── Clamp / ScrollNav ─────────────────────────────────────────────────────────
function Clamp({ children, lines = 10 }: { children: React.ReactNode; lines?: number }) {
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    const measure = () => setOverflowing(el.scrollHeight > el.clientHeight + 1);
    measure();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, [children]);
  return (
    <div className={styles.clampWrap} style={{ ['--clamp-lines' as string]: lines }}>
      <div ref={ref} className={expanded ? undefined : styles.clamp}>{children}</div>
      {overflowing && (
        <button type="button" className={styles.expandBtn} onClick={e => { e.stopPropagation(); setExpanded(v => !v); }}>
          {expanded ? "접기 ▴" : "더 보기 ▾"}
        </button>
      )}
    </div>
  );
}

function ScrollNav({ scrollRef }: { scrollRef: React.RefObject<HTMLDivElement> }) {
  const top = () => scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  const bottom = () => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  };
  return (
    <div className={styles.scrollNav}>
      <button type="button" className={styles.snBtn} onClick={top} aria-label="맨 위로">▲</button>
      <button type="button" className={styles.snBtn} onClick={bottom} aria-label="맨 아래로">▼</button>
    </div>
  );
}

// ── Tabs ──────────────────────────────────────────────────────────────────────
function Tabs({ sel, resp, qk, activeIdx, setActiveIdx }: {
  sel: string[]; resp: Record<string, MR>; qk: number;
  activeIdx?: number; setActiveIdx?: (i: number) => void;
}) {
  const [localActive, setLocalActive] = useState(0);
  const active = activeIdx !== undefined ? activeIdx : localActive;
  const setActive = setActiveIdx ?? setLocalActive;
  useEffect(() => { if (activeIdx === undefined) setLocalActive(0); }, [qk]); // eslint-disable-line
  const statusKey = sel.map(id => resp[id]?.status ?? "").join(",");
  useEffect(() => {
    if (activeIdx !== undefined) return;
    const first = sel.findIndex(id => resp[id]?.status === "done");
    if (first >= 0) setLocalActive(first);
  }, [statusKey]); // eslint-disable-line
  const id = sel[active] || "";
  const mo = MODELS.find(x => x.id === id);
  const r = resp[id];
  return (
    <div className={styles.tabs}>
      <div className={styles.tabbar}>
        {sel.map((mid, i) => {
          const m = MODELS.find(x => x.id === mid); if (!m) return null;
          const ri = resp[mid]; const on = i === active;
          return (
            <button key={mid} className={`${styles.tab} ${on ? styles.tabOn : ""}`}
              onClick={() => setActive(i)}
              style={on ? { borderBottomColor: m.color, color: m.color } : undefined}>
              <span className={styles.tdot} style={{
                background: ri?.status === "done" ? m.color : ri?.status === "error" ? "#f66" : "transparent",
                border: ri?.status === "loading" ? `1.5px solid ${m.color}` : "none",
                animation: ri?.status === "loading" ? "spin .8s linear infinite" : "none",
              }} />
              {m.short}
              {ri?.status === "done" && <span style={{ fontSize: 10, color: m.color }}> ✓</span>}
              {ri?.status === "error" && <span style={{ fontSize: 10, color: "#f66" }}> ✕</span>}
            </button>
          );
        })}
      </div>
      <div className={styles.tabbody}>
        {r?.status === "done" && r.content && (
          <CopyBtn text={r.content} label="답변 복사" />
        )}
        {!r || r.status === "loading" ? (
          <div className={styles.ldots}>
            {[0, 1, 2].map(k => <div key={k} className={styles.ldot} style={{ background: `${mo?.color || "#42c8a0"}80`, animationDelay: `${k * .18}s` }} />)}
          </div>
        ) : r.status === "error" ? (
          <p className={styles.rerr}>{r.content}</p>
        ) : (
          <>
            <MD c={r.content} />
            {r.truncated && (
              <div className={styles.tbox}>⚠ 답변이 토큰 한도로 잘렸을 수 있습니다. 후속 질문으로 이어 받아보세요.</div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Synthesis ─────────────────────────────────────────────────────────────────
function SynthPanel({ s, onFU, cq, setCQ, onCS, compact, onAttrClick }: {
  s: Syn; onFU: (q: string) => void;
  cq?: string; setCQ?: (v: string) => void; onCS?: () => void; compact?: boolean;
  onAttrClick?: (name: string) => void;
}) {
  return (
    <div className={compact ? styles.sc2 : styles.sc}>
      <CopyBtn text={formatSynthAsMarkdown(s)} label="종합 복사" />
      <div className={styles.stag}>✦ Mediator Synthesis</div>
      {s._truncated && (
        <div className={styles.tbox} style={{ marginBottom: 14 }}>⚠ 종합 답변이 토큰 한도로 잘렸을 수 있습니다.</div>
      )}
      <div className={styles.bl}>종합 답변</div>
      <div className={styles.bb}><Clamp lines={10}><MD c={s.bestAnswer} /></Clamp></div>
      <div className={styles.sg}>
        <div><div className={styles.sl}>공통된 관점</div><div className={styles.st}><MD c={s.agreement} /></div></div>
        <div><div className={styles.sl}>고유한 인사이트</div><div className={styles.st}><MD c={s.uniqueInsights} /></div></div>
      </div>
      {s.contradictions && s.contradictions !== "없음" && (
        <div style={{ marginBottom: 14 }}>
          <div className={styles.sl}>모순 및 이견</div>
          <div className={`${styles.st} ${styles.warn}`}><MD c={s.contradictions} /></div>
        </div>
      )}
      {Object.keys(s.attributions || {}).length > 0 && (
        <div style={{ marginBottom: 4 }}>
          <div className={styles.sl}>모델별 기여 {onAttrClick && <span style={{ textTransform: "none", letterSpacing: 0, fontSize: 10, color: "var(--fg-muted)", marginLeft: 6 }}>(클릭하면 해당 모델 답변으로 이동)</span>}</div>
          <div className={styles.alist}>
            {Object.entries(s.attributions).map(([name, note]) => {
              const m = MODELS.find(x => x.name === name || x.short === name);
              const c = m?.color || "#5a7090";
              return (
                <div key={name} className={styles.aitem}>
                  <button
                    type="button"
                    className={styles.abadge}
                    style={{ color: c, borderColor: `${c}60`, background: `${c}12` }}
                    onClick={() => onAttrClick?.(name)}
                    disabled={!onAttrClick || !m}
                  >{name}</button>
                  <span className={styles.anote}>{note}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
      <div className={styles.fus}>
        <div className={styles.fl}>제안 후속 질문</div>
        {(s.followUps || []).map((q, i) => (
          <button key={i} className={styles.fb} onClick={() => onFU(q)}>
            <span className={styles.fa}>→</span><span>{q}</span>
          </button>
        ))}
        {setCQ && onCS && (
          <>
            <div className={styles.fl} style={{ marginTop: 14 }}>직접 입력</div>
            <div className={styles.crow}>
              <input className={styles.ci} placeholder="후속 질문을 직접 입력하세요..."
                value={cq || ""} onChange={e => setCQ(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && cq?.trim()) onCS?.(); }} />
              <button className={styles.cb} onClick={onCS} disabled={!cq?.trim()}>→</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Thread turn block (synthesis first + collapsible individual answers) ─────
function TurnBlock({ turn, showQBadge, qIdx, onFollowUp, isLast, cq, setCQ, onContinue, collapsedByDefault }: {
  turn: Turn; showQBadge: boolean; qIdx: number;
  onFollowUp: (q: string) => void;
  isLast?: boolean;
  cq?: string;
  setCQ?: (v: string) => void;
  onContinue?: () => void;
  collapsedByDefault?: boolean;
}) {
  const detRef = useRef<HTMLDetailsElement>(null);
  const responseIds = Object.keys(turn.responses).filter(id => MODELS.find(m => m.id === id));
  const [activeIdx, setActiveIdx] = useState(0);
  const [expanded, setExpanded] = useState(!collapsedByDefault);

  const handleAttrClick = (name: string) => {
    const m = MODELS.find(x => x.name === name || x.short === name);
    if (!m) return;
    const idx = responseIds.indexOf(m.id);
    if (idx < 0) return;
    setActiveIdx(idx);
    if (detRef.current) {
      detRef.current.open = true;
      setTimeout(() => detRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 60);
    }
  };

  const respMap: Record<string, MR> = Object.fromEntries(
    responseIds.map(id => [id, { status: "done" as const, content: turn.responses[id].content, truncated: turn.responses[id].truncated }])
  );

  if (!expanded) {
    const preview = turn.question.length > 90 ? turn.question.slice(0, 90) + "…" : turn.question;
    return (
      <button type="button" className={styles.tblkCol} onClick={() => setExpanded(true)}>
        <span className={styles.tblkColIcon}>▸</span>
        {showQBadge && <span className={styles.tqn}>Q{qIdx + 1}</span>}
        <span className={styles.tblkColQ}>{preview}</span>
        <span className={styles.tblkColHint}>펼치기</span>
      </button>
    );
  }

  return (
    <div className={styles.tblk}>
      <CopyBtn text={formatTurnAsMarkdown(turn)} label="턴 전체 복사" />
      {collapsedByDefault && (
        <button type="button" className={styles.collapseBtn} onClick={() => setExpanded(false)}>▴ 접기</button>
      )}
      <div className={styles.tq}>
        {showQBadge && <span className={styles.tqn}>Q{qIdx + 1}</span>}
        <div className={styles.tqText}><Clamp lines={10}>{turn.question}</Clamp></div>
      </div>
      {turn.synthesis && (
        <SynthPanel
          s={turn.synthesis}
          onFU={onFollowUp}
          compact
          onAttrClick={handleAttrClick}
          cq={isLast ? cq : undefined}
          setCQ={isLast ? setCQ : undefined}
          onCS={isLast ? onContinue : undefined}
        />
      )}
      {responseIds.length > 0 && (
        <details ref={detRef} className={styles.detWrap}>
          <summary className={styles.detSum}>개별 모델 답변 ({responseIds.length}개)</summary>
          <div className={styles.detBody}>
            <Tabs sel={responseIds} resp={respMap} qk={qIdx} activeIdx={activeIdx} setActiveIdx={setActiveIdx} />
          </div>
        </details>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Home() {
  const [q, setQ] = useState("");
  const [cq, setCQ] = useState("");
  const [sel, setSel] = useState(MODELS.map(m => m.id));
  const [mid, setMid] = useState("anthropic");
  const [resp, setResp] = useState<Record<string, MR>>({});
  const [synth, setSynth] = useState<Syn | null>(null);
  const [phase, setPhase] = useState<"idle" | "q" | "s" | "done">("idle");
  const [qk, setQk] = useState(0);
  const [err, setErr] = useState("");
  const [threads, setThreads] = useState<Thread[]>([]);
  const [aThread, setAThread] = useState<Thread | null>(null);
  const [vThread, setVThread] = useState<Thread | null>(null);
  const [sbOpen, setSbOpen] = useState(true);
  const [searchQ, setSearchQ] = useState("");
  const openThread = (t: Thread) => { tref.current = t; setVThread(t); setSbOpen(false); };
  const sref = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const tref = useRef<Thread | null>(null);

  useEffect(() => { setThreads(loadAll()); }, []);
  useEffect(() => {
    if (synth) setTimeout(() => sref.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 300);
  }, [synth]);

  const selMed = MEDIATORS.find(m => m.id === mid) || MEDIATORS[0];

  const run = async (question: string) => {
    const tq = question.trim();
    if (!tq) { setErr("질문을 입력해주세요."); return; }
    if (sel.length < 2) { setErr("최소 2개 모델을 선택해주세요."); return; }
    setVThread(null); setErr(""); setResp({}); setSynth(null);
    setPhase("q"); setQ(tq); setCQ(""); setQk(k => k + 1);
    const init: Record<string, MR> = {};
    sel.forEach(id => { init[id] = { status: "loading", content: "" }; });
    setResp(init);

    const priorTurns = (tref.current?.turns ?? []).slice(-HISTORY_LIMIT);

    const results: { id: string; name: string; content: string; truncated: boolean }[] = [];
    await Promise.allSettled(sel.map(async id => {
      const mo = MODELS.find(m => m.id === id); if (!mo) return;
      const history = priorTurns
        .map(t => {
          const r = t.responses[id];
          return r?.content ? { question: t.question, answer: r.content } : null;
        })
        .filter((h): h is { question: string; answer: string } => h !== null);
      try {
        const res = await fetch("/api/query", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ modelId: id, question: tq, history }) });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        const truncated = !!data.truncated;
        setResp(p => ({ ...p, [id]: { status: "done", content: data.content || "", truncated } }));
        results.push({ id, name: mo.name, content: data.content || "", truncated });
      } catch (e: unknown) {
        setResp(p => ({ ...p, [id]: { status: "error", content: e instanceof Error ? e.message : "error" } }));
      }
    }));
    if (!results.length) { setErr("모든 모델 호출 실패"); setPhase("done"); return; }
    setPhase("s");
    const synthHistory = priorTurns
      .filter(t => t.synthesis?.bestAnswer)
      .map(t => ({ question: t.question, bestAnswer: t.synthesis!.bestAnswer }));
    try {
      const res = await fetch("/api/synthesize", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: tq, modelResponses: results, mediatorId: mid, history: synthHistory }) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSynth(data);
      const turn: Turn = { question: tq, responses: Object.fromEntries(results.map(r => [r.id, { status: "done", content: r.content, truncated: r.truncated }])), synthesis: data };
      const prev = tref.current;
      const thread: Thread = prev ? { ...prev, turns: [...prev.turns, turn] } : { id: String(Date.now()), title: tq.slice(0, 70), createdAt: Date.now(), turns: [turn] };
      tref.current = thread; setAThread(thread); saveOne(thread); setThreads(loadAll());
    } catch (e: unknown) {
      setErr("종합 분석 실패: " + (e instanceof Error ? e.message : "unknown"));
    }
    setPhase("done");
  };

  const newT = () => {
    setQ(""); setResp({}); setSynth(null); setPhase("idle"); setErr(""); setCQ("");
    setAThread(null); setVThread(null); tref.current = null;
  };
  const delT = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); setThreads(removeOne(id));
    if (vThread?.id === id) setVThread(null);
    if (aThread?.id === id) { setAThread(null); tref.current = null; }
  };

  const isRunning = phase === "q" || phase === "s";

  const filteredThreads = searchQ.trim()
    ? threads.filter(t => t.title.toLowerCase().includes(searchQ.trim().toLowerCase()))
    : threads;
  const sidebar = (
    <aside className={`${styles.sb} ${sbOpen ? styles.sbOpen : styles.sbClosed}`}>
      <div className={styles.sbtop}>
        <button className={styles.newbtn} onClick={newT}>＋ 새 탐구</button>
        {threads.length > 0 && (
          <input
            className={styles.search}
            placeholder="제목 검색..."
            value={searchQ}
            onChange={e => setSearchQ(e.target.value)}
          />
        )}
      </div>
      <div className={styles.tlist}>
        {threads.length === 0 && <div className={styles.empty}>저장된 탐구가 없어요</div>}
        {threads.length > 0 && filteredThreads.length === 0 && <div className={styles.empty}>검색 결과 없음</div>}
        {filteredThreads.map(t => {
          const isA = t.id === (vThread?.id || aThread?.id || "");
          return (
            <div key={t.id} className={`${styles.ti} ${isA ? styles.tiA : ""}`} onClick={() => openThread(t)}>
              <div className={styles.tt}>{t.title}</div>
              <div className={styles.tm}>{t.turns.length}턴 · {new Date(t.createdAt).toLocaleDateString("ko")}</div>
              <button className={styles.del} onClick={e => delT(t.id, e)}>×</button>
            </div>
          );
        })}
      </div>
    </aside>
  );

  const header = (
    <header className={styles.hdr}>
      <button className={styles.sbtg} onClick={() => setSbOpen(p => !p)}>{sbOpen ? "◀" : "▶"}</button>
      <div className={styles.logo}><span className={styles.lgn}>coThink</span><span className={styles.lgt}>MULTI-MODEL REASONING</span></div>
      <div className={styles.mtag} style={{ color: selMed.color, borderColor: `${selMed.color}40`, background: `${selMed.color}10` }}>✦ mediator: {selMed.name}</div>
    </header>
  );

  // Thread view
  if (vThread) return (
    <div className={styles.app} data-sb={sbOpen ? "1" : "0"}>
      {sidebar}
      <div className={styles.main}>{header}
        <div className={styles.scroll} ref={scrollRef}>
          <div className={styles.tvhdr}>
            <div className={styles.tvmeta}>
              {vThread.turns.length}턴 · {new Date(vThread.createdAt).toLocaleDateString("ko")}
            </div>
          </div>
          {vThread.turns.map((turn, ti) => {
            const last = ti === vThread.turns.length - 1;
            return (
              <TurnBlock
                key={ti}
                turn={turn}
                qIdx={ti}
                showQBadge={vThread.turns.length > 1}
                isLast={last}
                collapsedByDefault={!last}
                cq={cq}
                setCQ={setCQ}
                onContinue={() => {
                  if (!cq.trim() || !vThread) return;
                  tref.current = vThread;
                  setAThread(vThread);
                  setVThread(null);
                  setSbOpen(true);
                  const text = cq;
                  setCQ("");
                  void run(text);
                }}
                onFollowUp={fq => {
                  tref.current = vThread;
                  setAThread(vThread);
                  setVThread(null);
                  setSbOpen(true);
                  void run(fq);
                }}
              />
            );
          })}
        </div>
      </div>
      <ScrollNav scrollRef={scrollRef} />
    </div>
  );

  // Active session
  const isCurrentDisplayed = phase === "done" && !!synth;
  const priorTurnsToShow = aThread
    ? (isCurrentDisplayed ? aThread.turns.slice(0, -1) : aThread.turns)
    : [];

  return (
    <div className={styles.app} data-sb={sbOpen ? "1" : "0"}>
      {sidebar}
      <div className={styles.main}>{header}
        <div className={styles.scroll} ref={scrollRef}>
          <div className={styles.ses}>
            <div className={styles.panel}>
              <div className={styles.plabel}>Models — {sel.length} / {MODELS.length}</div>
              <div className={styles.chips}>
                {MODELS.map(m => { const on = sel.includes(m.id); return (
                  <button key={m.id} className={styles.chip} onClick={() => setSel(p => p.includes(m.id) ? p.filter(x => x !== m.id) : [...p, m.id])}
                    style={{ borderColor: on ? m.color : "#151f30", color: on ? m.color : "#3a5270", background: on ? `${m.color}12` : "transparent" }}>{m.short}</button>
                ); })}
              </div>
            </div>
            <div className={styles.panel}>
              <div className={styles.plabel}>Mediator — 종합 분석 모델 (질문마다 변경 가능)</div>
              <div className={styles.chips}>
                {MEDIATORS.map(m => { const on = mid === m.id; return (
                  <button key={m.id} className={styles.chip} onClick={() => setMid(m.id)}
                    style={{ borderColor: on ? m.color : "#151f30", color: on ? m.color : "#3a5270", background: on ? `${m.color}12` : "transparent" }}>{on ? "✦ " : ""}{m.short}</button>
                ); })}
              </div>
            </div>
            {priorTurnsToShow.length > 0 && (
              <div className={styles.priorList}>
                <div className={styles.priorLabel}>이전 질문 {priorTurnsToShow.length}개 — 클릭해 펼쳐 보기</div>
                {priorTurnsToShow.map((turn, ti) => (
                  <TurnBlock
                    key={`prior-${ti}`}
                    turn={turn}
                    qIdx={ti}
                    showQBadge
                    collapsedByDefault
                    onFollowUp={fq => void run(fq)}
                  />
                ))}
              </div>
            )}
            {aThread && (
              <div className={styles.tctx}>
                <span>쓰레드 {aThread.turns.length}번째 질문 — <em>{aThread.title.slice(0, 40)}{aThread.title.length > 40 ? "..." : ""}</em></span>
                <button onClick={newT}>새 쓰레드</button>
              </div>
            )}
            <div className={styles.qw}>
              <textarea className={styles.qa} placeholder="질문을 입력하세요" value={q}
                onChange={e => setQ(e.target.value)}
                onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") void run(q); }} />
              <div className={styles.qact}>
                <button className={styles.run} onClick={() => void run(q)} disabled={isRunning}>{isRunning ? "실행 중..." : "→ coThink"}</button>
                {Object.keys(resp).length > 0 && <button className={styles.newq} onClick={newT}>새 질문</button>}
                <span className={styles.hint}>⌘↵</span>
              </div>
            </div>
            {err && <div className={styles.ebox}>⚠ {err}</div>}
            {isRunning && (
              <div className={styles.pbar}><div className={styles.spin} />
                {phase === "q" ? `${sel.length}개 모델에 동시 질의 중...` : `${selMed.name}이(가) 종합 분석 중...`}
              </div>
            )}
            {Object.keys(resp).length > 0 && <Tabs sel={sel} resp={resp} qk={qk} />}
            {synth && (
              <div ref={sref}>
                <SynthPanel s={synth} onFU={fq => void run(fq)} cq={cq} setCQ={setCQ} onCS={() => { if (cq.trim()) void run(cq); }} />
              </div>
            )}
          </div>
        </div>
      </div>
      <ScrollNav scrollRef={scrollRef} />
    </div>
  );
}
