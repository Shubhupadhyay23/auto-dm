import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { invalidateFAQCache } from "@/lib/rules/matcher";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const businessId = (session.user as any).businessId;
  const faqId = params.id;

  // Confirm ownership
  const faq = await prisma.fAQ.findUnique({ where: { id: faqId } });
  if (!faq || faq.businessId !== businessId) {
    return new NextResponse("Not Found", { status: 404 });
  }

  try {
    const { question, answer, keywords, isActive } = await req.json();

    const updated = await prisma.fAQ.update({
      where: { id: faqId },
      data: {
        question: question ?? undefined,
        answer: answer ?? undefined,
        keywords: Array.isArray(keywords) ? keywords.map((k: string) => k.trim()).filter(Boolean) : undefined,
        isActive: isActive ?? undefined
      }
    });

    await invalidateFAQCache(businessId);

    return NextResponse.json(updated);
  } catch (err) {
    return new NextResponse("Bad Request", { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const businessId = (session.user as any).businessId;
  const faqId = params.id;

  // Confirm ownership
  const faq = await prisma.fAQ.findUnique({ where: { id: faqId } });
  if (!faq || faq.businessId !== businessId) {
    return new NextResponse("Not Found", { status: 404 });
  }

  await prisma.fAQ.delete({ where: { id: faqId } });
  await invalidateFAQCache(businessId);

  return NextResponse.json({ success: true });
}
