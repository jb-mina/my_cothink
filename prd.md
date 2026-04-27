# coThink — Product Requirements Document (v1.0)

이 문서는 현재 배포된 코드를 기준으로 한 v1.0 제품 스펙이다. 비전은 [1pager.md](./1pager.md), Claude Code 작업 시 운영 원칙은 [CLAUDE.md](./CLAUDE.md). 이 PRD는 그 둘 사이를 잇는 "지금 무엇이 어떻게 동작하는가"의 기록이다.

기능 항목은 향후 확장과 혼동되지 않도록 **현재 구현된 상태에 한정**한다. 1pager·랜딩 카피와 차이가 있는 항목은 §11 백로그에 명시한다.

---

## 1. 적용 범위 / 문서 위치

- **적용 범위**: `getcothink.com` 웹앱 v1.0 (Next.js 14 App Router, 단일 도메인). 모바일 전용 앱·외부 API·확장 프로그램은 범위 외.
- **시점**: 2026-04-27 시점의 main 브랜치.
- **버전 정의**: 메인 앱(`/`)·랜딩(`/landing`)·로그인(`/login`)·관리자(`/admin`)·초대 발급 백엔드 + 다중 모델 질의·중재자 종합·로컬 스레드 저장이 모두 동작하는 상태를 v1.0으로 정의한다.
- **이 문서가 다루지 않는 것**: 마케팅 카피, 디자인 시스템 토큰 단위 명세, 인프라 구축 절차(Vercel·Supabase·Resend 셋업).

## 2. 제품 요약

coThink는 하나의 질문을 여러 AI 모델에 동시에 보내고, 중재자 모델이 응답을 6축으로 종합해 의사결정 재료로 정리해주는 한국어 웹앱이다. 단일 모델의 매끈한 답이 가리는 차이·모순·전제를 드러내, 사용자가 더 비판적으로 판단하도록 돕는 사고 환경을 지향한다.

- **타겟**: 솔로 의사결정자 (창업자·독립 컨설턴트·리서처·1인 전문가·학생).
- **핵심 가치**: 답의 양이 아니라 비교·해석·후속 질문을 통한 판단 품질.
- **현재 운영 형태**: 비공개 베타 — 이메일 초대 → 관리자 승인 → 코드 로그인.

## 3. 핵심 사용자 플로우

```
[비초대 방문자]
    │  /  → 미들웨어 rewrite → /landing
    ▼
[랜딩에서 이메일 제출]
    │  POST /api/invitation-request
    ▼
[Supabase invitations: status=pending] ──► 관리자 알림 메일 (Resend)
    │
    │  (관리자가 /admin 진입, APP_PASSWORD 로그인)
    ▼
[관리자 승인] ──► 코드 발급 + 사용자에게 코드 메일 (Resend)
    │
    ▼
[사용자가 /login에 코드 입력]
    │  POST /api/login (대소문자 정규화)
    ▼
[cothink_auth=u:<CODE> 쿠키 30일]
    │  /  → 메인 앱 진입
    ▼
[질문 입력 → 모델 동시 질의 → 중재자 종합 → 후속 질문]
    │
    ▼
[localStorage cothink_v1에 Thread 누적 (최대 50개)]
```

## 4. 기능 요구사항 (User Stories)

각 항목은 현재 구현된 동작을 유저 스토리 형식으로 정리한 것이다. 형식: `[역할]로서 [기능]을 사용한다 — [얻는 가치]`. 끝의 코드 위치는 진실의 출처다.

### 4.1 접근 제어 / 인증

- **US-1.1** _비초대 방문자로서_ 메인 도메인에 접속하면 URL이 유지된 채 랜딩 페이지가 보인다 — _공유된 링크가 맥락을 잃지 않고, 검색 노출도 자연스럽다._ (`middleware.ts:32-35` rewrite)
- **US-1.2** _비초대 방문자로서_ 랜딩의 hero CTA·중간 CTA·푸터 어디서든 이메일 한 줄로 초대를 요청한다 — _가입 양식을 길게 채우지 않고 베타 대기열에 들어간다._ (`app/landing/page.tsx`, `app/api/invitation-request/route.ts`)
- **US-1.3** _비초대 방문자로서_ 이미 요청·승인된 이메일을 다시 제출하면 그에 맞는 안내를 받는다 — _중복 제출이 무한 대기처럼 느껴지지 않는다._ (`/api/invitation-request` `alreadyRequested`/`alreadyApproved`)
- **US-1.4** _관리자로서_ 새 초대 요청이 들어오면 `ADMIN_EMAIL`로 알림을 받는다 — _별도 페이지를 매번 폴링하지 않아도 된다._ (`lib/invitation.ts#sendAdminNotification`)
- **US-1.5** _관리자로서_ `/admin`에서 pending 목록을 보고 한 번 클릭으로 승인·코드 발송을 동시에 실행한다 — _승인 절차가 단일 액션으로 끝난다._ (`app/admin/page.tsx#approveAction`)
- **US-1.6** _관리자로서_ 최근 승인된 20건의 이메일·코드·시각을 한 화면에서 본다 — _사용자 문의 시 빠르게 코드를 확인한다._ (`app/admin/page.tsx`)
- **US-1.7** _관리자로서_ 승인 액션이 외부 POST로 호출되어도 비밀번호 쿠키 재검증으로 차단된다 — _미들웨어 우회 공격이 무력화된다._ (`approveAction` 내부 `cookies().get` 재검증)
- **US-1.8** _승인된 사용자로서_ 이메일로 받은 10자리 코드를 `/login`에 입력해 메인 앱으로 입장한다 — _별도 비밀번호를 외울 필요가 없다._ (`app/login/page.tsx`, `app/api/login/route.ts`)
- **US-1.9** _승인된 사용자로서_ 코드를 대소문자가 뒤섞인 채 입력해도 통과한다 — _메일에서 복사할 때 형식이 어긋나도 막히지 않는다._ (`/api/login` `.toUpperCase()` 정규화)
- **US-1.10** _user 권한 사용자로서_ `/admin`에 직접 접근하면 `/`로 돌려 보내진다 — _권한 경계가 URL 조작으로 뚫리지 않는다._ (`middleware.ts:26-29` + `requireAdmin()`)
- **US-1.11** _로그인된 사용자로서_ 30일 동안 쿠키가 유지되어 매번 코드를 다시 입력하지 않는다 — _재방문 마찰이 낮다._ (`/api/login` `maxAge: 60*60*24*30`)

### 4.2 다중 모델 질의

- **US-2.1** _사용자로서_ 한 번 입력한 질문을 선택한 여러 모델에 동시에 보낸다 — _같은 질문을 여러 탭에서 반복하지 않는다._ (`app/page.tsx#run`, `Promise.allSettled`)
- **US-2.2** _사용자로서_ 칩으로 질의 모델을 토글하고 최소 2개 이상이 선택되도록 강제된다 — _비교 가치가 없는 단일 모델 호출을 막고, 비용·속도 통제권은 사용자에게 둔다._ (`MODELS` 배열, `if (sel.length < 2)`)
- **US-2.3** _사용자로서_ 모델 답이 도착하는 즉시 각 탭에 결과가 채워지는 것을 본다 — _느린 모델 때문에 빠른 모델의 답이 가려지지 않는다._ (모델별 `setResp`)
- **US-2.4** _사용자로서_ 응답 탭에서 status 점(loading/done/error)으로 진행 상태를 파악한다 — _어디서 막혔는지 즉각 안다._ (`Tabs` 컴포넌트의 `tdot`)
- **US-2.5** _사용자로서_ 한 모델이 실패해도 다른 모델 응답·종합은 계속 진행된다 — _하나의 실패가 전체 흐름을 막지 않는다._ (`Promise.allSettled` + 실패 모델은 `results`에서 자동 제외)
- **US-2.6** _사용자로서_ 모든 모델이 실패한 경우에만 종합이 중단되고 명시적 에러를 본다 — _빈 종합 결과를 보고 혼란스러워하지 않는다._ (`if (!results.length) ... "모든 모델 호출 실패"`)

### 4.3 중재자 종합

- **US-3.1** _사용자로서_ 종합 분석을 맡길 중재자 모델을 매 질문마다 자유롭게 바꾼다 — _같은 응답 묶음을 다른 관점으로 해석해볼 수 있다._ (`MEDIATORS` 칩 UI)
- **US-3.2** _사용자로서_ 헤더의 mediator 태그로 현재 누가 종합하는지 항상 확인한다 — _결과의 톤이 누구에게서 왔는지 잊지 않는다._ (`styles.mtag` in `app/page.tsx`)
- **US-3.3** _사용자로서_ 종합 결과를 6축(공통점·고유 인사이트·모순·종합 답·기여 매핑·후속 질문)으로 받는다 — _응답 더미를 직접 비교하지 않고 판단의 재료를 받는다._ (`Syn` 타입, `synthesize/route.ts` 프롬프트)
- **US-3.4** _사용자로서_ 모순 항목이 "없음"이면 화면에서 자동으로 숨겨진다 — _노이즈 없는 결과만 본다._ (`s.contradictions !== "없음"` 가드)
- **US-3.5** _사용자로서_ 기여 매핑(Attribution)에서 모델명을 누르면 해당 모델의 원문 답으로 이동한다 — _종합이 어떤 근거에서 나왔는지 역추적할 수 있다._ (`TurnBlock#handleAttrClick`)
- **US-3.6** _사용자로서_ 종합이 끝나면 화면이 그 위치로 부드럽게 스크롤된다 — _긴 응답 더미 위에서 결과를 놓치지 않는다._ (`useEffect` on `synth`)
- **US-3.7** _사용자로서_ 종합 진행 중에는 어떤 중재자가 작업 중인지 진행 표시줄에서 본다 — _대기가 막연하게 느껴지지 않는다._ (`pbar` + `phase==="s"` 분기)

### 4.4 후속 질문 / 스레드

- **US-4.1** _사용자로서_ 종합 결과 아래의 제안 후속 질문을 한 번 클릭해 다음 턴으로 이어간다 — _좋은 다음 질문을 직접 떠올리는 부담이 줄어든다._ (`SynthPanel#fb` 버튼)
- **US-4.2** _사용자로서_ 후속 질문을 직접 입력해 같은 스레드에서 이어 묻는다 — _AI 제안을 따르지 않더라도 내 사고 흐름을 유지한다._ (`SynthPanel`의 직접 입력 영역, `cq` 상태)
- **US-4.3** _사용자로서_ 후속 질문 시 직전 3턴까지의 컨텍스트가 자동으로 전달된다 — _매번 배경을 다시 설명하지 않는다._ (`HISTORY_LIMIT = 3`, CLAUDE.md "스레드 컨텍스트 전달" 참조)
- **US-4.4** _사용자로서_ 사이드바에서 과거 스레드를 클릭해 전체 흐름을 다시 본다 — _어제·어젯주의 사고를 잃지 않는다._ (`vThread` 보기 모드)
- **US-4.5** _사용자로서_ 사이드바 검색으로 제목으로 스레드를 빠르게 찾는다 — _50개 누적되어도 원하는 스레드에 즉시 접근한다._ (`searchQ` 필터)
- **US-4.6** _사용자로서_ 더 이상 필요 없는 스레드를 한 번에 삭제한다 — _사이드바를 깔끔히 유지한다._ (`delT`)
- **US-4.7** _사용자로서_ "+ 새 탐구"로 깨끗한 새 세션을 시작한다 — _이전 맥락이 다음 질문에 끌려가지 않는다._ (`newT`)
- **US-4.8** _사용자로서_ 이전 스레드를 보다가 후속 질문을 던지면 그 스레드에 누적되어 이어진다 — _히스토리가 단절되지 않는다._ (`onFollowUp` 안의 `tref.current = vThread`)

## 5. 비기능 요구사항 / 운영 제약

- **응답 토큰 제한**: 모델 질의 `max_tokens=4000`, 종합 `max_tokens=3000`. 응답이 잘리면 각 라우트가 `truncated`(query) / `_truncated`(synthesize) 플래그를 반환한다. 길이 관련 이슈 발생 시 첫 점검 지점.
- **동시성**: 모델 호출은 `Promise.allSettled`로 병렬, 부분 실패 허용.
- **스트리밍 미지원**: Phase 1(질의) → Phase 2(종합)는 전체 응답 대기 후 진행. 모델 토큰 스트리밍은 v1.0 범위 외.
- **재시도 미지원**: 실패한 모델 호출은 사용자가 수동으로 재실행해야 한다.
- **레이트 리미팅 부재**: `/api/invitation-request`·`/api/login`·`/api/query`·`/api/synthesize` 모두 v1.0에서는 미적용.
- **인증 보호 범위**: `/admin`만 미들웨어·페이지·서버 액션 3중 체크. `/api/query`·`/api/synthesize`는 v1.0에서 공개 (PR-D 예정 — §11 참조).
- **쿠키 서명 부재**: `cothink_auth` 값은 평문. JWT 이관은 v1.x 범위.
- **데이터 보존**: 사용자 데이터(스레드)는 브라우저 `localStorage` 전용. 서버 측 동기화·복구·내보내기 없음.

## 6. 데이터 모델

### 클라이언트 (브라우저 localStorage)

- 키: `cothink_v1`
- 값: `Thread[]`, 최대 50개 (초과 시 오래된 항목부터 잘라냄)

```ts
type Thread = { id: string; title: string; createdAt: number; turns: Turn[] };
type Turn   = { question: string; responses: Record<string, MR>; synthesis: Syn | null };
type MR     = { status: "loading" | "done" | "error"; content: string };
type Syn = {
  agreement: string;
  uniqueInsights: string;
  contradictions: string;     // 없으면 "없음"
  bestAnswer: string;
  attributions: Record<string, string>;
  followUps: string[];        // 길이 3 권장
};
```

종합 응답이 `Syn` 스키마를 벗어나면 `JSON.parse` 실패 → UI 빈 상태.

### 서버 (Supabase, 초대 시스템 전용)

테이블: `invitations`

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `email` | text PK | 정규화된 소문자 |
| `status` | text | `pending` / `approved` / `rejected` |
| `code` | text unique | 승인 시에만 채워짐, 10자리 |
| `requested_at` | timestamptz | default now() |
| `approved_at` | timestamptz | 승인 시각 |

이 테이블은 **메인 앱 데이터(스레드 등) 저장 용도가 아니다**.

## 7. 외부 의존성

| 서비스 | 사용처 | 키 |
|---|---|---|
| OpenRouter | `/api/query` 모든 모델 + `/api/synthesize` 비-Anthropic 중재자 | `OPENROUTER_API_KEY` |
| Anthropic SDK | `/api/synthesize`의 `mediatorId === "anthropic"` 분기 (`claude-sonnet-4-20250514`) | `ANTHROPIC_API_KEY` |
| Supabase (서비스 롤) | `invitations` 테이블 읽기·쓰기 | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |
| Resend | 사용자 코드 메일·관리자 알림 메일 | `RESEND_API_KEY`, `RESEND_FROM_EMAIL` |

핵심 키 누락 시 해당 엔드포인트는 **요청 시점에 500**으로 실패하고 명시적 메시지를 반환한다.

## 8. 모델 / 중재자 라인업 (v1.0)

`app/page.tsx` 상단의 두 배열이 단일 출처다.

**질의 모델 (MODELS)**
- `openai/gpt-4o` — GPT-4o
- `google/gemini-3-flash-preview` — Gemini 3 Flash
- `anthropic/claude-sonnet-4.5` — Claude Sonnet 4.5
- `perplexity/sonar-pro` — Perplexity Sonar Pro
- `x-ai/grok-4.1-fast` — Grok 4.1 Fast

**중재자 (MEDIATORS)**
- `anthropic` — Claude Sonnet 4 (직접 SDK 경로, model id `claude-sonnet-4-20250514`)
- `openai/gpt-4o`, `google/gemini-3-flash-preview`, `x-ai/grok-4.1-fast`, `perplexity/sonar-pro` (OpenRouter 경유)

기본 중재자는 `anthropic`. 새 모델은 OpenRouter 지원 확인 후 배열에 추가하면 자동으로 UI 칩에 반영된다.

## 9. 화면별 명세

### `/landing`

- 인증 무관. 미들웨어가 모든 미인증 사용자를 이곳으로 보낸다.
- Hero / Why 카드 / 변환 흐름 / 6축 출력 구조 / 활용 사례 / 작동 방식 / 지원 모델 / Final CTA / Footer / Modal.
- 이메일 입력 3지점(hero CTA 모달·final CTA 인라인·푸터 링크)이 모두 `/api/invitation-request`로 연결.
- 응답 상태별 표시: `idle` / `loading` / `ok` / `already` / `err`.

### `/login`

- 인증 무관.
- 단일 입력 필드(`value`) + 단일 액션. admin 패스워드와 user 코드를 같은 엔드포인트가 분기 처리한다.
- 성공 시 `cothink_auth` 쿠키 발급 후 `/`로 라우팅.

### `/` (메인 앱)

- admin·user 둘 다 진입. 미인증이면 `/landing` rewrite.
- 좌측 사이드바: 새 탐구 버튼 + 스레드 검색 + 스레드 목록 (제목·턴 수·날짜·삭제).
- 우측 메인:
  - 모델 칩 / 중재자 칩 / (선택) 활성 스레드 메타.
  - 질문 textarea (⌘↵ 또는 → 버튼으로 실행).
  - 진행 표시줄 (Phase 1·Phase 2 메시지 분기).
  - 응답 탭(모델별, 도착 즉시 갱신).
  - 종합 패널(6축 + 직접 입력 후속 질문).
- 스레드 보기 모드: 종합 결과를 우선 노출하고 "개별 모델 답변 (N개)"는 `<details>`로 접힘.

### `/admin`

- admin 전용. 미들웨어 + `requireAdmin()` + `approveAction` 3중 체크.
- 대기 목록(`pending`, 오래된 순) + 최근 승인(최대 20개, 최신 순).
- 승인 버튼 = `approveInvitation(email)` 트리거 → 코드 생성 + DB 업데이트 + 메일 발송.

## 10. 종합 출력 스키마 (Syn JSON)

중재자 모델은 다음 JSON만 반환해야 한다 (마크다운·백틱 금지). 모든 자연어 필드는 한국어.

```json
{
  "agreement": "공통된 관점 (필요한 만큼 자세히)",
  "uniqueInsights": "고유한 인사이트 (필요한 만큼 자세히)",
  "contradictions": "모순 및 이견 (없으면 '없음')",
  "bestAnswer": "종합 답변 (필요한 만큼 충분히 자세히)",
  "attributions": { "Model Name": "기여 내용 1-2줄" },
  "followUps": ["후속 질문1", "후속 질문2", "후속 질문3"]
}
```

`attributions` 키는 실제 응답에 의미 있게 기여한 모델 이름만 포함한다(전체 모델 나열 금지). `followUps`는 3개 권장. 응답 토큰 한계로 잘리면 라우트가 `_truncated: true`를 함께 반환한다.

## 11. 알려진 제약 / 명시적 비목표 (v1.0)

아래는 버그가 아니라 **의도된 범위 축소**다. v1.0에서 자발적으로 손대지 않는다.

- Rate limiting 없음 (`/api/invitation-request`·`/api/login` 등 모든 엔드포인트).
- 모델 토큰 스트리밍 없음 (Phase 1→2 전체 응답 대기).
- 실패한 모델 호출 자동 재시도 없음.
- 스레드의 서버 측 저장·동기화·내보내기 없음. 디바이스 변경 시 이력 이전 불가.
- 쿠키 서명·JWT 미적용 — 위조 위험은 `/admin`을 `APP_PASSWORD` 정확 일치로 방어, `/api/query`·`/api/synthesize`는 공개.
- 사용자별 사용량 / 결제 / 모델 비용 가시화 없음.

## 12. 다음 마일스톤 / 백로그

이번 v1.0 검토에서 식별되어 후속 PR로 이관된 항목:

- **PR-D — JWT/서명 쿠키 이관**: `cothink_auth`를 서명된 JWT로 교체하고 `/api/query`·`/api/synthesize`에 인증 미들웨어 적용.
- **랜딩 ↔ 메인 앱 모델 라인업 정합**: `app/landing/page.tsx`의 8개 모델 노출은 실제 `MODELS` 배열(5개)과 다르며 버전도 일부 다르다 (Gemini 2.5 Pro / Sonnet 4 vs 실제 Gemini 3 Flash / Sonnet 4.5). 어느 쪽이 진실인지 확정 후 한쪽으로 정렬한다.
- **종합 결과 "근거·한계" 정합**: 랜딩이 약속하는 "Best Answer는 근거와 한계가 함께 기재됩니다"가 실제 프롬프트에는 없다. 약속을 줄이거나 프롬프트를 보강한다.
- **Anthropic SDK 모듈 부작용 정리** (선택): `new Anthropic()`의 모듈 로드 시 실행을 lazy init으로 옮길지 검토.
- **레이트 리미팅 / 어뷰즈 방어**: 초대 요청·로그인 엔드포인트 우선.
- **스레드 내보내기**: 마크다운·JSON 다운로드.
- **모델 호출 실패 사후 재시도 UX**: 단순 "재시도" 버튼.
- **사용량 가시화**: 호출 비용·토큰 누적의 사용자 인지화 (빌링 도입 시점).
- **`_truncated` 플래그 UX 노출**: 현재 응답에는 포함되지만 UI에서 사용자에게 명시적으로 안내하지 않음.

## 13. 변경 이력

| 날짜 | 버전 | 변경 |
|---|---|---|
| 2026-04-27 | v1.0 | 초안 작성. 1pager.md(비전) + 코드 베이스를 근거로 한 초기 스펙. |
