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

  const leads = await prisma.lead.findMany({
    where: { businessId },
    orderBy: { createdAt: "desc" }
  });

  return NextResponse.json(leads);
}
