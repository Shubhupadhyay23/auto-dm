export const dynamic = "force-dynamic";

import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import LeadTable from "@/components/dashboard/LeadTable";

export default async function LeadsPage() {
  const session = await auth();
  const businessId = (session?.user as any).businessId;

  const leads = await prisma.lead.findMany({
    where: { businessId },
    orderBy: { createdAt: "desc" }
  });

  // Map Date objects to strings for Client Component serialization
  const serializedLeads = leads.map((l) => ({
    ...l,
    createdAt: l.createdAt.toISOString()
  }));

  return (
    <div className="space-y-6 font-sans">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">Lead Funnel Manager</h1>
        <p className="text-sm text-slate-400">
          Track and qualify leads captured automatically from your Instagram DMs.
        </p>
      </div>

      <LeadTable initialLeads={serializedLeads as any} />
    </div>
  );
}
