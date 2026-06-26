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
    return new NextResponse("No business configured", { status: 400 });
  }

  const business = await prisma.business.findUnique({
    where: { id: businessId }
  });

  return NextResponse.json(business);
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const businessId = (session.user as any).businessId;
  if (!businessId) {
    return new NextResponse("No business configured", { status: 400 });
  }

  try {
    const data = await req.json();

    const updated = await prisma.business.update({
      where: { id: businessId },
      data: {
        name: data.name ?? undefined,
        hours: data.hours ?? undefined,
        tone: data.tone ?? undefined,
        offHoursMessage: data.offHoursMessage ?? undefined,
        escalationKeywords: Array.isArray(data.escalationKeywords)
          ? data.escalationKeywords.map((k: string) => k.trim()).filter(Boolean)
          : undefined,
        notifyEmails: Array.isArray(data.notifyEmails)
          ? data.notifyEmails.map((e: string) => e.trim()).filter(Boolean)
          : undefined,
        notifyWhatsapp: data.notifyWhatsapp !== undefined ? data.notifyWhatsapp : undefined,
        services: data.services ?? undefined,
        sheetId: data.sheetId !== undefined ? data.sheetId : undefined,
        accessToken: data.accessToken ?? undefined,
        instagramPageId: data.instagramPageId ?? undefined
      }
    });

    return NextResponse.json(updated);
  } catch (err) {
    return new NextResponse("Bad Request", { status: 400 });
  }
}
