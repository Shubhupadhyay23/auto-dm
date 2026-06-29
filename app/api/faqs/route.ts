export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { invalidateFAQCache } from "@/lib/rules/matcher";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const businessId = (session.user as any).businessId;
  if (!businessId) {
    return NextResponse.json([]);
  }

  const faqs = await prisma.fAQ.findMany({
    where: { businessId },
    orderBy: { createdAt: "desc" }
  });

  return NextResponse.json(faqs);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const businessId = (session.user as any).businessId;
  if (!businessId) {
    return new NextResponse("No business configured", { status: 400 });
  }

  try {
    const { question, answer, keywords, isActive } = await req.json();

    if (!question || !answer || !keywords || !Array.isArray(keywords)) {
      return new NextResponse("Missing fields or keywords is not an array", { status: 400 });
    }

    const faq = await prisma.fAQ.create({
      data: {
        businessId,
        question,
        answer,
        keywords: keywords.map(k => k.trim()).filter(Boolean),
        isActive: isActive !== false
      }
    });

    // Invalidate FAQ cache
    await invalidateFAQCache(businessId);

    return NextResponse.json(faq, { status: 201 });
  } catch (err) {
    return new NextResponse("Bad Request", { status: 400 });
  }
}
