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

## 기술 스택

| 영역 | 사용 기술 |
|------|-----------|
| 프레임워크 | Next.js 16 (App Router) + TypeScript |
| 스타일 | Tailwind CSS v4 |
| 인증 | Auth.js (NextAuth v5) + bcrypt |
| DB | Prisma ORM + SQLite (개발) |
| 차트 | Recharts |
| 마크다운 | react-markdown |
| 검증 | Zod |

## 시작하기

```bash
npm install                 # 의존성 설치 (+ prisma generate)
cp .env.example .env        # 환경변수 준비 후 AUTH_SECRET 채우기
npx prisma migrate dev      # DB 스키마 적용
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
| `DATABASE_URL` | 데이터베이스 연결 문자열 (기본: `file:./dev.db`) |
| `AUTH_SECRET` | Auth.js 세션 서명 키 — `npx auth secret`로 생성 |
| `FINNHUB_API_KEY` | (선택) 실시간 시세용 [Finnhub](https://finnhub.io) 키. **없으면 결정론적 mock 시세로 자동 폴백**하여 키 없이도 동작 |

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
  market/                           # 시세 provider 추상화 (finnhub + mock)
prisma/schema.prisma, prisma/seed.ts
```

## 로드맵 (분석 렌즈)

- **Phase 0 (완료)** — 뼈대: Stock·AnalysisPost·종목 태그, 관리자 에디터, 구독자 피드
- **Phase 1 (완료)** — `lensType` 필터 탭, 종목 상세의 렌즈별 모아보기, 내 종목/전체 스코프
- **Phase 2 (완료)** — 렌즈별 구조화 필드(`lens_fields`) 입력/표시
- **Phase 3 (완료)** — `related_posts` 상호 연계, 카드 렌즈 요약으로 렌즈별 탐색 강화

## 프로덕션 참고

- SQLite → Postgres 전환: `prisma/schema.prisma`의 `datasource` provider/URL 변경
- 배포 시 `AUTH_URL`(사이트 URL)과 강력한 `AUTH_SECRET` 설정
