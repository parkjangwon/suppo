# Docker 배포 가이드

이 디렉터리는 Crinity Helpdesk의 Docker 배포 자산을 모아둔 위치입니다.

## 구성

```text
docker/
├── Dockerfile
├── docker-compose.yml
├── nginx.entrypoint.sh
├── certs/
│   ├── admin.crt
│   ├── admin.key
│   ├── public.crt
│   └── public.key
└── env/
    ├── .env.production
    ├── .env.production.example
    └── .env.production.local
```

## 파일 설명

- `Dockerfile`: admin/public 공용 멀티스테이지 이미지 빌드
- `docker-compose.yml`: `sqld`, `migrate`, `public`, `admin`, `nginx` 구성
- `nginx.entrypoint.sh`: 환경변수 기반 Nginx 설정 생성 스크립트
- `env/.env.production`: 운영 배포용 환경 변수
- `env/.env.production.example`: 운영 환경 변수 템플릿
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
```

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
