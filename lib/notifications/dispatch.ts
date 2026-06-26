import { prisma } from "@/lib/db/prisma";
import { redis } from "@/lib/redis/client";
import { sendEmail } from "./email";
import { sendWhatsAppAlert } from "./whatsapp";
import type { LeadStatus } from "@prisma/client";

export async function fireStaffNotification(
  leadId: string,
  status: LeadStatus,
  reason?: string
) {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      business: true,
      conversation: true
    }
  });

  if (!lead) return;

  // Rate limit notifications: max 1 notification per conversation per 30 minutes
  const rateLimitKey = `notify:${lead.conversationId}`;
  const isAllowed = await redis.set(rateLimitKey, "1", "EX", 1800, "NX");
  if (!isAllowed) {
    console.log(`Notification throttled for conversation: ${lead.conversationId}`);
    return;
  }

  const dashboardUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/dashboard/conversations/${lead.conversationId}`;
  const subject = `${status === "HOT" ? "🔥 HOT LEAD ALERT" : "⚠️ LEAD ESCALATION"}: ${lead.name ?? "New User"}`;

  const emailHtml = `
    <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
      <h2 style="color: ${status === "HOT" ? "#e53e3e" : "#dd6b20"}">${subject}</h2>
      <p>A lead has been flagged as <strong>${status}</strong> on Instagram.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 15px 0;" />
      <p><strong>Name:</strong> ${lead.name ?? "Not provided yet"}</p>
      <p><strong>Phone:</strong> ${lead.phone ?? "Not provided yet"}</p>
      <p><strong>Service Interest:</strong> ${lead.serviceInterest ?? "Not provided yet"}</p>
      ${reason ? `<p><strong>Trigger Cause:</strong> ${reason.replace("_", " ")}</p>` : ""}
      <p><strong>Instagram Account:</strong> ${lead.instagramHandle ?? "n/a"}</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 15px 0;" />
      <p><a href="${dashboardUrl}" style="background-color: #3182ce; color: white; padding: 10px 15px; text-decoration: none; border-radius: 4px; display: inline-block;">Open Inbox in Dashboard</a></p>
    </div>
  `;

  // Send Email Alerts
  if (lead.business.notifyEmails && lead.business.notifyEmails.length > 0) {
    try {
      await sendEmail(lead.business.notifyEmails, subject, emailHtml);
    } catch (e) {
      console.error("Failed to dispatch staff email notification:", e);
    }
  }

  // Send WhatsApp Alerts
  if (lead.business.notifyWhatsapp) {
    try {
      const whatsappText = `${status === "HOT" ? "🔥 HOT" : "⚠️ ESCALATED"} Lead Alert!\nName: ${lead.name ?? "n/a"}\nPhone: ${lead.phone ?? "n/a"}\nService: ${lead.serviceInterest ?? "n/a"}\n${reason ? `Reason: ${reason}\n` : ""}View: ${dashboardUrl}`;
      await sendWhatsAppAlert(lead.business.notifyWhatsapp, whatsappText);
    } catch (e) {
      console.error("Failed to dispatch staff WhatsApp notification:", e);
    }
  }
}
