import type { AuthorType, ActivityAction, PrismaClient, TicketActivity } from "@prisma/client";

import { prisma } from "@suppo/db";

export type LoggedActivity = TicketActivity;

interface ActivityDbClient {
  ticketActivity: PrismaClient["ticketActivity"];
}

export type ActivityActorType = AuthorType;

export interface LogActivityInput {
  ticketId: string;
  actorType: ActivityActorType;
  actorId?: string;
  action: ActivityAction;
  oldValue?: string;
  newValue?: string;
}

export async function logActivity(
  input: LogActivityInput,
  db: ActivityDbClient = prisma
): Promise<LoggedActivity> {
  return db.ticketActivity.create({
    data: {
      ticketId: input.ticketId,
      actorType: input.actorType,
      actorId: input.actorId,
      action: input.action,
      oldValue: input.oldValue,
      newValue: input.newValue
    }
  });
}
