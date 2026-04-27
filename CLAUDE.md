이 문서는 Claude Code가 이 저장소에서 작업할 때 매번 참조하는 운영 원칙입니다.

# coThink

여러 AI 모델에 같은 질문을 동시에 던지고, 중재자 모델이 응답을 종합해 주는 Next.js 웹앱. 한국어 UI.

Ground truth 문서
- 목적 및 배경: 1pager.md
- 제품 스펙: prd.md (4/27 : 코드 기반 v1.0 작성 예정)

문서의 내용과 코드 간 괴리가 보이면 침묵으로 메꾸지 말고 먼저 보고하고 질문할 것. 모르는 상태를 합리적 추측으로 채운 코드는 이 프로젝트에서 가장 비싼 부채가 된다.


## 실행 / 빌드

```bash
npm run dev     # 로컬 개발 서버
npm run build   # 프로덕션 빌드
npm run start   # 프로덕션 실행
```

테스트 스위트와 lint 스크립트는 없다. 타입 검증은 `npx tsc --noEmit`으로 수동 실행한다.

## 필수 환경 변수

### 핵심 API
- `OPENROUTER_API_KEY` — OpenRouter 경유 모델 호출
- `ANTHROPIC_API_KEY` — 기본 중재자(Claude Sonnet 4) 직접 호출
- `APP_PASSWORD` — 관리자 로그인 비밀번호 (평문 비교, `/admin` 접근 쿠키 정확 일치용)

### 초대 시스템 (PR-B 이후)
- `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` — `invitations` 테이블 접근용 서비스 롤 클라이언트 (`lib/supabase.ts`). 클라이언트 번들에 노출하지 말 것 (`NEXT_PUBLIC_` 금지).
- `RESEND_API_KEY` — 초대 코드·관리자 알림 메일 발송
- `RESEND_FROM_EMAIL` — 발신 주소 (기본값 `onboarding@resend.dev`. 도메인 인증 시 `noreply@getcothink.com` 등)
- `ADMIN_EMAIL` — 신규 초대 요청 알림 수신 주소 (생략 시 관리자 알림만 스킵되고 요청 자체는 정상 처리)

핵심 API 키 누락 시 해당 엔드포인트는 **요청 시점에 500 에러**로 실패한다. 초대 시스템 키 누락 시 `/api/invitation-request`·`/api/login` 코드 경로·`/admin` 승인이 실패한다. 새 환경 세팅은 `.env.local.example` 기준.

## 아키텍처 핵심

- **Next.js 14.2.5 App Router + TypeScript 5**. Pages Router는 쓰지 않는다.
- **메인 앱 백엔드는 stateless**. 스레드는 브라우저 `localStorage`에 저장된다 (key: `cothink_v1`, 최대 50개). 초대 시스템만 Supabase를 쓴다 — **앱 데이터용 DB가 아니다**.
- **인증은 두 가지 역할**. httpOnly 쿠키(`cothink_auth`, 30일)의 값으로 구분:
  - `APP_PASSWORD`와 정확히 일치 → **admin** (`/admin` 접근 가능)
  - `u:<CODE>` 형식 → **user** (초대 코드 로그인)
  - 그 외 → **none**
  쿠키 값은 아직 서명되지 않는다 — JWT 이관은 후속 PR-D 예정. 사용자별 데이터 저장은 **여전히 없음** (스레드는 브라우저 로컬).
- **배포 도메인**: `getcothink.com` (Vercel).
- **스타일 정책**:
  - 메인 앱(`app/page.tsx`) — CSS Modules (`app/page.module.css`), `globals.css`의 amber 팔레트 사용
  - 랜딩(`app/landing/`) — CSS Modules, 단 로컬 팔레트 토큰(`--cream`·`--accent: #d96628`·`--ink` 등)을 **`.page` 스코프**로 정의. `globals.css`의 amber와 섞지 말 것
  - 로그인(`app/login/page.tsx`) — 인라인 스타일 + 랜딩과 동일한 크림/오렌지 팔레트 (폰트는 `var(--font-*)` 전역 토큰)
  - 관리자(`app/admin/`) — CSS Modules (`app/admin/page.module.css`)
  - Tailwind/styled-components 설정은 존재하지 않는다.

## 미들웨어 동작 (주의)

`middleware.ts`의 matcher는 `_next/static`, `_next/image`, `favicon.ico`만 제외하고 나머지 전부에 실행된다. 함수 내부는 다음 순서로 분기:

1. `/api/*` → 즉시 통과. 개별 라우트가 필요 시 인증을 직접 처리. `/api/login`·`/api/invitation-request`는 공개, `/api/query`·`/api/synthesize`는 **아직 미보호** (JWT 도입 후 PR-D에서 잠글 예정).
2. `/landing` → 항상 공개
3. `/login` → 항상 공개
4. 쿠키 역할(`role()`) 분류: admin / user / none
5. `/admin` → admin만 통과. user면 `/`로, none이면 `/landing`으로 리다이렉트. **추가로 `app/admin/page.tsx`의 `requireAdmin()`이 렌더 시 재검증하고, `approveAction` 서버 액션 내부에서도 쿠키를 재검증**한다 (서버 액션은 외부에서 직접 POST 가능하므로 미들웨어만 믿으면 안 됨).
6. `/` → role=none이면 `/landing`으로 **rewrite**(URL `/` 유지). admin/user는 메인 앱 통과.
7. 그 외 경로 → role=none이면 `/landing` redirect, 아니면 통과.

새 경로·권한을 추가할 때 matcher만 보고 판단하면 안 된다. 함수 내부 분기와 페이지·서버 액션의 재검증까지 세트로 관리한다.

## 초대 시스템 — 접근 제어

**플로우**: 랜딩(`/` 또는 `/landing`) 이메일 제출 → Supabase `invitations`에 `status=pending` → 관리자(`/admin`, `APP_PASSWORD` 로그인)가 승인 → `lib/invitation.ts#approveInvitation`이 10자리 코드 생성·DB 업데이트·Resend 메일 발송 → 사용자가 `/login`에 코드 입력 → `cothink_auth=u:<CODE>` 쿠키 발급 → 메인 앱 진입.

**Supabase `invitations` 스키마**:
```
email        text primary key
status       text  -- 'pending' | 'approved' | 'rejected'
code         text unique
requested_at timestamptz default now()
approved_at  timestamptz
```

**핵심 파일**:
- `lib/supabase.ts` — `supabaseServer()` 서비스 롤 클라이언트. 서버 전용.
- `lib/invitation.ts` — `generateCode()`(대문자 알파벳 32자에서 10자 샘플), `approveInvitation(email)`, `sendInvitationEmail`, `sendAdminNotification`.
- `app/api/invitation-request/route.ts` — 공개 POST `{email}`. 중복·승인 이력 구분 응답.
- `app/api/login/route.ts` — `{value}` 단일 필드. admin 경로는 정확 일치, user 경로는 `.toUpperCase()` 정규화 후 `status='approved'` 코드 조회.
- `app/admin/page.tsx` — Server Component + Server Action (`approveAction`). 페이지·액션 양쪽에서 쿠키 재검증.
- `app/landing/page.tsx` — 이메일 제출 3지점(hero CTA 모달·final CTA 인라인·푸터 링크). 모두 `/api/invitation-request` 호출.

**건드릴 때 주의**:
- 코드 알파벳을 바꾸면 로그인 정규화와 달라져 기존 승인 코드가 거부될 수 있다.
- 서버 액션(`approveAction`)은 미들웨어 외에 **함수 내부에서 반드시 `cookies().get('cothink_auth')` 재검증** — 외부 POST로 우회 가능.
- Supabase 서비스 롤 키는 **서버 전용**. 클라이언트 컴포넌트·`NEXT_PUBLIC_` 접두사로 노출 금지.
- Resend 도메인 인증 전에는 기본 발신(`onboarding@resend.dev`)로 동작. `getcothink.com` DKIM/SPF 추가 후 `RESEND_FROM_EMAIL` 교체.

## 중재자 분기 로직 (주의)

`app/api/synthesize/route.ts`:

- `mediatorId === "anthropic"` → **Anthropic SDK 직접 호출** (`@anthropic-ai/sdk`, model: `claude-sonnet-4-20250514`)
- 그 외 → **OpenRouter 경유** (`/api/v1/chat/completions`)

중재자를 추가·수정할 때 이 분기를 건드리면 기본 경로가 깨진다.

## 모델 / 중재자 목록 수정

`app/page.tsx` 상단의 **두 배열**이 단일 출처:

- `MODELS` — 질의 대상 모델 (shape: `{ id, name, short, color }`)
- `MEDIATORS` — 중재자 선택지 (shape: `{ id, short, name, color }`)

UI에서 커스터마이징할 수 없고, 배열을 수정하면 자동으로 체크박스·탭·칩에 반영된다. 새 모델 추가 시:

1. OpenRouter가 해당 모델 ID를 지원하는지 확인
2. 해당 배열에 항목 추가
3. 별도 SDK가 필요하면 `/api/query/route.ts` 또는 `/api/synthesize/route.ts`에 분기 추가

## 데이터 모델

```ts
type Thread = { id: string; title: string; createdAt: number; turns: Turn[] };
type Turn   = { question: string; responses: Record<string, MR>; synthesis: Syn | null };
type MR     = { status: "loading" | "done" | "error"; content: string };
type Syn = {
  agreement: string;
  uniqueInsights: string;
  contradictions: string;
  bestAnswer: string;
  attributions: Record<string, string>;
  followUps: string[];
};
```

중재자 응답은 **반드시 `Syn` 형태의 JSON**이다. 프롬프트를 수정할 때 이 스키마를 깨면 `JSON.parse`가 실패해 UI가 빈 상태가 된다.

## 스레드 컨텍스트 전달 (history)

같은 스레드의 후속 질문은 직전 턴들을 컨텍스트로 함께 보내지만, **모델 질의와 종합에서 전달 방식이 다르다**. 두 경로 모두 직전 `HISTORY_LIMIT = 3`턴까지만 사용한다 (`app/page.tsx` 상단 상수).

- **개별 모델 질의** (`/api/query`) — 각 모델에 보낼 때 그 모델 자신의 과거 응답만 `{ question, answer }` 쌍으로 끼워 넣는다. 즉 GPT-4o에는 GPT-4o의 이전 답만, Claude에는 Claude의 이전 답만 들어가며 **다른 모델의 답을 섞지 않는다**. 이전 턴에서 실패했거나 빈 응답인 모델은 history에서 제외된다.
- **종합** (`/api/synthesize`) — 직전 턴들의 `{ question, bestAnswer }`만 전달한다. 개별 모델 응답은 다시 넣지 않고 **이전 종합 결과(`bestAnswer`)만 컨텍스트**로 사용한다. 프롬프트의 `historyBlock`이 이 데이터를 `[Turn N] Q / Previous synthesized answer` 형태로 직렬화한다.

`HISTORY_LIMIT`을 늘리면 컨텍스트는 풍부해지지만 토큰·비용·종합 품질 변동이 따라온다. 종합 단계가 이전 모델 응답을 의도적으로 보지 않는다는 점도 함께 기억한다 — 종합 품질이 "이전 답들의 결을 잃었다"고 느껴지면 이 설계가 원인일 수 있다.

## 응답 토큰 제한

- 모델 질의: `max_tokens=800`
- 종합: `max_tokens=1200`

길이 관련 버그를 쫓기 전에 이 숫자부터 확인한다.

## 빌드 설정 경고 (중요)

`next.config.js`에서 TypeScript와 ESLint 에러를 **빌드 시 무시**하도록 설정되어 있다.

- 빌드가 성공해도 타입 에러는 남아 있을 수 있다
- ESLint는 devDependency에 포함되어 있지 않고 설정 파일(`.eslintrc*`)도 없다
- 큰 변경 후에는 `npx tsc --noEmit`을 수동 실행해 검증한다

## 변경 반영 정책 (브랜치 · PR)

- **문서·설정** (`*.md`, `.gitignore`, `.env.local.example` 등) — `main`에 직접 커밋·푸시. PR 생략.
- **코드** (`app/`, `middleware.ts`, `next.config.js`, `package.json` 등) — 세션에 할당된 feature 브랜치(`claude/...`)에 커밋·푸시 → **PR 생성** → 사용자가 GitHub 웹에서 diff 리뷰 후 머지.

테스트 스위트·ESLint가 없어 코드 회귀를 기계적으로 잡을 수 없다. PR diff 리뷰가 유일한 안전장치다.

## 알려진 제약 — 고치지 말 것 (지금은)

아래는 "버그"가 아니라 **의도된 범위 축소**다. 요청 없이 자발적으로 고치지 말 것:

- Rate limiting 없음 (`/api/invitation-request`·`/api/login` 포함)
- 스트리밍 응답 없음 (Phase 1→2가 전체 응답 대기)
- 실패한 모델 호출 재시도 없음
- 스레드 서버 저장 없음
- **JWT 미적용 — 쿠키 값 신뢰 기반 인증**. 위조 위험은 `/admin`에 한해 `APP_PASSWORD` 정확 일치로 방어, `/api/query`·`/api/synthesize`는 아직 공개. 서명 쿠키 이관은 후속 PR-D 예정.

## 검증 방식

자동화된 테스트가 없다. 기능 변경 후에는:

**메인 앱 회귀 체크**

1. `npm run dev`로 로컬 실행
2. 로그인(코드 또는 `APP_PASSWORD`) → 모델 2개 이상 선택 → 질문 → 종합 결과 JSON 파싱 확인
3. 후속 질문 클릭 → 스레드 누적 확인
4. 브라우저 DevTools에서 `localStorage["cothink_v1"]`이 `Thread[]` 구조인지 확인

**초대 플로우 회귀 체크** (인증·랜딩·초대 시스템 관련 변경 시)

5. 쿠키 비운 브라우저로 `/` 접속 → URL 유지된 채 랜딩이 보이는지 확인(미들웨어 rewrite)
6. 랜딩 이메일 제출 → Supabase `invitations`에 `status=pending` 레코드 생성 확인
7. `cothink_auth=<APP_PASSWORD>` 쿠키 수동 설정 후 `/admin` → pending 목록에서 승인 → Resend 대시보드에서 코드 메일 발송 확인
8. `/login`에 코드 입력(대소문자 섞어도 통과해야 함) → `/` 메인 앱 진입 → 쿠키 값이 `u:<CODE>` 형식인지 확인
9. user 쿠키 상태에서 `/admin` 접근 시 `/`로 리다이렉트되는지 확인

제품 스펙·사용자 플로우는 [1pager.md](./1pager.md) 참조.
