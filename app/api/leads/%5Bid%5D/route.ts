import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { syncLeadToExternals } from "@/lib/leads/store";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const businessId = (session.user as any).businessId;
  const leadId = params.id;

  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead || lead.businessId !== businessId) {
    return new NextResponse("Not Found", { status: 404 });
  }

  try {
    const { name, phone, email, serviceInterest, status, notes } = await req.json();

    const updated = await prisma.lead.update({
      where: { id: leadId },
      data: {
        name: name ?? undefined,
        phone: phone ?? undefined,
        email: email ?? undefined,
        serviceInterest: serviceInterest ?? undefined,
        status: status ?? undefined,
        notes: notes ?? undefined
      }
    });

    // Re-sync updated details to Google Sheets and HubSpot asynchronously
    syncLeadToExternals(leadId).catch((e) =>
      console.error("External sync failed during manual lead update:", leadId, e)
    );

    return NextResponse.json(updated);
  } catch (err) {
    return new NextResponse("Bad Request", { status: 400 });
  }
}
