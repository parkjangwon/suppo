# Docker 배포 가이드

이 디렉터리는 Crinity Helpdesk의 Docker 배포 자산을 모아둔 위치입니다.

## 구성

```text
docker/
├── Dockerfile
├── docker-compose.yml
├── nginx.conf
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
- `nginx.conf`: 공개 도메인과 관리자 도메인 라우팅
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

## 참고

- build context는 프로젝트 루트(`..`)를 사용합니다.
- compose 파일은 `docker/`에 있으므로 `Dockerfile`, `nginx.conf`, `env/`, `certs/`도 같은 폴더 안에서 함께 관리합니다.
- 운영 전에 `env/.env.production`의 시크릿 값은 반드시 교체해야 합니다.
