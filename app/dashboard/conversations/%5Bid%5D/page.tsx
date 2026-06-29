export const dynamic = "force-dynamic";

import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { notFound, redirect } from "next/navigation";
import ConversationViewer from "@/components/dashboard/ConversationViewer";

export default async function ConversationDetailsPage({
  params
}: {
  params: { id: string };
}) {
  const session = await auth();
  const businessId = (session?.user as any).businessId;

  const conversation = await prisma.conversation.findUnique({
    where: { id: params.id },
    include: {
      lead: {
        select: {
          id: true,
          name: true,
          status: true
        }
      }
    }
  });

  if (!conversation || conversation.businessId !== businessId) {
    notFound();
  }

  const messages = await prisma.message.findMany({
    where: { conversationId: conversation.id },
    orderBy: { sentAt: "asc" }
  });

  // Map dates to strings for JSON client serialization
  const serializedMessages = messages.map((m) => ({
    ...m,
    sentAt: m.sentAt.toISOString()
  }));

  return (
    <ConversationViewer
      conversation={conversation as any}
      initialMessages={serializedMessages as any}
    />
  );
}
