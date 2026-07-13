# Portfolio Care — 투자 포트폴리오 관리 + 분석 렌즈

보유 종목과 거래를 등록하면 **실시간 시세**로 평가금액·손익·수익률·자산 배분을
자동 계산하고, 관리자가 발행한 **종목 연동 분석**을 구독자가 자기 보유 종목 기준으로
받아보는 풀스택 대시보드입니다.

## 주요 기능

### 포트폴리오
- **계정/인증** — 이메일·비밀번호 회원가입·로그인 (Auth.js Credentials)
- **다중 포트폴리오** — 계좌·전략별로 나눠 관리하고 전체를 합산
- **거래 기반 자동 집계** — 매수·매도만 입력하면 보유수량·평균단가·실현손익을 자동 계산 (평균원가법)
- **실시간 시세 연동** — 현재가로 평가금액·평가손익·수익률 계산 (USD 기준)
- **자산 배분 & 추이 차트**, **종목 상세 페이지**(포지션·매매 요약·평단가 vs 현재가)
- **다크/라이트 모드**, 반응형 UI

### 분석 렌즈 (JACK1 LENS · Phase 0)
- **하나의 공유 뼈대** — `Stock` + `AnalysisPost`(`lensType`) + 종목 태그. 5개 렌즈(실적/밸류체인/거시/뉴스/재무)는 별도 페이지가 아니라 `lensType` 값
- **관리자 발행** — 역할 분리(ADMIN), 분석글 에디터(제목·본문 마크다운·렌즈 타입·종목 태그·초안/발행), 종목 관리
- **구독자 피드** — 내 보유 종목(거래에서 파생) ∩ 발행글의 종목 태그를 최신순으로. 글에서 내 보유 종목을 하이라이트

### 투자 매뉴얼 v4.1 (단계 판정 · 비중 규율 · 자동화)
- **단계 자동 판정** (`lib/stage-judge.ts`) — G1·G2·G3s·G4·킬을 결정트리 ①~⑦로 판정(1~4단계·이탈). stage는 저장하지 않고 항상 G값에서 파생. `/dashboard/stages`에서 단계별 종목·보고서 탐색, `/dashboard/principles`에서 판정 기준·판정기 위젯·원문 열람
- **판정 주기 규율(§A.10)** — 확정 판정이 바뀌면 `StageChangeLog`에 이력 1행(§7 형식). 관리자 패널에 "새 실적 이후 미검토" 배지
- **포트폴리오 비중 규율** (`lib/portfolio-rules.ts`) — 종목당 상한(2·3=15%/4=10%)·단계 종목 수·자금줄/체인 합산·그로스 익스포저 상한을 결정적으로 검사. `/dashboard/model` 모델 포트폴리오 + 규율 점검
- **지표 자동화 파이프라인** (`lib/indicators/`) — 가격/재무/밸류에이션으로 G1~G4·킬 신호·EV/Sales·P/E(5년 중앙값 대비) **제안값**을 계산(확정 G값은 관리자 승인으로만 변경). FMP 연동, 미설정 시 mock 폴백. 일일 크론(`/api/cron/refresh-indicators`)
- **보고서 초안 생성** — 지표·판정으로 §9 템플릿의 숫자·표를 채운 초안. `ANTHROPIC_API_KEY`가 있으면 하우스 보이스 서술 초안(분석가 검토 전)도 생성
- **알림 & 모니터링** — 단계 변경(보유자)·이탈 킬(전체 구독자)·크론 실패(관리자)를 인앱 알림으로. `/dashboard/notifications`

## 기술 스택

| 영역 | 사용 기술 |
|------|-----------|
| 프레임워크 | Next.js 16 (App Router) + TypeScript |
| 스타일 | Tailwind CSS v4 |
| 인증 | Auth.js (NextAuth v5) + bcrypt |
| DB | Prisma ORM + Postgres (Neon 등) |
| 차트 | Recharts |
| 마크다운 | react-markdown |
| 검증 | Zod |

## 시작하기

```bash
npm install                 # 의존성 설치 (+ prisma generate)
cp .env.example .env        # DATABASE_URL(Postgres)·AUTH_SECRET 채우기 (Neon 무료 DB 사용 가능)
npx prisma migrate deploy   # DB 스키마 적용
npm run db:seed             # (선택) 데모 데이터 생성
npm run dev                 # http://localhost:3000
```

### 데모 계정

`npm run db:seed` 실행 시 아래 계정이 생성됩니다.

```
구독자:  demo@portfolio.care  / demo1234
관리자:  admin@portfolio.care / admin1234   (분석글 발행)
```

구독자는 AAPL·NVDA 등을 보유하도록 시드돼 있어, 관리자가 해당 종목을 태그해 발행하면
구독자의 분석 피드에 바로 나타납니다.

## 환경변수 (`.env`)

| 변수 | 설명 |
|------|------|
| `DATABASE_URL` | 데이터베이스 연결 문자열 (Postgres) |
| `AUTH_SECRET` | Auth.js 세션 서명 키 — `npx auth secret`로 생성 |
| `AUTH_URL` | (배포 시) 사이트 URL |
| `ADMIN_EMAILS` | (선택) 쉼표 구분 관리자 이메일. 로그인 시 자동으로 ADMIN 승격 |
| `FINNHUB_API_KEY` | (선택) 실시간 시세용 [Finnhub](https://finnhub.io) 키. **없으면 mock 시세로 폴백** |
| `FMP_API_KEY` | (선택) 지표 자동화용 [FMP](https://financialmodelingprep.com) 키(가격·재무·밸류에이션). **없으면 결정론적 mock으로 폴백** |
| `ANTHROPIC_API_KEY` | (선택) 보고서 서술 초안 생성용. **없으면 서술은 `[대괄호]` 템플릿 그대로**(키 게이트) |
| `CRON_SECRET` | (선택) 일일 지표 갱신 크론 인증용 Bearer 토큰. 미설정 시 크론 라우트 비활성 |

## 시세 공급자

`lib/market/`는 provider 추상화입니다. `FINNHUB_API_KEY`가 있으면 Finnhub REST로
현재가를 조회하고, 없으면 종목별로 안정적인 mock 시세를 생성합니다. 외부 API 호출은
서버 라우트(`/api/quotes`)에서만 수행합니다.

## 프로젝트 구조

```
app/
  (auth)/                           # 로그인·회원가입
  dashboard/                        # 포트폴리오 요약·차트
  dashboard/portfolios/[id]/        # 포트폴리오 상세
  dashboard/portfolios/[id]/[symbol]/  # 종목 상세
  dashboard/feed/                   # 구독자 분석 피드 + 글 상세
  admin/                            # 관리자: 분석글 에디터·종목 관리 (ADMIN 전용)
  api/                              # portfolios·transactions·quotes·auth·admin
components/                         # 차트·표·폼·에디터 등 UI
lib/
  auth.ts, auth-guards.ts, prisma.ts, validation.ts
  portfolio.ts                      # 보유/손익 집계 (평균원가법)
  data.ts                           # 포트폴리오 데이터 로더
  analysis.ts, lens.ts              # 분석 피드/렌즈
  stage-judge.ts, stage-apply.ts, stage-history.ts  # 매뉴얼 단계 판정·적용·이력
  portfolio-rules.ts                # 비중 규율 검사기
  report-templates.ts, report-draft.ts, report-narrative.ts  # 보고서 양식·초안·LLM 서술
  notifications.ts                  # 알림 팬아웃·읽기
  indicators/                       # 지표 자동화(가격·재무·밸류에이션 → 제안값), fmp + mock
  market/                           # 시세 provider 추상화 (finnhub + mock)
content/investment-manual.md, content/report-guide.md   # 판정 원문·보고서 가이드
prisma/schema.prisma, prisma/seed.ts, prisma/migrations/
```

## 로드맵 (분석 렌즈)

- **Phase 0 (완료)** — 뼈대: Stock·AnalysisPost·종목 태그, 관리자 에디터, 구독자 피드
- **Phase 1 (완료)** — `lensType` 필터 탭, 종목 상세의 렌즈별 모아보기, 내 종목/전체 스코프
- **Phase 2 (완료)** — 렌즈별 구조화 필드(`lens_fields`) 입력/표시
- **Phase 3 (완료)** — `related_posts` 상호 연계, 카드 렌즈 요약으로 렌즈별 탐색 강화
- **매뉴얼 v4.1 통합 (완료)** — 단계 판정 엔진·보고서 필수 양식·판정기·원문 페이지
- **지표 자동화 A~G (완료)** — 가격/재무/밸류에이션 → G값·킬·배수 제안값, 일일 크론
- **W2~W5 (완료)** — 판정 주기 규율·이력 로그 / 포트폴리오 비중 규율·모델 포트 / 밸류에이션 자동화·LLM 서술 / 알림·모니터링. 핵심 판정 로직은 vitest로 회귀 커버(79 테스트)

## 배포 (브라우저로 접속)

브라우저에서 URL로 접속하려면 서버를 호스팅해야 합니다. 방법별 단계는
**[DEPLOY.md](./DEPLOY.md)** 참고:

- **Vercel + Neon(Postgres)** — 무료 서버리스. 저장소 Import → env 3개 → Deploy
- **Docker** — `docker build -t portfolio-care . && docker run -p 3000:3000 …` (어디서든)

컨테이너/배포는 시작 시 `prisma migrate deploy`로 스키마를 적용한 뒤 `next start`로 서빙합니다.

## 프로덕션 참고

- DB는 Postgres(Neon 등). 배포 시 `AUTH_URL`(사이트 URL)과 강력한 `AUTH_SECRET` 설정
- 빌드는 `npm run build`(= `node scripts/build-migrate.mjs && next build`) — `DATABASE_URL`이 있으면 `prisma migrate deploy`를 먼저 적용, 없으면 건너뜀
- 일일 지표 갱신 크론은 `vercel.json`에 정의(평일 22:00 UTC → `/api/cron/refresh-indicators`). `CRON_SECRET` 설정 필요
- 선택 키(`FMP_API_KEY`·`ANTHROPIC_API_KEY`)는 없어도 mock/키 게이트로 안전하게 동작
