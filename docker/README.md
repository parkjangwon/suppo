# Docker Deployment Guide

This directory contains the Docker deployment assets for Crinity Helpdesk.

## Layout

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

## What Each File Does

- `Dockerfile`: shared multi-stage build for both admin and public apps
- `docker-compose.yml`: orchestrates `sqld`, `migrate`, `public`, `admin`, and `nginx`
- `nginx.conf`: routes public and admin domains
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
- Since the compose file now lives in `docker/`, the Dockerfile, nginx config, env files, and certs are colocated here.
- Replace all secrets in `env/.env.production` before using this in a real environment.
