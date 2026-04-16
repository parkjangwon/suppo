import { describe, expect, it } from "vitest";

import { BACKUP_TABLE_READERS } from "../../../apps/admin/src/lib/system/backup";
import {
  RESTORE_DELETE_ORDER,
  RESTORE_INSERT_ORDER,
} from "../../../apps/admin/src/lib/system/restore";

const EXPECTED_TABLES = [
  "agent",
  "agentAbsence",
  "agentCategory",
  "attachment",
  "auditLog",
  "automationRule",
  "businessCalendar",
  "category",
  "chatConversation",
  "chatEvent",
  "chatWidgetProfile",
  "chatWidgetSettings",
  "comment",
  "customFieldDefinition",
  "customFieldValue",
  "customer",
  "customerSatisfaction",
  "emailDelivery",
  "emailSettings",
  "emailThreadMapping",
  "generatedReport",
  "gitEvent",
  "gitLink",
  "gitOperationQueue",
  "gitProviderCredential",
  "holiday",
  "knowledgeArticle",
  "knowledgeArticleFeedback",
  "knowledgeCategory",
  "lLMSettings",
  "macro",
  "notificationSetting",
  "publicApiKey",
  "reportSchedule",
  "requestType",
  "responseTemplate",
  "sAMLProvider",
  "sLAClock",
  "sLAPolicy",
  "savedFilter",
  "systemBranding",
  "team",
  "teamMember",
  "ticket",
  "ticketActivity",
  "ticketCommentLock",
  "ticketKnowledgeLink",
  "ticketMerge",
  "ticketPresence",
  "ticketTransfer",
  "timeEntry",
  "webhookDeliveryLog",
  "webhookEndpoint",
] as const;

describe("backup/restore coverage", () => {
  it("backs up every currently supported table", () => {
    expect(Object.keys(BACKUP_TABLE_READERS).sort()).toEqual([...EXPECTED_TABLES].sort());
  });

  it("restore delete and insert orders cover the same table set", () => {
    expect([...RESTORE_DELETE_ORDER].sort()).toEqual([...EXPECTED_TABLES].sort());
    expect([...RESTORE_INSERT_ORDER].sort()).toEqual([...EXPECTED_TABLES].sort());
  });

  it("deletes child tables before parent tables for newly added relations", () => {
    expect(RESTORE_DELETE_ORDER.indexOf("chatEvent")).toBeLessThan(
      RESTORE_DELETE_ORDER.indexOf("chatConversation"),
    );
    expect(RESTORE_DELETE_ORDER.indexOf("chatConversation")).toBeLessThan(
      RESTORE_DELETE_ORDER.indexOf("ticket"),
    );
    expect(RESTORE_DELETE_ORDER.indexOf("ticketKnowledgeLink")).toBeLessThan(
      RESTORE_DELETE_ORDER.indexOf("knowledgeArticle"),
    );
    expect(RESTORE_DELETE_ORDER.indexOf("ticketKnowledgeLink")).toBeLessThan(
      RESTORE_DELETE_ORDER.indexOf("ticket"),
    );
    expect(RESTORE_DELETE_ORDER.indexOf("webhookDeliveryLog")).toBeLessThan(
      RESTORE_DELETE_ORDER.indexOf("webhookEndpoint"),
    );
  });
});
