import type { BackofficeRole } from "./config";

export const Permissions = {
  TICKET: {
    READ: "ticket:read",
    READ_ALL: "ticket:read:all",
    WRITE: "ticket:write",
    DELETE: "ticket:delete",
    ASSIGN: "ticket:assign",
    TRANSFER: "ticket:transfer"
  },
  AGENT: {
    READ: "agent:read",
    WRITE: "agent:write",
    DELETE: "agent:delete",
    MANAGE_TEAM: "agent:manage:team"
  },
  KNOWLEDGE: {
    READ: "knowledge:read",
    WRITE: "knowledge:write",
    DELETE: "knowledge:delete",
    PUBLISH: "knowledge:publish"
  },
  SETTINGS: {
    READ: "settings:read",
    WRITE: "settings:write",
    SYSTEM: "settings:system"
  },
  ANALYTICS: {
    READ: "analytics:read",
    READ_ALL: "analytics:read:all"
  },
  AUDIT_LOG: {
    READ: "audit:read"
  }
} as const;

export type Permission = typeof Permissions[keyof typeof Permissions][keyof typeof Permissions[keyof typeof Permissions]];

const ROLE_PERMISSIONS: Record<BackofficeRole, string[]> = {
  ADMIN: [
    // Admin has all permissions
    ...Object.values(Permissions.TICKET),
    ...Object.values(Permissions.AGENT),
    ...Object.values(Permissions.KNOWLEDGE),
    ...Object.values(Permissions.SETTINGS),
    ...Object.values(Permissions.ANALYTICS),
    ...Object.values(Permissions.AUDIT_LOG)
  ],
  TEAM_LEAD: [
    // Team lead can manage their team
    Permissions.TICKET.READ_ALL,
    Permissions.TICKET.WRITE,
    Permissions.TICKET.ASSIGN,
    Permissions.TICKET.TRANSFER,
    Permissions.AGENT.READ,
    Permissions.AGENT.WRITE,
    Permissions.AGENT.MANAGE_TEAM,
    Permissions.KNOWLEDGE.READ,
    Permissions.KNOWLEDGE.WRITE,
    Permissions.KNOWLEDGE.PUBLISH,
    Permissions.SETTINGS.READ,
    Permissions.ANALYTICS.READ,
    Permissions.AUDIT_LOG.READ
  ],
  AGENT: [
    // Regular agent can only work on assigned tickets
    Permissions.TICKET.READ,
    Permissions.TICKET.WRITE,
    Permissions.TICKET.ASSIGN,
    Permissions.KNOWLEDGE.READ,
    Permissions.KNOWLEDGE.WRITE,
    Permissions.SETTINGS.READ,
    Permissions.ANALYTICS.READ
  ],
  VIEWER: [
    // Viewer can only read
    Permissions.TICKET.READ,
    Permissions.KNOWLEDGE.READ,
    Permissions.ANALYTICS.READ
  ]
};

export function hasPermission(role: BackofficeRole, permission: string): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function hasAnyPermission(role: BackofficeRole, permissions: string[]): boolean {
  return permissions.some(permission => hasPermission(role, permission));
}

export function hasAllPermissions(role: BackofficeRole, permissions: string[]): boolean {
  return permissions.every(permission => hasPermission(role, permission));
}

export function getRolePermissions(role: BackofficeRole): string[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

export function canAccessTicket(role: BackofficeRole, ticketAssigneeId: string | null, currentAgentId: string): boolean {
  if (role === "ADMIN" || role === "TEAM_LEAD") return true;
  if (role === "VIEWER") return true; // Viewer can read
  if (role === "AGENT") {
    // Agent can access their own tickets or unassigned tickets
    return ticketAssigneeId === null || ticketAssigneeId === currentAgentId;
  }
  return false;
}

export function canManageAgent(managerRole: BackofficeRole, targetRole: BackofficeRole): boolean {
  if (managerRole === "ADMIN") return true;
  if (managerRole === "TEAM_LEAD") {
    // Team lead can manage agents but not other team leads or admins
    return targetRole === "AGENT" || targetRole === "VIEWER";
  }
  return false;
}
