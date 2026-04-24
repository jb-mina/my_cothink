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
              <div className={styles.mockup}>
                <div className={styles.mockHeader}>
                  <span className={styles.mockDot} />
                  <span className={styles.mockDot} />
                  <span className={styles.mockDot} />
                  <span className={styles.mockTitle}>cothink / thread</span>
                </div>
                <div className={styles.mockQ}>이 AI 모델이 동시에 답하는 이 질문 (3가지 모델)</div>
                <div className={styles.mockLabel}>
                  <span>MODELS · 5</span>
                  <span>1.8s</span>
                </div>
                <div className={styles.mockModels}>
                  {["GPT-4o", "Gemini 2.5 Pro", "Claude Sonnet 4", "Perplexity Sonar Pro", "Grok 4.1 Fast"].map((m, i) => (
                    <div key={m} className={styles.mockModel}>
                      <span>{m}</span>
                      <span className={styles.mockModelRight}>
                        {i < 3 ? (
                          <>
                            <span>done</span>
                            <span style={{ color: "#8dc573" }}>✓</span>
                          </>
                        ) : (
                          <>
                            <span>thinking</span>
                            <span className={styles.mockBar}><span /><span /><span /></span>
                          </>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
                <div className={styles.mockSynth}>▸ 중재자 종합: Claude Sonnet 4</div>
              </div>
              <div className={styles.mockBadge}>Made in Seoul</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Why (3 cards) ────────────────────────────────────────────── */}
      <section id="why" className={styles.section}>
        <div className={styles.container}>
          <div className={styles.whyGrid}>
            <div>
              <div className={styles.label}>왜 여러 모델이 필요한가</div>
              <h2 className={styles.h2}>
                AI는 확신에 차 있지만,<br />
                그 확신에는<br />
                <span className={styles.hl}>맹점이 있습니다.</span>
              </h2>
              <div className={styles.quote}>
                “답은 매끈해 보이지만, 근거가 빠져 있습니다. 그 위에 세운 다음 판단은 흔들립니다.”
              </div>
            </div>
            <div className={styles.cards}>
              <div className={styles.card}>
                <div className={styles.cardNum}>01</div>
                <div className={styles.cardTitle}>단일 관점의 맹점</div>
                <div className={styles.cardBody}>
                  하나의 모델은 학습 편향과 추론 습관을 공유합니다. 그럴듯한 일관성 뒤에 놓친 전제가 남아도 드러나지 않아요.
                </div>
              </div>
              <div className={styles.card}>
                <div className={styles.cardNum}>02</div>
                <div className={styles.cardTitle}>기준의 부재</div>
                <div className={styles.cardBody}>
                  답이 하나뿐이면 비교 기준이 없습니다. 어디까지가 사실이고 어디부터가 추정인지 구분하기 어렵습니다.
                </div>
              </div>
              <div className={styles.card}>
                <div className={styles.cardNum}>03</div>
                <div className={styles.cardTitle}>피드백 단절</div>
                <div className={styles.cardBody}>
                  반론이 없으면 생각은 넓어지지 않아요. 다른 관점이 들어오지 않은 채 결론이 굳어집니다.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Transformation (5 chips) ─────────────────────────────────── */}
      <section className={styles.section} style={{ background: "#fff" }}>
        <div className={styles.container}>
          <div className={styles.transGrid}>
            <div>
              <div className={styles.label}>coThink의 접근</div>
              <h2 className={styles.h2}>
                응답을 나열하지 않습니다.<br />
                <span className={styles.hl}>의사결정 구조로</span><br />
                재해석합니다.
              </h2>
              <p className={styles.lead} style={{ marginTop: 24 }}>
                coThink는 단순한 다중 AI 뷰어가 아닙니다. 여러 응답을 공통점·차이·모순의 층위로 해체하고,
                사람이 실제로 사고하는 순서대로 다시 쌓아 올립니다.
              </p>
            </div>
            <div className={styles.chips}>
              {[
                { n: "01", t: "하나의 질문 매핑", a: false },
                { n: "02", t: "여러 모델 병렬 질의", a: false },
                { n: "03", t: "차이 드러내기", a: false },
                { n: "04", t: "모순·전제 확인", a: true },
                { n: "05", t: "더 나은 판단으로", a: false },
              ].map((c) => (
                <div key={c.n} className={`${styles.chip} ${c.a ? styles.chipActive : ""}`}>
                  <div className={styles.chipBullet}>{c.n}</div>
                  <div>{c.t}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Output Structure (6 cards + code) ────────────────────────── */}
      <section id="output" className={styles.section}>
        <div className={styles.container}>
          <div className={styles.outCenter}>
            <div className={styles.label}>출력 구조</div>
            <h2 className={styles.h2}>
              응답이 아닌,<br />
              <span className={styles.hl}>판단 가능한 구조</span>를 받습니다.
            </h2>
            <p className={styles.lead} style={{ marginTop: 20 }}>
              중재자 모델은 수집된 응답을 6개 축으로 다시 정리합니다. 매번 같은 형태로 받기 때문에,
              다음 결정까지의 거리가 눈에 띄게 줄어듭니다.
            </p>
          </div>
          <div className={styles.outGrid}>
            <div className={styles.outCard}>
              <div className={styles.outLabel}>01 · AGREEMENT</div>
              <div className={styles.outTitle}>공통점</div>
              <div className={styles.outBody}>여러 모델이 공통적으로 동의하는 지점. 합의가 형성된 사실의 영역.</div>
            </div>
            <div className={styles.outCard}>
              <div className={styles.outLabel}>02 · UNIQUE INSIGHTS</div>
              <div className={styles.outTitle}>고유한 관점</div>
              <div className={styles.outBody}>특정 모델만 제시한 시각. 놓치기 쉬운 대안적 프레임을 붙잡아 둡니다.</div>
            </div>
            <div className={styles.outCard}>
              <div className={styles.outLabel}>03 · CONTRADICTIONS</div>
              <div className={styles.outTitle}>모순</div>
              <div className={styles.outBody}>서로 충돌하거나 전제가 다른 주장. 판단이 필요한 지점이 여기에 모입니다.</div>
            </div>
            <div className={styles.outCard}>
              <div className={styles.outLabel}>04 · BEST ANSWER</div>
              <div className={styles.outTitle}>종합된 답</div>
              <div className={styles.outBody}>위 내용을 반영해 중재자가 정리한 결론. 근거와 한계가 함께 기재됩니다.</div>
            </div>
            <div className={styles.outCard}>
              <div className={styles.outLabel}>05 · ATTRIBUTIONS</div>
              <div className={styles.outTitle}>기여 매핑</div>
              <div className={styles.outBody}>어떤 모델의 어떤 판단이 결론에 반영됐는지 역추적할 수 있게 기록합니다.</div>
            </div>
            <div className={styles.outCard}>
              <div className={styles.outLabel}>06 · FOLLOW-UPS</div>
              <div className={styles.outTitle}>후속 질문</div>
              <div className={styles.outBody}>다음 사고를 이어가기 위한 질문 제안. 생각을 끝내지 않고 다음으로 연결합니다.</div>
            </div>
          </div>

          <div className={styles.code}>
            <div className={styles.codeHead}>
              <span>▸ synthesis.json</span>
              <span className={styles.codeMuted}>· mediator: claude-sonnet-4</span>
            </div>
            <div>
              <span className={styles.codePunct}>{"{"}</span><br />
              <span>  </span><span className={styles.codeKey}>"agreement"</span><span className={styles.codePunct}>: </span><span className={styles.codeStr}>"세 모델 모두 실행 리스크를 1순위로 꼽음"</span><span className={styles.codePunct}>,</span><br />
              <span>  </span><span className={styles.codeKey}>"uniqueInsights"</span><span className={styles.codePunct}>: </span><span className={styles.codeStr}>{"{ \"claude\": \"경쟁사 포지셔닝 차이\", \"gpt\": \"가격 민감도\" }"}</span><span className={styles.codePunct}>,</span><br />
              <span>  </span><span className={styles.codeKey}>"contradictions"</span><span className={styles.codePunct}>: </span><span className={styles.codeStr}>"런웨이 전제가 모델마다 6개월 / 12개월로 갈림"</span><span className={styles.codePunct}>,</span><br />
              <span>  </span><span className={styles.codeKey}>"bestAnswer"</span><span className={styles.codePunct}>: </span><span className={styles.codeStr}>"단기 수익 검증 → 가격 테스트 → 시장 확장 순으로 재배열"</span><span className={styles.codePunct}>,</span><br />
              <span>  </span><span className={styles.codeKey}>"attributions"</span><span className={styles.codePunct}>: </span><span className={styles.codeStr}>{"{ \"리스크 식별\": \"claude\", \"가격 프레임\": \"gpt\" }"}</span><span className={styles.codePunct}>,</span><br />
              <span>  </span><span className={styles.codeKey}>"followUps"</span><span className={styles.codePunct}>: </span><span className={styles.codeStr}>{"[\"런웨이 전제 재검토\", \"가격 테스트 설계\"]"}</span><br />
              <span className={styles.codePunct}>{"}"}</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Use cases ─────────────────────────────────────────────────── */}
      <section id="use" className={styles.section} style={{ background: "#fff" }}>
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
