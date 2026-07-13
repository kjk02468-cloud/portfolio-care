# 배포 가이드 — 브라우저로 접속하기

이 앱은 정적 HTML이 아니라 **서버가 도는 Next.js 풀스택 앱**(로그인·DB·API)이라,
호스팅해서 서버를 띄워야 URL로 접속됩니다. DB는 **Postgres**를 사용합니다
(무료 [Neon](https://neon.tech) 추천).

공통 환경변수:

| 변수 | 설명 |
|------|------|
| `DATABASE_URL` | Postgres 연결 문자열 (예: Neon `postgresql://…?sslmode=require`) |
| `AUTH_SECRET` | 세션 서명 키. `npx auth secret` 또는 `openssl rand -base64 32` |
| `AUTH_URL` | 배포된 공개 URL (예: `https://your-app.vercel.app`) |
| `FINNHUB_API_KEY` | (선택) 실시간 시세. 없으면 데모 시세로 자동 동작 |
| `FMP_API_KEY` | (선택) G값·밸류에이션 자동화용 히스토리 데이터. 없으면 mock으로 동작 |
| `ANTHROPIC_API_KEY` | (선택) 보고서 서술 초안(하우스 보이스). 없으면 서술은 `[대괄호]` 템플릿 유지 |
| `ADMIN_EMAILS` | (선택) 쉼표 구분 관리자 이메일. 로그인 시 자동 ADMIN 승격 |
| `CRON_SECRET` | 일일 지표 자동 새로고침 크론 인증. `openssl rand -base64 32` |

---

## A. Vercel + Neon (무료, 추천)

1. **Neon DB 생성** — https://neon.tech → 프로젝트 만들고 연결 문자열 복사.
2. **Vercel에 Import** — https://vercel.com/new → 이 GitHub 저장소 선택.
3. **환경변수 입력** (Project Settings → Environment Variables):
   `DATABASE_URL`(Neon), `AUTH_SECRET`, `AUTH_URL`(배포 도메인).
4. **Build Command 설정** — `npx prisma migrate deploy && next build`
   (Settings → Build & Development → Build Command override).
   → 배포 시 DB 스키마가 자동 적용됩니다.
5. **Deploy** → 발급된 `https://<앱>.vercel.app` 로 접속.
6. (선택) 데모 데이터 넣기 — 로컬에서 한 번:
   `DATABASE_URL="<Neon>" npm run db:seed`
   → 데모 계정: `demo@portfolio.care / demo1234`, `admin@portfolio.care / admin1234`

Vercel은 `vercel.json`의 크론 설정을 자동으로 읽어 매일 평일 22:00 UTC에
`/api/cron/refresh-indicators`를 호출합니다(G4·차트·G1~G3 제안값·킬신호 전 종목
갱신). **Hobby 플랜은 크론이 지정 시각 근처에서만 실행**되고 하루 1회 제한이라
정확한 시각 보장은 안 됩니다 — Pro 플랜이면 정확히 실행돼요.

## B. Docker (어디서든)

Postgres URL만 있으면 `Dockerfile`로 어디서든 동일하게 띄울 수 있습니다.

```bash
docker build -t portfolio-care .
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://USER:PASS@HOST/DB?sslmode=require" \
  -e AUTH_SECRET="$(openssl rand -base64 32)" \
  -e AUTH_URL="http://localhost:3000" \
  portfolio-care
# http://localhost:3000
```

컨테이너는 시작 시 `prisma migrate deploy`로 스키마를 적용한 뒤 `next start`로 서빙합니다.
Railway·Render·Fly 등 Docker/Node를 지원하는 호스트도 같은 방식으로 배포됩니다.

## 로컬 개발

로컬에서도 Postgres가 필요합니다(Neon 무료 DB를 그대로 써도 됩니다):

```bash
npm install
cp .env.example .env        # DATABASE_URL(Postgres), AUTH_SECRET 채우기
npx prisma migrate deploy   # 또는 개발 중 스키마 변경 시 npx prisma migrate dev
npm run db:seed             # (선택) 데모 데이터
npm run dev                 # http://localhost:3000
```
