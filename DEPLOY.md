# 배포 가이드 — 브라우저로 접속하기

이 앱은 정적 HTML이 아니라 **서버가 도는 Next.js 풀스택 앱**입니다(로그인·DB·API).
따라서 파일을 여는 게 아니라 **호스팅해서 서버를 띄워야** 브라우저(URL)로 접속됩니다.

필요한 환경변수는 공통입니다:

| 변수 | 설명 |
|------|------|
| `AUTH_SECRET` | 세션 서명 키. `npx auth secret` 또는 `openssl rand -base64 32` |
| `AUTH_URL` | 배포된 사이트의 공개 URL (예: `https://portfolio-care.fly.dev`) |
| `DATABASE_URL` | DB 연결 문자열 (아래 각 방식 참고) |
| `FINNHUB_API_KEY` | (선택) 실시간 시세. 없으면 데모 시세로 자동 동작 |

---

## A. Docker로 실행 (가장 이식성 높음)

이 저장소에는 `Dockerfile`이 있어, 도커만 있으면 어디서든 동일하게 띄울 수 있습니다.

```bash
docker build -t portfolio-care .
docker run -p 3000:3000 \
  -e AUTH_SECRET="$(openssl rand -base64 32)" \
  -e AUTH_URL="http://localhost:3000" \
  -e DATABASE_URL="file:/data/prod.db" \
  -v pc-data:/data \
  portfolio-care
# 브라우저에서 http://localhost:3000
```

- 컨테이너는 시작 시 `prisma migrate deploy`로 스키마를 적용한 뒤 서버를 띄웁니다.
- `-v pc-data:/data` 볼륨으로 SQLite 데이터를 영구 보존합니다.
- 데모 데이터가 필요하면: `docker exec -it <컨테이너> npm run db:seed`

## B. Fly.io — SQLite 그대로, 영구 볼륨

SQLite를 유지하면서 공개 URL을 얻는 가장 간단한 경로입니다(볼륨 지원).

```bash
fly launch --no-deploy            # 앱 이름/리전 선택 (Dockerfile 자동 감지)
fly volumes create pc_data --size 1
fly secrets set AUTH_SECRET="$(openssl rand -base64 32)" AUTH_URL="https://<앱>.fly.dev"
```

`fly.toml`에 볼륨 마운트와 DB 경로를 추가:

```toml
[env]
  DATABASE_URL = "file:/data/prod.db"

[[mounts]]
  source = "pc_data"
  destination = "/data"
```

그다음 `fly deploy` → 발급된 `https://<앱>.fly.dev` 로 접속.

## C. Vercel + Neon(Postgres) — 무료 서버리스

Vercel은 서버리스라 파일 SQLite가 유지되지 않으므로 **DB를 Postgres로 교체**합니다.
무료 [Neon](https://neon.tech) Postgres를 쓰면 전액 무료로 배포됩니다.

1. `prisma/schema.prisma`의 datasource를 변경:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
2. Neon에서 프로젝트 생성 → 연결 문자열 복사.
3. Vercel에 이 저장소를 import. Environment Variables에
   `DATABASE_URL`(Neon URL), `AUTH_SECRET`, `AUTH_URL`(배포 도메인) 설정.
4. Build Command를 `prisma migrate deploy && next build`로 지정(또는
   `package.json`의 build를 그렇게 조정).
5. 배포 후 시드가 필요하면 로컬에서 `DATABASE_URL=<neon> npm run db:seed` 1회 실행.

> 로컬 개발은 계속 SQLite(`file:./dev.db`)로 두고, 위 변경은 배포 브랜치에서만
> 적용하면 편합니다.

---

## 데모 계정 (시드 실행 시)

```
구독자:  demo@portfolio.care  / demo1234
관리자:  admin@portfolio.care / admin1234
```
