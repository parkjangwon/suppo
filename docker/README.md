# Docker 배포 가이드

이 디렉터리는 Suppo의 Docker 배포 자산을 모아둔 위치입니다.

## 구성

```text
docker/
├── Dockerfile
├── apache-vhosts.conf.example
├── docker-compose.backend.yml
├── docker-compose.yml
├── nginx.entrypoint.sh
├── certs/
│   ├── admin.crt
│   ├── admin.key
│   ├── public.crt
│   └── public.key
└── env/
    ├── .env.backend
    ├── .env.backend.example
    ├── .env.production
    ├── .env.production.example
    └── .env.production.local
```

## 파일 설명

- `Dockerfile`: admin/public 공용 멀티스테이지 이미지 빌드
- `docker-compose.yml`: 올인원 배포용. `sqld`, `migrate`, `bootstrap`, `public`, `admin`, `nginx` 구성
- `docker-compose.backend.yml`: 백엔드 전용 배포용. `nginx` 없이 `public/admin`을 `3000/3001`로 직접 리슨
- `apache-vhosts.conf.example`: 외부 Apache reverse proxy 예시
- `nginx.entrypoint.sh`: 환경변수 기반 Nginx 설정 생성 스크립트
- `env/.env.production`: 운영 배포용 환경 변수
- `env/.env.production.example`: 운영 환경 변수 템플릿
- `env/.env.backend`: 백엔드 전용 환경 변수
- `env/.env.backend.example`: 백엔드 전용 환경 변수 템플릿
- `env/.env.production.local`: 로컬 프로덕션 테스트용 오버라이드
- `certs/`: 인증서 파일 보관 위치

## 기본 사용법

프로젝트 루트에서 실행해도 되고, `docker/` 디렉터리 안에서 실행해도 됩니다.

### 루트에서 실행

```bash
docker compose -f docker/docker-compose.yml --env-file docker/env/.env.production up --build -d
```

### docker 디렉터리에서 실행

```bash
cd docker
docker compose --env-file env/.env.production up --build -d
```

올인원 기본 부팅 순서는 `sqld -> migrate -> bootstrap -> public/admin -> nginx` 입니다.

백엔드 모드는 `sqld -> migrate -> bootstrap -> public/admin` 입니다.

## 설치 절차

가장 빠른 방법:

```bash
./docker/install.sh
```

백엔드 모드:

```bash
./docker/install.sh --mode backend
```

환경 파일만 준비하고 실제 기동은 나중에 하려면:

```bash
./docker/install.sh --prepare-only
```

백엔드 모드에서 환경 파일만 준비하려면:

```bash
./docker/install.sh --mode backend --prepare-only
```

## 배포 모드

### 1. 올인원 (`docker-compose.yml`)

- 같은 서버 안에 `nginx + public + admin + sqld`를 모두 같이 올립니다.
- 외부 사용자는 `nginx`로만 접속합니다.
- 새 서버 한 대에 통째로 배포할 때 가장 단순합니다.

### 2. 백엔드 전용 (`docker-compose.backend.yml`)

- 외부 리버스 프록시는 호스트 OS 또는 별도 서버에 둡니다.
- compose는 `public`, `admin`, `sqld`, `migrate/bootstrap`만 담당합니다.
- `public/admin`은 `BACKEND_BIND_IP`에만 바인딩되므로 외부에 직접 노출하지 않고 내부망이나 loopback으로만 둘 수 있습니다.
- 외부 Apache는 `apache-vhosts.conf.example`처럼 reverse proxy를 설정해 `public/admin`으로 전달할 수 있습니다.

### 1. 환경 변수 파일 생성

프로젝트 루트에서:

```bash
cp docker/env/.env.production.example docker/env/.env.production
```

백엔드 모드를 쓸 경우:

```bash
cp docker/env/.env.backend.example docker/env/.env.backend
```

또는 `docker/` 디렉터리에서:

```bash
cd docker
cp env/.env.production.example env/.env.production
```

백엔드 모드를 쓸 경우:

```bash
cp env/.env.backend.example env/.env.backend
```

### 2. 필수 값 수정

올인원은 `env/.env.production`에서 최소한 아래 값들은 실제 운영 환경에 맞게 바꿔야 합니다.

- `PUBLIC_URL`
- `ADMIN_URL`
- `AUTH_SECRET`
- `TICKET_ACCESS_SECRET`
- `GIT_TOKEN_ENCRYPTION_KEY`
- `INITIAL_ADMIN_EMAIL`
- `INITIAL_ADMIN_PASSWORD`

백엔드는 `env/.env.backend`에서 아래 값들을 확인해야 합니다.

- `PUBLIC_URL`
- `ADMIN_URL`
- `BACKEND_BIND_IP`
- `PUBLIC_APP_PORT`
- `ADMIN_APP_PORT`
- `AUTH_SECRET`
- `TICKET_ACCESS_SECRET`
- `GIT_TOKEN_ENCRYPTION_KEY`
- `INITIAL_ADMIN_EMAIL`
- `INITIAL_ADMIN_PASSWORD`

### 3. 컨테이너 기동

올인원:

```bash
docker compose -f docker/docker-compose.yml --env-file docker/env/.env.production up --build -d
```

백엔드:

```bash
docker compose -f docker/docker-compose.backend.yml --env-file docker/env/.env.backend up --build -d
```

### 4. 상태 확인

올인원:

```bash
docker compose -f docker/docker-compose.yml --env-file docker/env/.env.production ps
docker compose -f docker/docker-compose.yml --env-file docker/env/.env.production logs -f
```

백엔드:

```bash
docker compose -f docker/docker-compose.backend.yml --env-file docker/env/.env.backend ps
docker compose -f docker/docker-compose.backend.yml --env-file docker/env/.env.backend logs -f
```

### 5. 첫 접속

- Public: `PUBLIC_URL`
- Admin: `ADMIN_URL`

최초 관리자 계정은 `INITIAL_ADMIN_EMAIL`, `INITIAL_ADMIN_PASSWORD` 값을 사용합니다.

## 운영팀이 주로 바꾸는 값

`env/.env.production`에서 아래 값만 바꾸면 됩니다.

```bash
PUBLIC_URL=https://helpdesk.company.com
ADMIN_URL=https://admin.company.com

# 필요 시 직접 지정, 비우면 URL에서 자동 추출
PUBLIC_SERVER_NAME=
ADMIN_SERVER_NAME=

NGINX_HTTP_PORT=80
NGINX_HTTPS_PORT=443

ENABLE_TLS=1
PUBLIC_TLS_CERT=/etc/nginx/certs/public.crt
PUBLIC_TLS_KEY=/etc/nginx/certs/public.key
ADMIN_TLS_CERT=/etc/nginx/certs/admin.crt
ADMIN_TLS_KEY=/etc/nginx/certs/admin.key

PUBLIC_CLIENT_MAX_BODY_SIZE=600M
ADMIN_CLIENT_MAX_BODY_SIZE=100M

AUTH_SECRET=<32자 이상 랜덤 문자열>
TICKET_ACCESS_SECRET=<32자 이상 랜덤 문자열>
GIT_TOKEN_ENCRYPTION_KEY=<32바이트 키>

INITIAL_ADMIN_EMAIL=admin@suppo.io
INITIAL_ADMIN_PASSWORD=admin1234

AUTO_BOOTSTRAP=if-empty
SEED_PROFILE=none
```

백엔드용 `env/.env.backend`에서는 아래 값도 함께 봐야 합니다.

```bash
BACKEND_BIND_IP=127.0.0.1
PUBLIC_APP_PORT=3000
ADMIN_APP_PORT=3001
```

- 같은 서버의 Apache가 프록시하면 `BACKEND_BIND_IP=127.0.0.1`
- 별도 내부망 Apache가 프록시하면 compose 서버의 사설 IP로 변경

### 자동 초기화 정책

- `migrate`는 항상 실행되며, [packages/db/prisma/migrate.ts](/Users/pjw/dev/project/suppo/packages/db/prisma/migrate.ts:1) 가 `migration.sql` 파일들을 LibSQL에 순서대로 적용합니다.
- `bootstrap`은 시작 시 `prisma generate`를 먼저 수행하고 DB가 비어 있는지 확인한 뒤 동작합니다.
- `AUTO_BOOTSTRAP=if-empty`이면 빈 DB에서만 최소 운영용 기본 데이터가 생성됩니다.
  - 초기 관리자
  - 기본 카테고리
  - 기본 문의 유형
  - 기본 업무 달력
  - 기본 브랜딩 레코드
- `SEED_PROFILE=demo`이면 빈 DB에서만 샘플 상담원, 고객, 티켓, 감사로그 등 데모 데이터까지 자동으로 채웁니다.
- 이미 데이터가 있는 DB에서는 자동 데모 시드를 건너뜁니다. 강제로 다시 넣고 싶으면 수동으로 `pnpm --filter=@suppo/db seed`를 실행하면 됩니다.

### server_name 자동 추출

- `PUBLIC_SERVER_NAME`, `ADMIN_SERVER_NAME`가 비어 있으면
- `PUBLIC_URL`, `ADMIN_URL`에서 host를 자동 추출합니다.

예:

```bash
PUBLIC_URL=https://helpdesk.company.com
ADMIN_URL=https://admin.company.com
```

위처럼만 넣어도 각각 `helpdesk.company.com`, `admin.company.com`이 자동 적용됩니다.

### HTTPS/TLS

- `ENABLE_TLS=1`이면 80 포트는 HTTPS로 리다이렉트하고, 443에서 SSL 종료합니다.
- `ENABLE_TLS=0`이면 HTTP만 사용합니다.
- 인증서/키 경로도 환경변수로 바꿀 수 있습니다.

## 주요 명령어

```bash
# 전체 기동
docker compose -f docker/docker-compose.yml --env-file docker/env/.env.production up -d

# 재빌드 포함 기동
docker compose -f docker/docker-compose.yml --env-file docker/env/.env.production up --build -d

# 로그 확인
docker compose -f docker/docker-compose.yml --env-file docker/env/.env.production logs -f

# 종료
docker compose -f docker/docker-compose.yml --env-file docker/env/.env.production down
```

백엔드 모드:

```bash
# 전체 기동
docker compose -f docker/docker-compose.backend.yml --env-file docker/env/.env.backend up -d

# 재빌드 포함 기동
docker compose -f docker/docker-compose.backend.yml --env-file docker/env/.env.backend up --build -d

# 로그 확인
docker compose -f docker/docker-compose.backend.yml --env-file docker/env/.env.backend logs -f

# 종료
docker compose -f docker/docker-compose.backend.yml --env-file docker/env/.env.backend down
```

## 운영 전 점검

배포 전에는 프로젝트 루트에서 아래 명령을 먼저 실행합니다.

```bash
# 운영 ENV 검증
pnpm ops:validate-env -- --env-file docker/env/.env.production

# 배포 직후 smoke test
pnpm ops:smoke -- --env-file docker/env/.env.production
```

로컬 프로덕션 테스트처럼 `PUBLIC_URL`, `ADMIN_URL`이 `http://`라면 아래처럼 실행합니다.

```bash
pnpm ops:validate-env -- --env-file docker/env/.env.production --allow-http
pnpm ops:smoke -- --env-file docker/env/.env.production --allow-http
```

## 참고

- build context는 프로젝트 루트(`..`)를 사용합니다.
- compose 파일은 `docker/`에 있으므로 `Dockerfile`, nginx 스크립트, `env/`, `certs/`도 같은 폴더 안에서 함께 관리합니다.
- 운영 전에 `env/.env.production`의 시크릿 값은 반드시 교체해야 합니다.
- `server_name`은 하드코딩하지 않고, 비워두면 URL에서 자동 추출하거나 필요 시 직접 주입할 수 있습니다.
- 업로드 제한, HTTP/HTTPS 포트, TLS 인증서 경로도 모두 외부 설정 가능합니다.
