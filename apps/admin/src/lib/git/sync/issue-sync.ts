import { prisma } from "@crinity/db";
import { TicketStatus, GitProvider, GitEventType, AuditAction, AuthorType } from "@prisma/client";

interface GitIssuePayload {
  state: string;
  number: number;
  title: string;
  html_url: string;
}

function mapGitStateToTicketStatus(gitState: string): TicketStatus | null {
  const mapping: Record<string, TicketStatus> = {
    'open': TicketStatus.IN_PROGRESS,
    'closed': TicketStatus.RESOLVED,
    'reopened': TicketStatus.IN_PROGRESS,
  };
  
  return mapping[gitState.toLowerCase()] || null;
}

export async function syncTicketStatusFromGitEvent(
  ticketId: string,
  provider: GitProvider,
  gitState: string,
  eventMetadata?: {
    repoFullName?: string;
    issueNumber?: number;
    issueUrl?: string;
    actorName?: string;
  }
): Promise<void> {
  const newStatus = mapGitStateToTicketStatus(gitState);
  
  if (!newStatus) {
    console.log(`Unknown git state: ${gitState}, skipping sync`);
    return;
  }

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: { 
      id: true, 
      status: true,
      ticketNumber: true,
    }
  });

  if (!ticket) {
    console.log(`Ticket ${ticketId} not found, skipping sync`);
    return;
  }

  if (ticket.status === newStatus) {
    return;
  }

  await prisma.ticket.update({
    where: { id: ticketId },
    data: { 
      status: newStatus,
      updatedAt: new Date(),
    }
  });

  await createAuditLog({
    actorId: 'system',
    actorType: AuthorType.AGENT,
    actorName: 'Git Sync',
    actorEmail: 'system@crinity.io',
    action: AuditAction.UPDATE,
    resourceType: 'ticket',
    resourceId: ticketId,
    description: `Git ${provider} 이슈 ${gitState} → 티켓 상태 ${newStatus}로 자동 변경`,
    oldValue: { status: ticket.status },
    newValue: { status: newStatus },
    metadata: {
      source: 'GIT_SYNC',
      gitProvider: provider,
      ...eventMetadata,
    }
  });

  console.log(`Synced ticket ${ticket.ticketNumber} status from ${ticket.status} to ${newStatus}`);
}

export async function handleGitEventWithSync(
  ticketId: string,
  eventType: GitEventType,
  provider: GitProvider,
  payload: GitIssuePayload,
  repoFullName: string
): Promise<void> {
  await prisma.gitEvent.create({
    data: {
      ticketId,
      provider,
      eventType,
      repoFullName,
      prNumber: payload.number,
      prTitle: payload.title,
      prUrl: payload.html_url,
      occurredAt: new Date(),
    }
  });

  const shouldSyncStatus = eventType === GitEventType.PR_CLOSED || 
    eventType === GitEventType.PR_MERGED;

  if (shouldSyncStatus) {
    await syncTicketStatusFromGitEvent(
      ticketId,
      provider,
      payload.state,
      {
        repoFullName,
        issueNumber: payload.number,
        issueUrl: payload.html_url,
      }
    );
  }
}

async function createAuditLog(params: {
  actorId: string;
  actorType: AuthorType;
  actorName: string;
  actorEmail: string;
  action: AuditAction;
  resourceType: string;
  resourceId: string;
  description: string;
  oldValue?: any;
  newValue?: any;
  metadata?: any;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        ...params,
      }
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
  }
}
