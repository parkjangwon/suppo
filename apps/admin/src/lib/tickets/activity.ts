import { prisma } from "@crinity/db";

type PersistedActorType = "AGENT" | "CUSTOMER";
type ActivityAction =
  | "CREATED"
  | "ASSIGNED"
  | "STATUS_CHANGED"
  | "PRIORITY_CHANGED"
  | "TRANSFERRED";

export interface LoggedActivity {
  id: string;
  ticketId: string;
  actorType: PersistedActorType;
  actorId: string | null;
  action: ActivityAction;
  oldValue: string | null;
  newValue: string | null;
  createdAt: Date;
}

interface ActivityDbClient {
  ticketActivity: {
    create: (args: {
      data: {
        ticketId: string;
        actorType: PersistedActorType;
        actorId?: string;
        action: ActivityAction;
        oldValue?: string;
        newValue?: string;
      };
    }) => Promise<LoggedActivity>;
  };
}

export type ActivityActorType = "SYSTEM" | "AGENT" | "CUSTOMER";

export interface LogActivityInput {
  ticketId: string;
  actorType: ActivityActorType;
  actorId?: string;
  action: ActivityAction;
  oldValue?: string;
  newValue?: string;
}

function toDbActorType(actorType: ActivityActorType): PersistedActorType {
  if (actorType === "SYSTEM") {
    return "CUSTOMER";
  }

  return actorType;
}

export async function logActivity(
  input: LogActivityInput,
  db: ActivityDbClient = prisma
): Promise<LoggedActivity> {
  return db.ticketActivity.create({
    data: {
      ticketId: input.ticketId,
      actorType: toDbActorType(input.actorType),
      actorId: input.actorId,
      action: input.action,
      oldValue: input.oldValue,
      newValue: input.newValue
    }
  });
}
