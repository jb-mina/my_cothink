"use client";

import { useEffect, useState } from "react";
import styles from "./landing.module.css";

type FormStatus = "idle" | "loading" | "ok" | "already" | "err";
type FormState = { email: string; status: FormStatus; msg: string };
const initForm: FormState = { email: "", status: "idle", msg: "" };

const MODELS = [
  { name: "GPT-4o",            vendor: "OpenAI",      mono: "G", color: "#10a37f" },
  { name: "GPT-4.1",           vendor: "OpenAI",      mono: "G", color: "#0d8a6a" },
  { name: "Claude Sonnet 4",   vendor: "Anthropic",   mono: "C", color: "#d97757" },
  { name: "Claude Opus 4",     vendor: "Anthropic",   mono: "C", color: "#b85a3e" },
  { name: "Gemini 2.5 Pro",    vendor: "Google",      mono: "G", color: "#4285f4" },
  { name: "Grok 4.1 Fast",     vendor: "xAI",         mono: "X", color: "#1c1816" },
  { name: "Perplexity Sonar Pro", vendor: "Perplexity", mono: "P", color: "#20808d" },
  { name: "DeepSeek V3",       vendor: "DeepSeek",    mono: "D", color: "#4d6bfe" },
];

async function submitEmail(email: string): Promise<{ status: FormStatus; msg: string }> {
  const trimmed = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return { status: "err", msg: "올바른 이메일 주소를 입력해주세요." };
  }
  try {
    const res = await fetch("/api/invitation-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: trimmed }),
    });
    const data = await res.json();
    if (!res.ok) return { status: "err", msg: data?.error || "요청을 처리하지 못했어요." };
    if (data.alreadyApproved) return { status: "already", msg: "이미 승인된 이메일이에요. 메일함에서 접속 코드를 확인해 주세요." };
    if (data.alreadyRequested) return { status: "already", msg: "이미 요청이 접수되어 있어요. 검토 후 곧 연락드릴게요." };
    return { status: "ok", msg: "초대 요청이 접수됐어요. 검토 후 이메일로 접속 코드를 보내드립니다." };
  } catch {
    return { status: "err", msg: "네트워크 오류가 발생했어요. 잠시 후 다시 시도해 주세요." };
  }
}

export default function LandingPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [heroForm, setHeroForm] = useState<FormState>(initForm);
  const [ctaForm, setCtaForm] = useState<FormState>(initForm);
  const [modalForm, setModalForm] = useState<FormState>(initForm);

  useEffect(() => {
    if (!modalOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setModalOpen(false); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [modalOpen]);

  const openModal = (prefill?: string) => {
    setModalForm({ email: prefill || "", status: "idle", msg: "" });
    setModalOpen(true);
  };

  const handleSubmit = async (
    form: FormState,
    setForm: (s: FormState) => void,
  ) => {
    setForm({ ...form, status: "loading", msg: "" });
    const result = await submitEmail(form.email);
    setForm({ ...form, ...result });
  };

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className={styles.page}>
      {/* ── Nav ───────────────────────────────────────────────────────── */}
      <nav className={styles.nav}>
        <div className={`${styles.container} ${styles.navInner}`}>
          <div className={styles.brand}>
            <div className={styles.brandMark}>co</div>
            <div className={styles.brandName}>coThink</div>
          </div>
          <div className={styles.navLinks}>
            <button className={styles.navLink} onClick={() => scrollTo("why")}>주요 기능</button>
            <button className={styles.navLink} onClick={() => scrollTo("how")}>원리</button>
            <button className={styles.navLink} onClick={() => scrollTo("use")}>활용 사례</button>
            <button className={styles.navLink} onClick={() => scrollTo("models")}>지원 모델</button>
          </div>
          <div className={styles.navActions}>
            <a className={styles.navLogin} href="/login">로그인</a>
            <button className={styles.navCta} onClick={() => openModal()}>초대장 받기</button>
          </div>
        </div>
      </nav>

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className={styles.hero}>
        <div className={styles.container}>
          <div className={styles.heroGrid}>
            <div>
              <div className={styles.label}>MULTI-MODEL REASONING</div>
              <h1 className={styles.h1}>
                중요한 질문에는<br />
                하나의 모델로는<br />
                <span className={styles.hl}>부족합니다.</span>
              </h1>
              <p className={styles.lead} style={{ marginTop: 24 }}>
                coThink는 더 빠른 답을 주는 도구가 아닙니다. 여러 AI 모델을 동시에 대조·종합하는 판단 환경입니다.
                답 하나가 아닌, 구조가 필요한 순간에 씁니다.
              </p>
              <div className={styles.heroCta}>
                <button className={styles.btnPrimary} onClick={() => openModal(heroForm.email)}>초대장 받기 →</button>
                <span className={styles.heroNote}>2분이면 요청 완료</span>
              </div>
              <div className={styles.heroSub}>초대 코드 발급 후 이용 가능 · 스레드는 브라우저에만 저장됩니다</div>
            </div>

            <div className={styles.mockWrap}>
              <div className={styles.heroPanel}>
                <div className={styles.heroPanelHead}>
                  <span className={styles.heroPanelDots}>
                    <span /><span /><span />
                  </span>
                  <span className={styles.heroPanelTitle}>MULTI-MODEL REASONING</span>
                  <span className={styles.heroPanelMed}>mediator: Claude</span>
                </div>
                <div className={styles.heroQ}>
                  <span className={styles.heroQLabel}>▸ 질문</span>
                  <p>여러 AI에게 동시에 묻는 것이 왜 더 나은가?</p>
                </div>
                <div className={styles.heroAnswers}>
                  {[
                    { name: "GPT-4o",               color: "#10a37f", text: "비교 분석은 의사결정 품질을 30% 이상 향상시킨다는 연구가…" },
                    { name: "Gemini 3 Flash",       color: "#4285f4", text: "다중 관점 추론은 단일 모델 편향을 줄이는 가장 효과적인…" },
                    { name: "Claude Sonnet 4",      color: "#d97757", text: "여러 모델의 응답을 구조화하여 종합하면 더 신뢰성 있는…" },
                    { name: "Perplexity Sonar Pro", color: "#20808d", text: "최근 메타 분석에 따르면, 앙상블 추론은 정확도를…" },
                    { name: "Grok 4.1 Fast",        color: "#e8562a", text: "1) 편향 감소 2) 누락 보완 3) 모순 발견 — 핵심 이점." },
                  ].map((m, i) => (
                    <div key={m.name} className={styles.heroAnswer} style={{ animationDelay: `${i * 0.18}s` }}>
                      <div className={styles.heroAnswerBadge} style={{ color: m.color, background: `${m.color}14`, borderColor: `${m.color}40` }}>
                        <span className={styles.heroAnswerDot} style={{ background: m.color }} />
                        {m.name}
                      </div>
                      <div className={styles.heroAnswerText}>{m.text}</div>
                    </div>
                  ))}
                </div>
                <div className={styles.heroSynth}>
                  <div className={styles.heroSynthLabel}>+ MEDIATOR SYNTHESIS</div>
                  <div className={styles.heroSynthBody}>
                    5개 모델 모두 <strong>편향 감소</strong>를 핵심 이점으로 꼽았으며, Grok과 Perplexity는 정량 데이터를, Claude는 구조화 방법론을 강조했습니다.
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.personas}>
            {[
              { tag: "리서처·애널리스트",   line: "관점의 다양성을 검증해야 할 때" },
              { tag: "의사 결정권자",        line: "근거의 일치와 충돌을 한눈에" },
              { tag: "AI 파워 유저",         line: "모델별 차이를 직접 비교" },
              { tag: "창업가·독립 전문가",   line: "혼자 사고하기엔 너무 큰 결정" },
            ].map((p) => (
              <div key={p.tag} className={styles.persona}>
                <div className={styles.personaLabel}>FOR</div>
                <div className={styles.personaTag}>{p.tag}</div>
                <div className={styles.personaLine}>{p.line}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why (problem + comparison) ───────────────────────────────── */}
      <section id="why" className={styles.section}>
        <div className={styles.container}>
          <div className={styles.whyHead}>
            <div className={styles.label}>왜 여러 모델이 필요한가</div>
            <h2 className={styles.h2}>
              AI는 확신에 차 있지만,<br />
              그 확신에는<br />
              <span className={styles.hl}>맹점이 있습니다.</span>
            </h2>
            <p className={styles.lead} style={{ marginTop: 24 }}>
              모든 모델은 자기만의 사각지대가 있습니다. 학습 데이터의 편향, 누락된 최신 정보, 미묘하게 다른 추론 스타일.
              한 모델만 보면, 무엇을 놓쳤는지조차 알 수 없습니다.
            </p>
          </div>

          <div className={styles.compareGrid}>
            <div className={styles.compareBox}>
              <div className={styles.compareLabel}>현재 — 단일 모델 사고</div>
              <ol className={styles.compareList}>
                <li><span className={styles.compareNum}>01</span><span>한 모델의 답이 맞는지 다른 탭을 열어 다시 묻는다.</span></li>
                <li><span className={styles.compareNum}>02</span><span>응답을 머릿속에서 비교하며 어디가 다른지 추측한다.</span></li>
                <li><span className={styles.compareNum}>03</span><span>모순이 있어도 알아채지 못하고 넘어간다.</span></li>
                <li><span className={styles.compareNum}>04</span><span>결국 가장 ‘듣기 좋은 답’을 무의식적으로 선택한다.</span></li>
              </ol>
            </div>
            <div className={`${styles.compareBox} ${styles.compareBoxOn}`}>
              <div className={styles.compareLabel}>coThink — 다관점 추론</div>
              <ol className={styles.compareList}>
                <li><span className={styles.compareNum}>01</span><span>한 번 묻고, 5개의 관점을 한 화면에서 받는다.</span></li>
                <li><span className={styles.compareNum}>02</span><span>중재자가 일치점·모순점·고유 인사이트를 분리한다.</span></li>
                <li><span className={styles.compareNum}>03</span><span>모델 간 의견이 갈리는 곳을 명시적으로 본다.</span></li>
                <li><span className={styles.compareNum}>04</span><span>구조화된 종합을 토대로 스스로 판단한다.</span></li>
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* ── coThink approach (preview + 6 cards) ─────────────────────── */}
      <section id="output" className={styles.section} style={{ background: "#fff" }}>
        <div className={styles.container}>
          <div className={styles.outCenter}>
            <div className={styles.label}>coThink의 접근</div>
            <h2 className={styles.h2}>
              응답이 아닌,<br />
              <span className={styles.hl}>판단 가능한 구조</span>를 받습니다.
            </h2>
            <p className={styles.lead} style={{ marginTop: 20 }}>
              일반 AI 채팅이 ‘긴 문단’을 돌려준다면, coThink는 판단에 필요한 구조를 돌려줍니다.
              어디에 동의하고, 어디서 갈리고, 무엇을 더 물어야 하는지가 한눈에 보이도록.
            </p>
          </div>

          <div className={styles.synthBox}>
            <div className={styles.synthHead}>
              <span className={styles.synthHeadLabel}>STRUCTURED SYNTHESIS</span>
              <span className={styles.synthHeadMed}>mediator: Claude Sonnet 4</span>
            </div>
            <div className={styles.synthBody}>
              <div className={styles.synthQ}>
                <span className={styles.synthQLabel}>▸ 질문</span>
                <p>B2B SaaS 신제품의 첫 타겟 시장으로 어디를 노려야 할까?</p>
              </div>
              <div className={styles.synthChips}>
                {[
                  { n: "GPT-4o",               c: "#10a37f" },
                  { n: "Gemini 3 Flash",       c: "#4285f4" },
                  { n: "Claude Sonnet 4",      c: "#d97757" },
                  { n: "Perplexity Sonar Pro", c: "#20808d" },
                  { n: "Grok 4.1 Fast",        c: "#e8562a" },
                ].map((m) => (
                  <span key={m.n} className={styles.synthChip} style={{ color: m.c, background: `${m.c}14`, borderColor: `${m.c}40` }}>
                    <span className={styles.synthChipDot} style={{ background: m.c }} />
                    {m.n}
                  </span>
                ))}
              </div>
              <div className={styles.synthRow}>
                <div className={styles.synthRowLabel} style={{ color: "#3a8a4f" }}>+ AGREEMENT</div>
                <div className={styles.synthRowText}>5개 모델 모두 ‘리서처·애널리스트’를 우선 타겟으로 지목.</div>
              </div>
              <div className={styles.synthRow} style={{ borderLeftColor: "#c23d1a" }}>
                <div className={styles.synthRowLabel} style={{ color: "#c23d1a" }}>+ CONTRADICTION</div>
                <div className={styles.synthRowText}>가격 민감도 평가가 모델 간 갈림 — 검증 필요.</div>
              </div>
              <div className={styles.synthRow} style={{ borderLeftColor: "var(--accent)" }}>
                <div className={styles.synthRowLabel} style={{ color: "var(--accent)" }}>+ BEST ANSWER</div>
                <div className={styles.synthRowText}><strong>MVP는 리서처 타겟, 월 $29 단일 플랜으로 시작.</strong></div>
              </div>
            </div>
            <div className={styles.synthFollow}>
              <span className={styles.synthFollowLabel}>▸ FOLLOW-UPS</span>
              <span className={styles.synthFollowChip}>가격 민감도 검증법은? →</span>
              <span className={styles.synthFollowChip}>경쟁 제품의 약점은? →</span>
              <span className={styles.synthFollowChip}>GTM 채널은? →</span>
            </div>
          </div>

          <div className={styles.outGrid2}>
            {[
              { n: "01", en: "AGREEMENT",       ko: "일치점",       desc: "모든 모델이 동의한 사실. 가장 신뢰도 높은 출발점.",        ex: "5개 모델 모두 ‘초기 시장은 B2B SaaS 리서처’를 1순위로 지목.",   c: "#3a8a4f" },
              { n: "02", en: "UNIQUE INSIGHTS", ko: "독창적 통찰",  desc: "한 모델만 짚어낸 관점. 사각지대를 메우는 단서.",            ex: "Perplexity: 최근 Gartner 리포트에서 ‘ensemble reasoning’ 언급 +212% YoY.", c: "#4285f4" },
              { n: "03", en: "CONTRADICTIONS",  ko: "모순점",       desc: "모델 간 의견이 갈리는 지점. 스스로 판단해야 할 곳.",       ex: "Grok은 가격 민감도를 ‘낮음’, Claude는 ‘중간 이상’으로 평가.",   c: "#c23d1a" },
              { n: "04", en: "BEST ANSWER",     ko: "최선의 답",    desc: "중재자가 모든 응답을 가중·종합한 단일 결론.",              ex: "→ MVP는 리서처/애널리스트 타겟, 월 $29 단일 플랜으로 시작 권장.", c: "var(--accent)" },
              { n: "05", en: "ATTRIBUTIONS",    ko: "원인 분석",    desc: "어떤 모델이, 어느 근거로 무엇을 기여했는지 매핑.",         ex: "근거 A → GPT, Claude · 근거 B → Perplexity · 반론 → Grok", c: "var(--accent)" },
              { n: "06", en: "FOLLOW-UPS",      ko: "후속 질문",    desc: "사고를 다음 단계로 끌어가는 3개의 제안 질문.",             ex: "1) 가격 민감도 검증법은? 2) 경쟁 제품의 약점은? 3) GTM 채널은?",  c: "#4285f4" },
            ].map((card) => (
              <div key={card.n} className={styles.outCard2}>
                <div className={styles.outCard2Head}>
                  <span className={styles.outCard2Bullet} style={{ background: card.c }} />
                  <span className={styles.outCard2Num}>{card.n}</span>
                  <span className={styles.outCard2Sep}>·</span>
                  <span className={styles.outCard2En} style={{ color: card.c }}>{card.en}</span>
                  <span className={styles.outCard2Ko}>{card.ko}</span>
                </div>
                <div className={styles.outCard2Desc}>{card.desc}</div>
                <div className={styles.outCard2Ex} style={{ borderLeftColor: card.c }}>{card.ex}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Use cases ─────────────────────────────────────────────────── */}
      <section id="use" className={styles.section}>
        <div className={styles.container}>
          <div className={styles.useHeadGrid}>
            <div>
              <div className={styles.label}>활용 사례</div>
              <h2 className={styles.h2}>
                판단이 필요한<br />
                <span className={styles.hl}>모든 순간에.</span>
              </h2>
            </div>
            <p className={styles.lead}>
              coThink는 결정을 빠르게 만드는 도구가 아니라, 결정을 잘 내리기 위한 사고 환경입니다. 혼자
              중요한 판단을 책임져야 할 때 펼쳐 보세요.
            </p>
          </div>
          <div className={styles.useGrid}>
            <div className={styles.useCard}>
              <span className={styles.useTag}>strategy</span>
              <div className={styles.useTitle}>사업 전략 검토</div>
              <div className={styles.useBody}>
                가격 모델 · 시장 진입 타이밍 · 리소스 배분처럼 반론이 필요한 결정을 여러 관점으로 빠르게 대조합니다.
              </div>
            </div>
            <div className={styles.useCard}>
              <span className={styles.useTag}>learning</span>
              <div className={styles.useTitle}>복잡한 개념 신속 학습</div>
              <div className={styles.useBody}>
                낯선 도메인을 다룰 때 다른 모델의 설명을 함께 봄으로써 한쪽 치우침 없이 핵심을 짚습니다.
              </div>
            </div>
            <div className={styles.useCard}>
              <span className={styles.useTag}>review</span>
              <div className={styles.useTitle}>글·제안서 약점 점검</div>
              <div className={styles.useBody}>
                본인이 쓴 글이나 제안서를 넣고 비판적 피드백을 수집합니다. 매끈한 동의 대신 다른 시각의 반론을 받을 수 있습니다.
              </div>
            </div>
            <div className={styles.useCard}>
              <span className={styles.useTag}>research</span>
              <div className={styles.useTitle}>리서치 관점 다각화</div>
              <div className={styles.useBody}>
                한 모델이 놓친 프레임·참고 자료·반례를 다른 모델이 채워 줍니다. 리서치 시작 단계에 특히 유용합니다.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Social Proof ─────────────────────────────────────────────── */}
      <section className={styles.section} style={{ background: "#fff" }}>
        <div className={styles.container}>
          <div className={styles.spHead}>
            <div className={styles.label}>이미 시작한 사람들</div>
            <h2 className={styles.h2}>
              이미 1%의 이용자들은<br />
              <span className={styles.hl}>모델을 교차 검증합니다.</span>
            </h2>
            <p className={styles.lead} style={{ marginTop: 20 }}>
              단지 Tab을 오가며 불편하게 하고 있었을 뿐입니다. coThink는 그 흐름을 한 화면 안으로 가져옵니다.
            </p>
          </div>

          <div className={styles.testimonial}>
            <div className={styles.testimonialAvatar}>J</div>
            <div className={styles.testimonialBody}>
              <div className={styles.testimonialQuote}>
                “기획서 쓸 때 Gemini 답변만 믿고 썼다가 회의에서 깨진 적이 있죠. coThink로 빠르게 교차 검증하니
                다른 모델은 놓친 <strong>‘비용 리스크’</strong>를 중재자 모델이 알려주더군요.”
              </div>
              <div className={styles.testimonialMeta}>
                <span className={styles.testimonialName}>J</span>
                <span className={styles.testimonialDot}>·</span>
                <span className={styles.testimonialRole}>스타트업 PM</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works (3 steps) ───────────────────────────────────── */}
      <section id="how" className={styles.section}>
        <div className={styles.container}>
          <div className={styles.howCenter}>
            <div className={styles.label}>작동 방식</div>
            <h2 className={styles.h2}>
              세 단계로 완성되는<br />
              <span className={styles.hl}>사고 흐름.</span>
            </h2>
          </div>
          <div className={styles.steps}>
            <div className={styles.stepsLine} />
            <div className={styles.step}>
              <div className={styles.stepCircle}>01</div>
              <div className={styles.stepTitle}>한 번 질문합니다</div>
              <div className={styles.stepBody}>
                질문을 한 번만 적으면 선택한 여러 모델에 동시에 전달됩니다. 탭을 오가며 같은 질문을 반복할 필요가 없습니다.
              </div>
            </div>
            <div className={styles.step}>
              <div className={`${styles.stepCircle} ${styles.stepActive}`}>02</div>
              <div className={styles.stepTitle}>차이를 드러냅니다</div>
              <div className={styles.stepBody}>
                중재자 모델이 응답을 공통점·고유 관점·모순의 축으로 해체합니다. 어디서 동의하고 어디서 갈리는지가 먼저 보입니다.
              </div>
            </div>
            <div className={styles.step}>
              <div className={styles.stepCircle}>03</div>
              <div className={styles.stepTitle}>구조화된 판단을 받습니다</div>
              <div className={styles.stepBody}>
                종합된 결론 · 기여 매핑 · 후속 질문까지 한 번에. 결정을 내리기 위한 재료가 같은 형식으로 정리됩니다.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Models ─────────────────────────────────────────────────────── */}
      <section id="models" className={styles.section} style={{ background: "#fff" }}>
        <div className={styles.container}>
          <div className={styles.modelsGrid}>
            <div>
              <div className={styles.label}>지원 모델</div>
              <h2 className={styles.h2}>
                프론티어 모델을<br />
                <span className={styles.hl}>한 화면에서.</span>
              </h2>
              <p className={styles.lead} style={{ marginTop: 20 }}>
                Anthropic · OpenAI · Google · xAI · Perplexity · DeepSeek 등 주요 벤더의 최신 모델을 같은 인터페이스로
                호출하고 비교합니다. 추가되는 모델은 즉시 선택지에 반영됩니다.
              </p>
            </div>
            <div>
              <div className={styles.pills}>
                {MODELS.map((m) => (
                  <div key={m.name} className={styles.pill}>
                    <div className={styles.pillMono} style={{ background: m.color }}>{m.mono}</div>
                    <div className={styles.pillText}>
                      <div className={styles.pillName}>{m.name}</div>
                      <div className={styles.pillVendor}>{m.vendor}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className={styles.pillsNote}>
                · 기본 중재자: Claude Sonnet 4 · 질의 대상은 자유롭게 선택
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ──────────────────────────────────────────────────── */}
      <section className={styles.ctaWrap}>
        <div className={styles.container}>
          <h2 className={styles.ctaTitle}>
            더 빠른 답이 아니라,<br />
            <span className={styles.hl}>더 나은 판단을 위해.</span>
          </h2>
          <p className={styles.ctaLead}>
            coThink는 비공개 베타로 운영됩니다. 이메일을 남겨주시면 검토 후 접속 코드를 보내드려요.
          </p>
          <form
            className={styles.form}
            onSubmit={(e) => { e.preventDefault(); handleSubmit(ctaForm, setCtaForm); }}
          >
            <input
              className={styles.input}
              type="email"
              placeholder="you@example.com"
              value={ctaForm.email}
              onChange={(e) => setCtaForm({ ...ctaForm, email: e.target.value, status: "idle", msg: "" })}
              disabled={ctaForm.status === "loading" || ctaForm.status === "ok"}
              autoComplete="email"
            />
            <button
              type="submit"
              className={styles.btnPrimary}
              disabled={ctaForm.status === "loading" || ctaForm.status === "ok" || !ctaForm.email.trim()}
            >
              {ctaForm.status === "loading" ? "전송 중..." : "초대장 받기"}
            </button>
          </form>
          {ctaForm.status === "ok" && <div className={styles.formOk}>✓ {ctaForm.msg}</div>}
          {ctaForm.status === "already" && <div className={styles.formOk}>· {ctaForm.msg}</div>}
          {ctaForm.status === "err" && <div className={styles.formErr}>⚠ {ctaForm.msg}</div>}
          {ctaForm.status === "idle" && <div className={styles.formNote}>스팸 없이 발송 관련 메일만 보내드립니다.</div>}
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer className={styles.footer}>
        <div className={styles.container}>
          <div className={styles.footGrid}>
            <div>
              <div className={styles.footBrand}>
                <div className={styles.brandMark}>co</div>
                <div className={styles.brandName}>coThink</div>
              </div>
              <div className={styles.footTag}>
                답이 아니라 판단을 다듬는 사고 환경.
              </div>
            </div>
            <div className={styles.footCol}>
              <h4>Product</h4>
              <ul>
                <li><a onClick={() => scrollTo("why")}>주요 기능</a></li>
                <li><a onClick={() => scrollTo("how")}>작동 방식</a></li>
                <li><a onClick={() => scrollTo("use")}>활용 사례</a></li>
                <li><a onClick={() => scrollTo("models")}>지원 모델</a></li>
              </ul>
            </div>
            <div className={styles.footCol}>
              <h4>Access</h4>
              <ul>
                <li><a onClick={() => openModal()}>초대장 받기</a></li>
                <li><a href="/login">로그인</a></li>
              </ul>
            </div>
            <div className={styles.footCol}>
              <h4>Legal</h4>
              <ul>
                <li><a>서비스 약관</a></li>
                <li><a>개인정보 처리방침</a></li>
              </ul>
            </div>
          </div>
          <div className={styles.footBottom}>© {new Date().getFullYear()} coThink · Made in Seoul</div>
        </div>
      </footer>

      {/* ── Modal ──────────────────────────────────────────────────────── */}
      {modalOpen && (
        <div
          className={styles.modalBackdrop}
          onClick={(e) => { if (e.target === e.currentTarget) setModalOpen(false); }}
        >
          <div className={styles.modal} role="dialog" aria-modal="true">
            <button className={styles.modalClose} onClick={() => setModalOpen(false)} aria-label="닫기">×</button>
            <div className={styles.modalTitle}>초대장 받기</div>
            <div className={styles.modalLead}>
              이메일을 남겨주시면 검토 후 접속 코드를 보내드립니다. 코드로 로그인하면 바로 이용할 수 있어요.
            </div>
            <form
              className={styles.modalForm}
              onSubmit={(e) => { e.preventDefault(); handleSubmit(modalForm, setModalForm); }}
            >
              <input
                className={styles.input}
                type="email"
                placeholder="you@example.com"
                value={modalForm.email}
                onChange={(e) => setModalForm({ ...modalForm, email: e.target.value, status: "idle", msg: "" })}
                disabled={modalForm.status === "loading" || modalForm.status === "ok"}
                autoFocus
                autoComplete="email"
              />
              <button
                type="submit"
                className={styles.btnPrimary}
                disabled={modalForm.status === "loading" || modalForm.status === "ok" || !modalForm.email.trim()}
              >
                {modalForm.status === "loading" ? "전송 중..." : "요청 보내기"}
              </button>
            </form>
            {modalForm.status === "ok" && <div className={styles.formOk}>✓ {modalForm.msg}</div>}
            {modalForm.status === "already" && <div className={styles.formOk}>· {modalForm.msg}</div>}
            {modalForm.status === "err" && <div className={styles.formErr}>⚠ {modalForm.msg}</div>}
          </div>
        </div>
      )}
    </div>
  );
}
