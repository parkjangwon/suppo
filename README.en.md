# Crinity Helpdesk System

<p align="center">
  <strong>Modern Customer Support Helpdesk System</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js" alt="Next.js 15">
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react" alt="React 19">
  <img src="https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat-square&logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/Prisma-6-2D3748?style=flat-square&logo=prisma" alt="Prisma">
  <img src="https://img.shields.io/badge/SQLite-3-003B57?style=flat-square&logo=sqlite" alt="SQLite">
  <img src="https://img.shields.io/badge/LibSQL-blue?style=flat-square" alt="LibSQL">
</p>

---

## 📋 Table of Contents

- [Project Overview](#-project-overview)
- [Tech Stack](#-tech-stack)
- [Key Features](#-key-features)
- [Architecture](#-architecture)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Deployment](#-deployment)
- [Database](#-database)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🎯 Project Overview

**Crinity Helpdesk System** is a comprehensive helpdesk solution for technical support and VOC (Voice of Customer) processing for SaaS products. When customers submit inquiries through the web, they are automatically assigned to agents for efficient processing.

### Core Values

- **Customer-Centric**: Intuitive interface for easy inquiry submission and tracking
- **Efficient Operations**: Auto-assignment and load balancing for agent task distribution
- **AI-Powered**: LLM integration for customer behavior analysis and insights
- **Security-First**: Audit logs, rate limiting, signed cookies
- **Scalable**: Git integration, email notifications, file attachments, SAML SSO

---

## 🛠 Tech Stack

### Frontend
- **Next.js 15** (App Router)
- **React 19**
- **TypeScript**
- **Tailwind CSS**
- **shadcn/ui** (Radix UI based)

### Backend
- **Next.js API Routes**
- **Server Actions**
- **NextAuth.js v5** (Auth.js)
- **Prisma ORM**

### Database
- **SQLite 3** (Local Development)
- **LibSQL** (Production, Multi-container)

### AI & Integrations
- **Ollama** (Local LLM)
- **Google Gemini API**
- **AWS S3** (File Storage)
- **SMTP/SES/Resend** (Email Delivery)
- **GitHub/GitLab API** (Issue Integration)

### Infrastructure
- **Docker** (Production Deployment)
- **Docker Compose** (Multi-container Orchestration)
- **Nginx** (Reverse Proxy, SSL)
- **pnpm** (Package Manager)

---

## ✨ Key Features

### 1. Customer Features (Public)

| Feature | Description |
|---------|-------------|
| **Ticket Creation** | Name, email, phone, department, request type, priority, title, content, attachments |
| **Rate Limiting** | 5 requests per minute per IP |
| **File Attachments** | Max 10MB, 20 files, supports images/documents/archives |
| **Ticket Lookup** | Ticket number + email verification, signed cookie issuance |
| **Conversation Thread** | Status and conversation history, additional messages |

### 2. Admin Features

| Feature | Description |
|---------|-------------|
| **Dashboard** | Today/Weekly/Monthly statistics, status overview, agent performance |
| **Ticket List** | Filters (status/category/priority/assignee), search, sorting |
| **Ticket Detail** | Status/priority/assignee changes, comments, internal notes |
| **Auto-Assignment** | Category expertise + load balancing algorithm |
| **Ticket Transfer** | Transfer to other agents with reason logging |
| **Agent Management** | CRUD, phone number management, auto-reassignment on deactivation |
| **Customer Management** | Customer profiles, ticket history, notes, AI analysis |
| **Response Templates** | Manage common response templates, variable substitution ({{ticket.id}}, {{customer.name}}), conditional rendering, per-request-type recommendations, permission validation, variable preview/verification |
| **Git Integration** | GitHub/GitLab issue linking/creation, audit logging, unlink/edit, duplicate prevention, provider URL validation, webhook status sync |

### 3. Settings

| Feature | Description |
|---------|-------------|
| **Email Settings** | SMTP, AWS SES, Resend provider configuration |
| **AI/LLM Settings** | Ollama, Google Gemini API keys, customer analysis toggle |
| **Branding** | Custom logos, colors, favicon per domain |
| **SAML SSO** | Enterprise SSO integration (BoxyHQ) |
| **Request Types** | Default assignee teams and priorities per category |
| **SLA Policies** | Service level agreement settings, auto-pause on WAITING status |

### 4. Audit & Security

| Feature | Description |
|---------|-------------|
| **Audit Logs** | All admin/agent actions logged, XLSX export |
| **Activity Logs** | Ticket status changes, assignments, transfers |
| **Security** | Ticket access tokens, sensitive data encryption |

### 5. System Features

| Feature | Description |
|---------|-------------|
| **Email Notifications** | Ticket received/assigned/replied/status changed, threading headers |
| **Outbox Pattern** | Email delivery retry (max 3 attempts) |
| **AI Customer Analysis** | Customer pattern analysis based on ticket history |
| **File Storage** | Dev: Local, Production: AWS S3 |
| **Response Templates** | Variable substitution ({{ticket.id}}, {{customer.name}}), per-request-type recommendations, usage audit logs, template permission validation, variable preview/verification, score-based recommendation algorithm |
| **Git Integration** | Audit logging on issue link/create, webhook support, unlink/edit APIs, duplicate prevention, provider URL validation, Git Operation Queue (retry mechanism), automatic ticket status sync |

---

## 🏗 Architecture

### Local Development
```
┌─────────────────────────────────┐
│  Next.js App (pnpm dev)         │
│  - SQLite (dev.db)              │
└─────────────────────────────────┘
```

### Production (Docker Compose)
```
┌─────────────────────────────────────────────────────────────┐
│                    Nginx (SSL)                             │
│  ┌──────────────────────┐  ┌──────────────────────┐       │
│  │   helpdesk.com       │  │   admin.com          │       │
│  └──────────┬───────────┘  └──────────┬───────────┘       │
│             │                        │                      │
│             ▼                        ▼                      │
│  ┌──────────────────────┐  ┌──────────────────────┐       │
│  │   Public App (xN)    │  │   Admin App          │       │
│  │   APP_TYPE=public    │  │   APP_TYPE=admin    │       │
│  └──────────┬───────────┘  └──────────┬───────────┘       │
│             │                        │                      │
│             └────────────┬───────────┘                      │
│                          ▼                                 │
│  ┌─────────────────────────────────────────────┐             │
│  │         LibSQL (sqld)                      │             │
│  │   HTTP API on :8889 (internal only)       │             │
│  └─────────────────────────────────────────────┘             │
└─────────────────────────────────────────────────────────────┘
```

**Architecture Features:**
- **Public App**: Horizontally scalable (`docker-compose up --scale public=N`)
- **Admin App**: Horizontally scalable (`docker-compose up --scale admin=N`)
- **LibSQL**: Internal network access only, no external exposure
- **Nginx**: SSL termination, domain separation, 600MB file upload support

---

## 📁 Project Structure

```
crinity-helpdesk/
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── migrations/            # Migration files
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── (public)/          # Customer routes
│   │   │   ├── page.tsx       # Landing page
│   │   │   └── ticket/        # Ticket pages
│   │   ├── (admin)/           # Admin routes
│   │   │   └── admin/         # Admin pages
│   │   └── api/               # API endpoints
│   ├── components/
│   │   ├── ui/                # shadcn/ui components
│   │   ├── app/               # App shell components
│   │   ├── ticket/            # Ticket components
│   │   └── admin/             # Admin components
│   ├── lib/
│   │   ├── db/                # Prisma/LibSQL client and queries
│   │   │   ├── client.ts      # Prisma + LibSQL Adapter
│   │   │   └── raw.ts         # LibSQL Raw Client
│   │   ├── auth/              # Auth config and guards
│   │   ├── audit/             # Audit logging
│   │   ├── llm/               # LLM integration (Ollama/Gemini)
│   │   ├── tickets/           # Ticket service
│   │   ├── assignment/        # Assignment algorithm
│   │   ├── email/             # Email delivery
│   │   ├── storage/           # File storage
│   │   └── utils/             # Utilities
│   └── types/                 # TypeScript types
├── docker-compose.yml          # Production deployment config
├── Dockerfile                  # Multi-stage build
├── nginx.conf                 # Reverse proxy config
├── scripts/                   # Utility scripts
├── tests/                     # Test files
└── .env.production.example    # Production env template
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 20.x or higher
- **pnpm** 10.x or higher
- **Docker** (for production deployment)
- **Docker Compose** (for production deployment)

---

### ⚡ Quick Install (Recommended)

```bash
./install.sh
pnpm dev
```

`install.sh` handles everything at once:
- Copies `.env.example` → `.env` and generates 3 secrets with `openssl rand -base64 32`
- Runs `pnpm install`
- Runs `prisma migrate deploy` + `prisma db seed` (creates initial admin account)

Won't overwrite if `.env` already exists.

---

### 🔧 Manual Install

```bash
# 1. Install dependencies
pnpm install

# 2. Set up environment variables
cp .env.example .env
# Open .env and fill in AUTH_SECRET, TICKET_ACCESS_SECRET, GIT_TOKEN_ENCRYPTION_KEY
# with outputs from: openssl rand -base64 32

# 3. Database migration + initial data
pnpm prisma migrate deploy
pnpm prisma db seed

# 4. Start dev server
pnpm dev
```

Visit `http://localhost:3000` in your browser.

---

### Local Production Test

```bash
# Build and run
pnpm build
pnpm start
```

---

### Initial Admin Account

An account is created using `INITIAL_ADMIN_EMAIL` / `INITIAL_ADMIN_PASSWORD` from `.env` (default: `admin@crinity.io` / `admin1234`).

> **Security Note**: Change your password on first login. The system automatically redirects you to the password change page.

---

## 🔐 Environment Variables

### Design Philosophy

Crinity Helpdesk is designed to manage **only the essential environment variables** in the `.env` file, with all other settings managed via the **web admin console**.

### Local Development (`.env.example`)

```bash
# Database (Required) - Local SQLite
DATABASE_URL="file:./prisma/dev.db"

# Auth (Required) - Session encryption, minimum 32 characters recommended
AUTH_SECRET="your-secret-key-min-32-characters"
AUTH_URL="http://localhost:3000"

# Ticket Access (Required) - Ticket access token signing, minimum 32 characters recommended
TICKET_ACCESS_SECRET="another-secret-key-for-ticket-access"

# Git Integration (Required) - Git token encryption, 32 bytes recommended
GIT_TOKEN_ENCRYPTION_KEY="32-byte-encryption-key"

# Initial Admin Account (Required) - First admin account
INITIAL_ADMIN_EMAIL="admin@crinity.io"
INITIAL_ADMIN_PASSWORD="admin1234"
```

### Production (`.env.production.example`)

```bash
# Domains
PUBLIC_URL=https://helpdesk.company.com
ADMIN_URL=https://admin.company.com

# Auth
AUTH_SECRET=<32+ random characters>
TICKET_ACCESS_SECRET=<32+ random characters>
GIT_TOKEN_ENCRYPTION_KEY=<32 byte key>

# Initial Admin
INITIAL_ADMIN_EMAIL=admin@company.com
INITIAL_ADMIN_PASSWORD=<initial password>

# LibSQL (sqld container internal address — no change needed)
DATABASE_URL=http://sqld:8889
DATABASE_AUTH_TOKEN=
```

### Web Console Settings

The following settings are managed in the **admin web console**, not in `.env`:

| Setting Category | Path | Description |
|------------------|------|-------------|
| **Email Settings** | `/admin/settings/email` | SMTP, AWS SES, Resend configuration |
| **AI/LLM Settings** | `/admin/settings/llm` | Ollama, Google Gemini API keys |
| **Branding** | `/admin/settings/branding` | Logo, colors, company name, footer info |
| **SAML SSO** | `/admin/settings/saml` | Enterprise SSO integration settings |
| **Request Types** | `/admin/settings/request-types` | Ticket request type management |
| **Git Integration** | `/admin/settings/git` | GitHub/GitLab token settings |
| **Response Templates** | `/admin/templates` | Template CRUD, variable management, recommendation settings |

---

## 🚢 Deployment

### Production Deployment (Docker Compose)

```bash
# 1. Build Docker image
docker build -t crinity-helpdesk:latest .

# 2. Set up production environment
cp .env.production.example .env.production
# Fill in .env.production with actual values

# 3. Prepare SSL certificates
mkdir -p certs
# Place public.crt, public.key, admin.crt, admin.key in certs/ folder

# 4. Start containers
docker compose -f docker-compose.yml --env-file .env.production up -d

# 5. Run migration (first time only)
docker compose -f docker-compose.yml --env-file .env.production run --rm migrator
```

### Horizontal Scaling

```bash
# Scale public app to 3 instances
docker compose -f docker-compose.yml --env-file .env.production up -d --scale public=3

# Scale admin app to 2 instances
docker compose -f docker-compose.yml --env-file .env.production up -d --scale admin=2
```

### Deployment Management

```bash
# View logs
docker compose logs -f public

# Restart containers
docker compose restart public

# Stop containers
docker compose down

# Full removal with volumes (warning!)
docker compose down -v
```

---

## 🗄 Database

### Core Entities

- `Ticket` - Ticket info (department, request type included)
- `Agent` - Agent info (phone number, password change history)
- `Customer` - Customer info (AI analysis included)
- `Category` - Ticket category (agent expertise)
- `RequestType` - Request type (selected on ticket creation)
- `Comment` - Comments/replies
- `Attachment` - File attachments
- `AuditLog` - Audit logs (all activities)
- `LLMSettings` - AI settings
- `EmailSettings` - Email provider settings
- `TicketActivity` - Ticket activity logs
- `TicketTransfer` - Ticket transfer history
- `ResponseTemplate` - Response templates (variable substitution, conditional rendering)
- `GitLink` - Git issue links
- `EmailDelivery` - Email delivery queue (Outbox pattern)
- `EmailThreadMapping` - Email threading management
- `SLAClock` - SLA time tracking (pause/resume support)

### Prisma Commands

```bash
# Create migration
pnpm prisma migrate dev --name <migration-name>

# Production migration
pnpm prisma migrate deploy

# Generate Prisma client
pnpm prisma generate

# Open Prisma Studio
pnpm prisma studio
```

---

## 🧪 Testing

```bash
# All tests
pnpm test

# E2E tests
pnpm test:e2e

# Specific test file
pnpm test tests/unit/assignment/pick-assignee.spec.ts
```

---

## 🤝 Contributing

Contributions are welcome! Please submit a PR.

---

## 📄 License

This project is licensed under the MIT License.

---

**Crinity Helpdesk System** - Ticket Management Solution for Efficient Customer Support
