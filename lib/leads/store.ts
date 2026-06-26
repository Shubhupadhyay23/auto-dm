import { appendLeadRow } from "@/lib/integrations/sheets";
import { syncLeadToHubspot } from "@/lib/integrations/hubspot";
import { prisma } from "@/lib/db/prisma";

export async function syncLeadToExternals(leadId: string) {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: { business: true }
  });

  if (!lead) return;

  // Run Sheets and HubSpot CRM sync tasks in parallel using allSettled
  await Promise.allSettled([
    lead.business.sheetId ? appendLeadRow(lead.business.sheetId, lead) : Promise.resolve(),
    syncLeadToHubspot(leadId)
  ]);
}
