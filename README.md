# Crinity Ticket System

**English** | [한국어](./README.ko.md)

<p align="center">
  <strong>Modern Ticket Management System for Customer Support</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js" alt="Next.js 15">
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react" alt="React 19">
  <img src="https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat-square&logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/Prisma-6-2D3748?style=flat-square&logo=prisma" alt="Prisma">
  <img src="https://img.shields.io/badge/PostgreSQL-16-336791?style=flat-square&logo=postgresql" alt="PostgreSQL">
</p>

---

## 📋 Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Features](#features)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Database](#database)
- [Contributing](#contributing)
- [License](#license)

---

## 🎯 Overview

**Crinity Ticket System** is a comprehensive ticket management solution for SaaS products. It provides a seamless experience for customers to submit inquiries and for support agents to efficiently manage and resolve them.

### Key Features

- **Customer Portal**: Easy ticket submission with file attachments
- **Admin Console**: Complete ticket lifecycle management
- **Auto-Assignment**: Smart round-robin assignment based on agent expertise and workload
- **AI-Powered Analysis**: LLM integration for customer behavior analysis (Ollama/Gemini)
- **Audit Logging**: Complete activity tracking with XLSX export for compliance
- **Multi-tenant Branding**: Custom branding per domain
- **Security**: CAPTCHA, Rate Limiting, Signed Cookies

---

## 🛠 Tech Stack

### Frontend
- **Next.js 15** (App Router)
- **React 19**
- **TypeScript**
- **Tailwind CSS**
- **shadcn/ui**

### Backend
- **Next.js API Routes**
- **Server Actions**
- **NextAuth.js v5** (Auth.js)
- **Prisma ORM**
- **PostgreSQL 16**

### AI & Integrations
- **Ollama** (Local LLM)
- **Google Gemini API**
- **AWS S3** (File storage)
- **SMTP/SES/Resend** (Email)
- **GitHub/GitLab API** (Issue integration)

---

## ✨ Features

### Customer Features

| Feature | Description |
|---------|-------------|
| Ticket Creation | Create tickets with category, priority, attachments |
| CAPTCHA | Cloudflare Turnstile protection |
| Rate Limiting | 5 requests per minute per IP |
| File Attachments | Up to 10MB, 20 files per ticket |
| Ticket Lookup | Access via ticket number + email |
| Thread View | View status and conversation history |

### Admin Features

| Feature | Description |
|---------|-------------|
| **Dashboard** | Statistics and agent performance metrics |
| **Ticket Management** | List, filter, assign, transfer, status change |
| **Auto-Assignment** | Category expertise + load balancing algorithm |
| **Agent Management** | CRUD with phone number support |
| **Customer Management** | Customer profiles with AI analysis |
| **Response Templates** | Pre-defined response templates |
| **Git Integration** | Link/create GitHub/GitLab issues |
| **Email Settings** | SMTP/SES/Resend configuration |
| **AI Settings** | Ollama/Gemini LLM configuration |
| **Audit Logs** | Complete activity tracking with XLSX export |
| **Branding** | Custom domain branding |

---

## 📁 Project Structure

```
crinity-ticket/
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── migrations/            # Database migrations
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── (public)/          # Customer-facing routes
│   │   ├── (admin)/           # Admin routes
│   │   └── api/               # API endpoints
│   ├── components/
│   │   ├── ui/                # shadcn/ui components
│   │   ├── app/               # App shell components
│   │   ├── ticket/            # Ticket components
│   │   └── admin/             # Admin components
│   ├── lib/
│   │   ├── db/                # Prisma client & queries
│   │   ├── auth/              # Authentication
│   │   ├── tickets/           # Ticket services
│   │   ├── audit/             # Audit logging
│   │   ├── llm/               # LLM integration
│   │   └── email/             # Email services
│   └── types/                 # TypeScript types
├── scripts/                   # Utility scripts
├── tests/                     # Test files
└── docker-compose.yml         # Docker setup
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 20.x or higher
- **pnpm** 10.x or higher
- **Docker** (optional)
- **PostgreSQL** 16 (if not using Docker)

### Quick Start (Docker)

```bash
# Clone repository
git clone <repository-url>
cd crinity-ticket

# Copy environment file
cp .env.example .env

# Start with Docker Compose
docker compose up --build

# Access application
open http://localhost:3000
```

### Local Development

```bash
# Install dependencies
pnpm install

# Copy environment file
cp .env.example .env
# Edit .env with your database URL

# Generate Prisma client
pnpm prisma generate

# Run migrations
pnpm prisma migrate dev

# Seed admin account
npx tsx scripts/seed-admin.ts

# Start development server
pnpm dev

# Access application
open http://localhost:3000
```

### Default Admin Account

After seeding:

- **Email**: `admin@crinity.io`
- **Password**: `admin1234`

---

## 🔐 Environment Variables

### Required

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/crinity"

# Auth
AUTH_SECRET="your-secret-key-min-32-characters"
AUTH_TRUST_HOST=true  # For localhost development

# Ticket Access
TICKET_ACCESS_SECRET="another-secret-key-for-ticket-access"
```

### Optional

```bash
# OAuth
AUTH_GOOGLE_ID="your-google-client-id"
AUTH_GOOGLE_SECRET="your-google-client-secret"
AUTH_GITHUB_ID="your-github-client-id"
AUTH_GITHUB_SECRET="your-github-client-secret"

# Email (SMTP/SES/Resend)
SMTP_HOST="smtp.example.com"
SMTP_PORT="587"
SMTP_USER="user@example.com"
SMTP_PASS="password"

# AWS SES
SES_ACCESS_KEY="your-access-key"
SES_SECRET_KEY="your-secret-key"
SES_REGION="ap-northeast-2"

# Resend
RESEND_API_KEY="your-resend-api-key"

# Storage (Production)
AWS_ACCESS_KEY_ID="your-access-key"
AWS_SECRET_ACCESS_KEY="your-secret-key"
AWS_REGION="ap-northeast-2"
AWS_S3_BUCKET_NAME="crinity-uploads"

# CAPTCHA
TURNSTILE_SECRET_KEY="your-turnstile-secret"

# LLM (Optional)
OLLAMA_URL="http://localhost:11434"
OLLAMA_MODEL="llama3.2"
GEMINI_API_KEY="your-gemini-api-key"

# Git Integration
GIT_TOKEN_ENCRYPTION_KEY="32-byte-encryption-key"
```

---

## 🗄 Database

### Core Entities

- `Ticket` - Ticket information
- `Agent` - Support agents with phone numbers
- `Customer` - Customer profiles with AI analysis
- `Category` - Ticket categories
- `Comment` - Comments/replies
- `Attachment` - File attachments
- `AuditLog` - Complete activity logging
- `LLMSettings` - AI configuration
- `EmailSettings` - Email provider settings

### Prisma Commands

```bash
# Generate migration
pnpm prisma migrate dev --name <migration-name>

# Deploy to production
pnpm prisma migrate deploy

# Generate client
pnpm prisma generate

# Open Prisma Studio
pnpm prisma studio
```

---

## 🧪 Testing

```bash
# Run all tests
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

**Crinity Ticket System** - Efficient customer support ticket management solution
