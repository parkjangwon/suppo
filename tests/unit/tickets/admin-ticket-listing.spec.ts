import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    ticket: {
      findMany: vi.fn().mockResolvedValue([]),
    },
  },
}));

vi.mock("@suppo/db", () => ({
  prisma: prismaMock,
}));

import { getAdminTickets } from "@/lib/db/queries/admin-tickets";

describe("admin ticket listing", () => {
  beforeEach(() => {
    prismaMock.ticket.findMany.mockClear();
    prismaMock.ticket.findMany.mockResolvedValue([]);
  });

  it("loads ticket list without forcing a live-chat exclusion filter", async () => {
    await getAdminTickets({});

    expect(prismaMock.ticket.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {},
      }),
    );
  });
});
