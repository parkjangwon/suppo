import { describe, expect, it } from "vitest";

import {
  getDefaultEmailSettings,
  shouldSendCustomerEmail,
  shouldSendInternalEmail,
  validateEmailSettings,
} from "@suppo/shared/email/settings";

describe("email settings helpers", () => {
  it("defaults both master toggles to false", () => {
    const defaults = getDefaultEmailSettings();

    expect(defaults.customerEmailsEnabled).toBe(false);
    expect(defaults.internalNotificationsEnabled).toBe(false);
  });

  it("validates configured provider requirements", () => {
    const defaults = getDefaultEmailSettings();
    const errors = validateEmailSettings(
      {
        ...defaults,
        provider: "ses",
      },
      { requireConfiguredProvider: true },
    );

    expect(errors).toContain("AWS Access Key를 입력해주세요.");
    expect(errors).toContain("AWS Secret Key를 입력해주세요.");
  });

  it("gates customer and internal events independently", () => {
    const defaults = getDefaultEmailSettings();
    const settings = {
      ...defaults,
      customerEmailsEnabled: true,
      notifyCustomerOnTicketCreated: true,
      internalNotificationsEnabled: true,
      notifyOnAssign: true,
      notifyOnComment: false,
    };

    expect(shouldSendCustomerEmail(settings, "ticketCreated")).toBe(true);
    expect(shouldSendCustomerEmail(settings, "agentReply")).toBe(false);
    expect(shouldSendInternalEmail(settings, "assign")).toBe(true);
    expect(shouldSendInternalEmail(settings, "comment")).toBe(false);
  });
});
