# Docker Deployment Guide

This directory contains the Docker deployment assets for Crinity Helpdesk.

## Layout

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

## What Each File Does

- `Dockerfile`: shared multi-stage build for both admin and public apps
- `docker-compose.yml`: orchestrates `sqld`, `migrate`, `public`, `admin`, and `nginx`
- `nginx.entrypoint.sh`: env-driven Nginx config generator script
- `env/.env.production`: production deployment environment values
- `env/.env.production.example`: production env template
- `env/.env.production.local`: local production-style override
- `certs/`: certificate storage location

## Usage

You can run commands either from the project root or from inside the `docker/` directory.

### From Project Root

```bash
docker compose -f docker/docker-compose.yml --env-file docker/env/.env.production up --build -d
```

### From Inside `docker/`

```bash
cd docker
docker compose --env-file env/.env.production up --build -d
```

## Operator-Facing Settings

The main values operations teams usually change live in `env/.env.production`.

```bash
PUBLIC_URL=https://helpdesk.company.com
ADMIN_URL=https://admin.company.com

# Optional explicit overrides; leave blank to derive from URLs
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

### Automatic `server_name` Resolution

- If `PUBLIC_SERVER_NAME` and `ADMIN_SERVER_NAME` are empty,
- the startup script derives them from `PUBLIC_URL` and `ADMIN_URL`.

Example:

```bash
PUBLIC_URL=https://helpdesk.company.com
ADMIN_URL=https://admin.company.com
```

This is enough for Nginx to resolve:

- `helpdesk.company.com`
- `admin.company.com`

### HTTPS/TLS

- `ENABLE_TLS=1` enables SSL termination on the HTTPS port and redirects HTTP traffic.
- `ENABLE_TLS=0` keeps the setup HTTP-only.
- Certificate and key paths are fully configurable via env vars.

## Common Commands

```bash
# Start services
docker compose -f docker/docker-compose.yml --env-file docker/env/.env.production up -d

# Rebuild and start
docker compose -f docker/docker-compose.yml --env-file docker/env/.env.production up --build -d

# Follow logs
docker compose -f docker/docker-compose.yml --env-file docker/env/.env.production logs -f

# Stop services
docker compose -f docker/docker-compose.yml --env-file docker/env/.env.production down
```

## Notes

- The build context is the repository root (`..`).
- Since the compose file now lives in `docker/`, the Dockerfile, nginx bootstrap script, env files, and certs are colocated here.
- Replace all secrets in `env/.env.production` before using this in a real environment.
- `server_name` is not hardcoded. It can be injected explicitly or derived automatically from URLs.
- Upload limits, HTTP/HTTPS ports, and TLS certificate paths are all externally configurable.
