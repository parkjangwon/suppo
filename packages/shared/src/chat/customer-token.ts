import { prisma } from "@crinity/db";

import { buildChatCustomerTokenHash } from "./token";

export async function verifyChatCustomerAccess(conversationId: string, token: string) {
  const conversation = await prisma.chatConversation.findUnique({
    where: { id: conversationId },
    select: {
      id: true,
      ticketId: true,
      customerTokenHash: true,
      status: true,
    },
  });

  if (!conversation) {
    return null;
  }

  const tokenHash = buildChatCustomerTokenHash(token);
  if (tokenHash !== conversation.customerTokenHash) {
    return null;
  }

  return conversation;
}
