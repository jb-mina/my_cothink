# coThink

여러 AI 모델에 같은 질문을 동시에 던지고, 중재자 모델이 응답을 종합해 주는 Next.js 웹앱. 한국어 UI.

## 실행 / 빌드

```bash
npm run dev     # 로컬 개발 서버
npm run build   # 프로덕션 빌드
npm run start   # 프로덕션 실행
```

테스트 스위트와 lint 스크립트는 없다. 타입 검증은 `npx tsc --noEmit`으로 수동 실행한다.

## 필수 환경 변수

- `OPENROUTER_API_KEY` — OpenRouter 경유 모델 호출
- `ANTHROPIC_API_KEY` — 기본 중재자(Claude Sonnet 4) 직접 호출
- `APP_PASSWORD` — 앱 로그인 비밀번호 (평문 비교)

셋 중 하나라도 누락되면 해당 엔드포인트가 **요청 시점에 500 에러**로 실패하고 UI에 에러 박스가 뜬다. 새 환경 세팅 시 `.env.local`부터 확인한다.

## 아키텍처 핵심

- **Next.js 14.2.5 App Router + TypeScript 5**. Pages Router는 쓰지 않는다.
- **백엔드는 stateless**. DB 없음. 스레드는 전부 브라우저 `localStorage`에 저장된다 (key: `cothink_v1`, 최대 50개).
- **인증은 단일 공유 비밀번호**. httpOnly 쿠키(`cothink_auth`, 30일). 사용자 계정·세션 개념이 **없다** — "사용자별 데이터"를 암시하는 기능을 추가하지 말 것.
- 스타일은 현재 **CSS Modules만** 사용 중 (`app/page.module.css`). Tailwind/styled-components 설정은 존재하지 않는다.

## 미들웨어 동작 (주의)

`middleware.ts`의 matcher는 `_next/static`, `_next/image`, `favicon.ico`만 제외한다. `/api/*`와 `/login`도 matcher에 포함되어 미들웨어가 실행되지만, **함수 내부 early-return**으로 통과시킨다:

- `/api/*` — line 7에서 즉시 `NextResponse.next()`
- `/login` POST — line 14에서 통과 (로그인 폼 제출)
- 그 외 — 쿠키 검증 실패 시 `/login`으로 리디렉션

새 경로를 추가할 때 matcher만 보고 판단하면 안 된다. 함수 내부 분기도 같이 본다.

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

- Rate limiting 없음
- 스트리밍 응답 없음 (Phase 1→2가 전체 응답 대기)
- 실패한 모델 호출 재시도 없음
- 스레드 서버 저장 없음

## 검증 방식

자동화된 테스트가 없다. 기능 변경 후에는:

1. `npm run dev`로 로컬 실행
2. 로그인 → 모델 2개 이상 선택 → 질문 → 종합 결과 JSON 파싱 확인
3. 후속 질문 클릭 → 스레드 누적 확인
4. 브라우저 DevTools에서 `localStorage["cothink_v1"]`이 `Thread[]` 구조인지 확인

제품 스펙·사용자 플로우는 [1pager.md](./1pager.md) 참조.
