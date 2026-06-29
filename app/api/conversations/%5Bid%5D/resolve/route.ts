export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";

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
    where: { id: conversationId }
  });

  if (!conversation || conversation.businessId !== businessId) {
    return new NextResponse("Not Found", { status: 404 });
  }

  try {
    const { status } = await req.json();

    if (!["ACTIVE", "WAITING_HUMAN", "RESOLVED"].includes(status)) {
      return new NextResponse("Invalid Status", { status: 400 });
    }

    const updated = await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        status,
        resolvedAt: status === "RESOLVED" ? new Date() : null
      }
    });

    // Also update lead status if resolving
    if (status === "RESOLVED") {
      const lead = await prisma.lead.findUnique({
        where: { conversationId }
      });
      if (lead) {
        await prisma.lead.update({
          where: { id: lead.id },
          data: { status: "RESOLVED" }
        });
      }
    }

    return NextResponse.json(updated);
  } catch (err) {
    return new NextResponse("Bad Request", { status: 400 });
  }
}
