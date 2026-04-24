# coThink

Multi-Model Reasoning Environment — 여러 AI 모델에 동시 질의해 답변을 받고, 선택된 한 모델이 종합 분석해 결과를 요약,제시합니다.

## 로컬 실행

```bash
npm install
cp .env.local.example .env.local
# .env.local에 API 키 입력
npm run dev
```

## Vercel 배포 (5분)

### 1. GitHub 레포 생성 및 push

```bash
git init
git add .
git commit -m "init coThink"
git remote add origin https://github.com/YOUR_ID/cothink.git
git push -u origin main
```

### 2. Vercel import

1. [vercel.com](https://vercel.com) → **Add New Project**
2. GitHub 레포 선택 → Import

### 3. 환경변수 입력

**Settings → Environment Variables** 에서 아래 두 개 추가:

| Name | Value |
|------|-------|
| `OPENROUTER_API_KEY` | `sk-or-v1-...` |
| `ANTHROPIC_API_KEY` | `sk-ant-...` |

### 4. Deploy

→ 완료. `https://getcothink.com` 로 접근 가능.

---

## 모델 추가/변경

`app/page.tsx` 상단 `MODELS` 배열을 수정하세요.

OpenRouter에서 지원하는 모든 모델 ID는 [openrouter.ai/models](https://openrouter.ai/models) 에서 확인.

`:free` suffix가 붙은 모델은 무료입니다.
