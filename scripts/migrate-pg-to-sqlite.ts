#!/usr/bin/env node
/**
 * PostgreSQL to SQLite Data Migration Script
 * 
 * This script migrates data from an existing PostgreSQL database to a new SQLite database.
 * Usage: npx tsx scripts/migrate-pg-to-sqlite.ts
 */

import { PrismaClient as PostgresClient } from '@prisma/client'
import { execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'

// PostgreSQL client (source)
const postgresUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL
if (!postgresUrl || !postgresUrl.includes('postgresql')) {
  console.error('❌ POSTGRES_URL or DATABASE_URL environment variable must point to PostgreSQL')
  process.exit(1)
}

const pgPrisma = new PostgresClient({
  datasources: {
    db: {
      url: postgresUrl,
    },
  },
})

const sqliteDbPath = path.join(process.cwd(), 'prisma', 'dev.db')

async function migrateData() {
  console.log('🚀 Starting PostgreSQL to SQLite migration...\n')

  try {
    // Step 1: Backup and remove existing SQLite database
    console.log('📦 Setting up SQLite database...')
    if (fs.existsSync(sqliteDbPath)) {
      const backupPath = `${sqliteDbPath}.backup.${Date.now()}`
      fs.renameSync(sqliteDbPath, backupPath)
      console.log(`   Existing database backed up to: ${backupPath}`)
    }

    // Step 2: Create fresh SQLite database with migrations
    console.log('\n📊 Creating fresh SQLite schema...')
    process.env.DATABASE_URL = `file:${sqliteDbPath}`
    execSync('npx prisma migrate deploy', {
      env: { ...process.env, DATABASE_URL: `file:${sqliteDbPath}` },
      stdio: 'inherit',
    })

    // Step 3: Initialize SQLite client
    const { PrismaClient: SQLiteClient } = await import('@prisma/client')
    const sqlitePrisma = new SQLiteClient({
      datasources: {
        db: {
          url: `file:${sqliteDbPath}`,
        },
      },
    })

    // Step 4: Migrate data table by table
    console.log('\n📤 Migrating data from PostgreSQL...\n')

    // Categories first (no dependencies)
    console.log('   Migrating categories...')
    const categories = await pgPrisma.category.findMany()
    if (categories.length > 0) {
      await sqlitePrisma.category.createMany({
        data: categories.map(c => ({
          id: c.id,
          name: c.name,
          description: c.description,
          sortOrder: c.sortOrder,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
        })),
        skipDuplicates: true,
      })
      console.log(`      ✓ ${categories.length} categories migrated`)
    }

    // Request Types
    console.log('   Migrating request types...')
    const requestTypes = await pgPrisma.requestType.findMany()
    if (requestTypes.length > 0) {
      await sqlitePrisma.requestType.createMany({
        data: requestTypes.map(rt => ({
          id: rt.id,
          name: rt.name,
          description: rt.description,
          channel: rt.channel,
          defaultPriority: rt.defaultPriority,
          defaultTeamId: rt.defaultTeamId,
          categoryId: rt.categoryId,
          autoAssignEnabled: rt.autoAssignEnabled,
          isActive: rt.isActive,
          sortOrder: rt.sortOrder,
          createdAt: rt.createdAt,
          updatedAt: rt.updatedAt,
        })),
        skipDuplicates: true,
      })
      console.log(`      ✓ ${requestTypes.length} request types migrated`)
    }

    // Teams
    console.log('   Migrating teams...')
    const teams = await pgPrisma.team.findMany()
    if (teams.length > 0) {
      await sqlitePrisma.team.createMany({
        data: teams.map(t => ({
          id: t.id,
          name: t.name,
          description: t.description,
          isActive: t.isActive,
          leaderId: t.leaderId,
          createdAt: t.createdAt,
          updatedAt: t.updatedAt,
        })),
        skipDuplicates: true,
      })
      console.log(`      ✓ ${teams.length} teams migrated`)
    }

    // Agents
    console.log('   Migrating agents...')
    const agents = await pgPrisma.agent.findMany()
    if (agents.length > 0) {
      await sqlitePrisma.agent.createMany({
        data: agents.map(a => ({
          id: a.id,
          name: a.name,
          email: a.email,
          phone: a.phone,
          role: a.role,
          isActive: a.isActive,
          maxTickets: a.maxTickets,
          avatarUrl: a.avatarUrl,
          authProvider: a.authProvider,
          passwordHash: a.passwordHash,
          passwordChangedAt: a.passwordChangedAt,
          isInitialPassword: a.isInitialPassword,
          lastAssignedAt: a.lastAssignedAt,
          createdAt: a.createdAt,
          updatedAt: a.updatedAt,
        })),
        skipDuplicates: true,
      })
      console.log(`      ✓ ${agents.length} agents migrated`)
    }

    // Agent Categories (junction table)
    console.log('   Migrating agent categories...')
    const agentCategories = await pgPrisma.agentCategory.findMany()
    if (agentCategories.length > 0) {
      await sqlitePrisma.agentCategory.createMany({
        data: agentCategories.map(ac => ({
          agentId: ac.agentId,
          categoryId: ac.categoryId,
          createdAt: ac.createdAt,
        })),
        skipDuplicates: true,
      })
      console.log(`      ✓ ${agentCategories.length} agent categories migrated`)
    }

    // Team Memberships
    console.log('   Migrating team memberships...')
    const teamMemberships = await pgPrisma.teamMember.findMany()
    if (teamMemberships.length > 0) {
      await sqlitePrisma.teamMember.createMany({
        data: teamMemberships.map(tm => ({
          id: tm.id,
          agentId: tm.agentId,
          teamId: tm.teamId,
          isLeader: tm.isLeader,
          createdAt: tm.createdAt,
          updatedAt: tm.updatedAt,
        })),
        skipDuplicates: true,
      })
      console.log(`      ✓ ${teamMemberships.length} team memberships migrated`)
    }

    // Customers
    console.log('   Migrating customers...')
    const customers = await pgPrisma.customer.findMany()
    if (customers.length > 0) {
      await sqlitePrisma.customer.createMany({
        data: customers.map(c => ({
          id: c.id,
          name: c.name,
          email: c.email,
          phone: c.phone,
          ticketCount: c.ticketCount,
          memo: c.memo,
          analysis: c.analysis,
          analyzedAt: c.analyzedAt,
          lastTicketAt: c.lastTicketAt,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
        })),
        skipDuplicates: true,
      })
      console.log(`      ✓ ${customers.length} customers migrated`)
    }

    // Tickets
    console.log('   Migrating tickets...')
    const tickets = await pgPrisma.ticket.findMany()
    if (tickets.length > 0) {
      await sqlitePrisma.ticket.createMany({
        data: tickets.map(t => ({
          id: t.id,
          ticketNumber: t.ticketNumber,
          customerId: t.customerId,
          customerName: t.customerName,
          customerEmail: t.customerEmail,
          customerPhone: t.customerPhone,
          customerOrganization: t.customerOrganization,
          subject: t.subject,
          description: t.description,
          categoryId: t.categoryId,
          priority: t.priority,
          status: t.status,
          assigneeId: t.assigneeId,
          requestTypeId: t.requestTypeId,
          teamId: t.teamId,
          source: t.source,
          environment: t.environment,
          serviceModule: t.serviceModule,
          firstResponseAt: t.firstResponseAt,
          resolvedAt: t.resolvedAt,
          closedAt: t.closedAt,
          reopenedCount: t.reopenedCount,
          tags: t.tags,
          searchVector: null, // SQLite doesn't support tsvector
          createdAt: t.createdAt,
          updatedAt: t.updatedAt,
          createdBy: t.createdBy,
          updatedBy: t.updatedBy,
        })),
        skipDuplicates: true,
      })
      console.log(`      ✓ ${tickets.length} tickets migrated`)
    }

    // Comments
    console.log('   Migrating comments...')
    const comments = await pgPrisma.comment.findMany()
    if (comments.length > 0) {
      await sqlitePrisma.comment.createMany({
        data: comments.map(c => ({
          id: c.id,
          ticketId: c.ticketId,
          authorId: c.authorId,
          authorType: c.authorType,
          content: c.content,
          isInternal: c.isInternal,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
        })),
        skipDuplicates: true,
      })
      console.log(`      ✓ ${comments.length} comments migrated`)
    }

    // Attachments
    console.log('   Migrating attachments...')
    const attachments = await pgPrisma.attachment.findMany()
    if (attachments.length > 0) {
      await sqlitePrisma.attachment.createMany({
        data: attachments.map(a => ({
          id: a.id,
          ticketId: a.ticketId,
          commentId: a.commentId,
          fileName: a.fileName,
          fileUrl: a.fileUrl,
          fileSize: a.fileSize,
          mimeType: a.mimeType,
          createdAt: a.createdAt,
        })),
        skipDuplicates: true,
      })
      console.log(`      ✓ ${attachments.length} attachments migrated`)
    }

    // Email Settings
    console.log('   Migrating email settings...')
    const emailSettings = await pgPrisma.emailSettings.findFirst()
    if (emailSettings) {
      await sqlitePrisma.emailSettings.create({
        data: {
          id: emailSettings.id,
          provider: emailSettings.provider,
          smtpHost: emailSettings.smtpHost,
          smtpPort: emailSettings.smtpPort,
          smtpUser: emailSettings.smtpUser,
          smtpPass: emailSettings.smtpPass,
          smtpSecure: emailSettings.smtpSecure,
          sesAccessKey: emailSettings.sesAccessKey,
          sesSecretKey: emailSettings.sesSecretKey,
          sesRegion: emailSettings.sesRegion,
          resendApiKey: emailSettings.resendApiKey,
          fromEmail: emailSettings.fromEmail,
          fromName: emailSettings.fromName,
          isActive: emailSettings.isActive,
          createdAt: emailSettings.createdAt,
          updatedAt: emailSettings.updatedAt,
        },
      })
      console.log('      ✓ Email settings migrated')
    }

    // System Branding
    console.log('   Migrating system branding...')
    const branding = await pgPrisma.systemBranding.findFirst()
    if (branding) {
      await sqlitePrisma.systemBranding.create({
        data: {
          id: branding.id,
          homepageTitle: branding.homepageTitle,
          adminPanelTitle: branding.adminPanelTitle,
          faviconUrl: branding.faviconUrl,
          logoUrl: branding.logoUrl,
          primaryColor: branding.primaryColor,
          secondaryColor: branding.secondaryColor,
          customCss: branding.customCss,
          footerText: branding.footerText,
          companyName: branding.companyName,
          supportEmail: branding.supportEmail,
          supportPhone: branding.supportPhone,
          createdAt: branding.createdAt,
          updatedAt: branding.updatedAt,
        },
      })
      console.log('      ✓ System branding migrated')
    }

    // LLM Settings
    console.log('   Migrating LLM settings...')
    const llmSettings = await pgPrisma.lLMSettings.findFirst()
    if (llmSettings) {
      await sqlitePrisma.lLMSettings.create({
        data: {
          id: llmSettings.id,
          provider: llmSettings.provider,
          ollamaUrl: llmSettings.ollamaUrl,
          ollamaModel: llmSettings.ollamaModel,
          geminiApiKey: llmSettings.geminiApiKey,
          analysisPrompt: llmSettings.analysisPrompt,
          isActive: llmSettings.isActive,
          createdAt: llmSettings.createdAt,
          updatedAt: llmSettings.updatedAt,
        },
      })
      console.log('      ✓ LLM settings migrated')
    }

    // Close connections
    await pgPrisma.$disconnect()
    await sqlitePrisma.$disconnect()

    console.log('\n✅ Migration completed successfully!')
    console.log(`\n📝 SQLite database created at: ${sqliteDbPath}`)
    console.log('\n🔄 Next steps:')
    console.log('   1. Update your .env file: DATABASE_URL=file:./prisma/dev.db')
    console.log('   2. Run: pnpm prisma generate')
    console.log('   3. Restart your application')
    console.log('\n⚠️  Note: Search functionality using tsvector will not work in SQLite.')
    console.log('   Consider implementing client-side search or a search library like Fuse.js.')

  } catch (error) {
    console.error('\n❌ Migration failed:', error)
    process.exit(1)
  }
}

migrateData()
