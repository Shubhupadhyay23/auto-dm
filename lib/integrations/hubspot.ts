import { Client } from "@hubspot/api-client";
import { prisma } from "@/lib/db/prisma";

const hubspotClient = process.env.HUBSPOT_API_KEY 
  ? new Client({ accessToken: process.env.HUBSPOT_API_KEY }) 
  : null;

export async function syncLeadToHubspot(leadId: string) {
  if (process.env.ENABLE_HUBSPOT !== "true" || !hubspotClient) {
    console.log("HubSpot integration is disabled or API key is missing.");
    return;
  }

  const lead = await prisma.lead.findUnique({
    where: { id: leadId }
  });
  if (!lead || !lead.phone) return;

  const [firstname, ...rest] = (lead.name ?? "Unknown").split(" ");
  const lastname = rest.join(" ") || "-";

  try {
    if (lead.crmId) {
      // Update existing HubSpot contact
      await hubspotClient.crm.contacts.basicApi.update(lead.crmId, {
        properties: {
          firstname,
          lastname,
          phone: lead.phone,
          hs_lead_status: lead.status
        }
      });
      console.log(`Updated HubSpot contact: ${lead.crmId} for lead: ${leadId}`);
    } else {
      // Create new HubSpot contact
      const response = await hubspotClient.crm.contacts.basicApi.create({
        properties: {
          firstname,
          lastname,
          phone: lead.phone,
          hs_lead_status: lead.status
        }
      });
      
      await prisma.lead.update({
        where: { id: leadId },
        data: { crmId: response.id }
      });
      console.log(`Created HubSpot contact: ${response.id} for lead: ${leadId}`);
    }
  } catch (err) {
    console.error("HubSpot CRM sync error:", err);
  }
}
