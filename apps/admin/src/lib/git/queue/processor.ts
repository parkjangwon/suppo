import { prisma } from "@crinity/db";
import { GitProvider } from "@prisma/client";

type GitOperation = 'CREATE_ISSUE' | 'LINK_ISSUE' | 'UPDATE_ISSUE';

interface QueueItem {
  id: string;
  operation: GitOperation;
  provider: GitProvider;
  payload: any;
  retryCount: number;
  maxRetries: number;
}

function classifyError(error: any): { code: string; shouldRetry: boolean } {
  if (error.status === 401) return { code: 'AUTH_FAILED', shouldRetry: false };
  if (error.status === 403) return { code: 'PERMISSION_DENIED', shouldRetry: false };
  if (error.status === 404) return { code: 'RESOURCE_NOT_FOUND', shouldRetry: false };
  if (error.status === 422) return { code: 'VALIDATION_FAILED', shouldRetry: false };
  if (error.status === 429) return { code: 'RATE_LIMIT', shouldRetry: true };
  if (error.code === 'ETIMEDOUT') return { code: 'TIMEOUT', shouldRetry: true };
  if (error.code === 'ECONNREFUSED') return { code: 'CONNECTION_FAILED', shouldRetry: true };
  if (error.code === 'ENOTFOUND') return { code: 'DNS_ERROR', shouldRetry: true };
  return { code: 'UNKNOWN', shouldRetry: true };
}

export async function enqueueGitOperation(
  operation: GitOperation,
  provider: GitProvider,
  payload: any,
  maxRetries = 3
): Promise<string> {
  const item = await prisma.gitOperationQueue.create({
    data: {
      operation,
      provider,
      payload,
      maxRetries,
      status: 'PENDING',
    }
  });
  
  return item.id;
}

export async function processGitQueue(batchSize = 10): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
}> {
  const pending = await prisma.gitOperationQueue.findMany({
    where: {
      status: { in: ['PENDING', 'FAILED'] },
      retryCount: { lt: prisma.gitOperationQueue.fields.maxRetries }
    },
    orderBy: [{ retryCount: 'asc' }, { createdAt: 'asc' }],
    take: batchSize
  });

  let succeeded = 0;
  let failed = 0;

  for (const item of pending) {
    try {
      await prisma.gitOperationQueue.update({
        where: { id: item.id },
        data: { status: 'PROCESSING' }
      });

      await executeGitOperation(item as QueueItem);

      await prisma.gitOperationQueue.update({
        where: { id: item.id },
        data: { 
          status: 'SUCCESS',
          processedAt: new Date()
        }
      });
      
      succeeded++;
    } catch (error) {
      const { code, shouldRetry } = classifyError(error);
      const newRetryCount = item.retryCount + 1;
      
      await prisma.gitOperationQueue.update({
        where: { id: item.id },
        data: {
          status: newRetryCount >= item.maxRetries ? 'FAILED' : 'PENDING',
          retryCount: newRetryCount,
          errorCode: code,
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          processedAt: new Date()
        }
      });

      if (newRetryCount >= item.maxRetries) {
        await notifyAdmin(`Git operation failed after ${item.maxRetries} retries`, {
          operation: item.operation,
          provider: item.provider,
          errorCode: code,
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        });
      }
      
      failed++;
    }
  }

  return {
    processed: pending.length,
    succeeded,
    failed
  };
}

async function executeGitOperation(item: QueueItem): Promise<void> {
  switch (item.operation) {
    case 'CREATE_ISSUE':
      console.log(`Executing CREATE_ISSUE for ${item.provider}`);
      break;
    case 'LINK_ISSUE':
      console.log(`Executing LINK_ISSUE for ${item.provider}`);
      break;
    case 'UPDATE_ISSUE':
      console.log(`Executing UPDATE_ISSUE for ${item.provider}`);
      break;
    default:
      throw new Error(`Unknown operation: ${item.operation}`);
  }
}

async function notifyAdmin(subject: string, details: any): Promise<void> {
  console.error(`[Git Queue Alert] ${subject}`, details);
}

export async function getFailedOperations(limit = 50) {
  return prisma.gitOperationQueue.findMany({
    where: { status: 'FAILED' },
    orderBy: { updatedAt: 'desc' },
    take: limit
  });
}

export async function retryOperation(operationId: string): Promise<boolean> {
  const operation = await prisma.gitOperationQueue.findUnique({
    where: { id: operationId }
  });

  if (!operation || operation.status !== 'FAILED') {
    return false;
  }

  await prisma.gitOperationQueue.update({
    where: { id: operationId },
    data: {
      status: 'PENDING',
      retryCount: 0,
      errorCode: null,
      errorMessage: null
    }
  });

  return true;
}
