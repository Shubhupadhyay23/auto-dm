import { prisma } from "@/lib/db/prisma";
import type { Direction, ReplyType } from "@prisma/client";

export async function getOrCreateConversation(businessId: string, igUserId: string) {
  return prisma.conversation.upsert({
    where: {
      businessId_instagramUserId: {
        businessId,
        instagramUserId: igUserId
      }
    },
    create: {
      businessId,
      instagramUserId: igUserId,
      instagramThreadId: igUserId, // Using user ID as thread ref
      status: "ACTIVE"
    },
    update: {
      updatedAt: new Date()
    }
  });
}

export async function saveMessage(
  conversationId: string,
  direction: Direction,
  content: string,
  replyType?: ReplyType,
  confidence?: number
) {
  return prisma.message.create({
    data: {
      conversationId,
      direction,
      content,
      replyType,
      confidence
    }
  });
}

export async function getLastNMessages(conversationId: string, n: number) {
  const messages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { sentAt: "desc" },
    take: n
  });
  return messages.reverse();
}
