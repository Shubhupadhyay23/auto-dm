export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const businessId = (session.user as any).businessId;
  if (!businessId) {
    return NextResponse.json([]);
  }

  const conversations = await prisma.conversation.findMany({
    where: { businessId },
    include: {
      lead: true,
      messages: {
        orderBy: { sentAt: "desc" },
        take: 1
      }
    },
    orderBy: { updatedAt: "desc" }
  });

  return NextResponse.json(conversations);
}
