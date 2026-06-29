export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { sendReply } from "@/lib/instagram/sender";
import { saveMessage } from "@/lib/instagram/conversations";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const businessId = (session.user as any).businessId;
  const conversationId = params.id;

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId }
  });

  if (!conversation || conversation.businessId !== businessId) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const messages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { sentAt: "asc" }
  });

  return NextResponse.json(messages);
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const businessId = (session.user as any).businessId;
  const conversationId = params.id;

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { business: true }
  });

  if (!conversation || conversation.businessId !== businessId) {
    return new NextResponse("Not Found", { status: 404 });
  }

  try {
    const { text } = await req.json();
    if (!text || !text.trim()) {
      return new NextResponse("Message content is required", { status: 400 });
    }

    // 1. Dispatch manual reply to Instagram (safety checked by 24h window inside sendReply)
    await sendReply(conversation.instagramUserId, text, conversation.business.accessToken);

    // 2. Save outbound message to database
    const savedMsg = await saveMessage(conversation.id, "OUTBOUND", text, "HUMAN");

    // 3. Mark conversation status (if it was WAITING_HUMAN, manual response keeps it active or we can let them update it)
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() }
    });

    return NextResponse.json(savedMsg, { status: 201 });
  } catch (err: any) {
    console.error("Failed to send manual reply:", err);
    return NextResponse.json(
      { error: err.message || "Failed to dispatch manual response" },
      { status: 500 }
    );
  }
}
