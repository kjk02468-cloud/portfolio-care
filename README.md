# Portfolio Care — 투자 포트폴리오 관리 대시보드

보유 종목과 거래를 등록하면 **실시간 시세**로 평가금액·손익·수익률·자산 배분을
자동 계산해 보여주는 풀스택 대시보드입니다.

## 주요 기능

- **계정/인증** — 이메일·비밀번호 회원가입·로그인 (Auth.js Credentials)
- **다중 포트폴리오** — 계좌·전략별로 나눠 관리하고 전체를 합산
- **거래 기반 자동 집계** — 매수·매도만 입력하면 보유수량·평균단가·실현손익을 자동 계산 (평균원가법)
- **실시간 시세 연동** — 현재가로 평가금액·평가손익·수익률 계산
- **자산 배분 & 추이 차트** — 종목별 비중 도넛 차트, 자산 추이 라인 차트
- **다크/라이트 모드**, 반응형 UI

## 기술 스택

| 영역 | 사용 기술 |
|------|-----------|
| 프레임워크 | Next.js 16 (App Router) + TypeScript |
| 스타일 | Tailwind CSS v4 |
| 인증 | Auth.js (NextAuth v5) + bcrypt |
| DB | Prisma ORM + SQLite (개발) |
| 차트 | Recharts |
| 검증 | Zod |

## 시작하기

\`\`\`bash
npm install                 # 의존성 설치 (+ prisma generate)
cp .env.example .env        # 환경변수 준비 후 AUTH_SECRET 채우기
npx prisma migrate dev      # DB 스키마 적용
npm run db:seed             # (선택) 데모 데이터 생성
npm run dev                 # http://localhost:3000
\`\`\`

### 데모 계정

\`npm run db:seed\` 실행 시 아래 계정이 생성됩니다.

\`\`\`
이메일: demo@portfolio.care
비밀번호: demo1234
\`\`\`

## 환경변수 (\`.env\`)

| 변수 | 설명 |
|------|------|
| \`DATABASE_URL\` | 데이터베이스 연결 문자열 (기본: \`file:./dev.db\`) |
| \`AUTH_SECRET\` | Auth.js 세션 서명 키 — \`npx auth secret\`로 생성 |
| \`FINNHUB_API_KEY\` | (선택) 실시간 시세용 [Finnhub](https://finnhub.io) 키. **없으면 결정론적 mock 시세로 자동 폴백**하여 키 없이도 동작 |

## 시세 공급자

\`lib/market/\`는 provider 추상화입니다. \`FINNHUB_API_KEY\`가 있으면 Finnhub REST로
현재가를 조회하고, 없으면 종목별로 안정적인 mock 시세를 생성합니다. 외부 API 호출은
서버 라우트(\`/api/quotes\`)에서만 수행합니다. 한국 주식 실시간이 필요하면 한국투자증권
KIS OpenAPI provider를 \`lib/market/\`에 추가해 교체할 수 있습니다.

## 프로젝트 구조

\`\`\`
app/
  (auth)/login, (auth)/register     # 인증 페이지
  dashboard/                        # 요약 + 차트 + 포트폴리오 목록
  dashboard/portfolios/[id]/        # 포트폴리오 상세 + 거래 입력/목록
  api/                              # register, portfolios, transactions, quotes, auth
components/                         # 차트·표·폼 등 UI
lib/
  auth.ts, prisma.ts, validation.ts
  portfolio.ts                      # 보유/손익 집계 (평균원가법)
  data.ts                           # 서버 컴포넌트용 데이터 로더
  market/                           # 시세 provider 추상화 (finnhub + mock)
prisma/schema.prisma, prisma/seed.ts
\`\`\`

## 프로덕션 참고

- SQLite → Postgres 전환: \`prisma/schema.prisma\`의 \`datasource\` provider/URL 변경
- 배포 시 \`AUTH_URL\`(사이트 URL)과 강력한 \`AUTH_SECRET\` 설정
