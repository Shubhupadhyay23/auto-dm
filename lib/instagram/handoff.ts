import { prisma } from "@/lib/db/prisma";
import { sendReply } from "./sender";
import { saveMessage } from "./conversations";
import { fireStaffNotification } from "@/lib/notifications/dispatch";
import type { Business, Conversation } from "@prisma/client";

const HANDOFF_MSG = "I'll connect you with our team right away. They'll reach out to you shortly!";

export async function handleHandoff(
  conversation: Conversation,
  business: Business,
  senderId: string,
  reason: "ESCALATION_KEYWORD" | "LOW_CONFIDENCE"
) {
  try {
    // 1. Send the handoff message on Instagram
    await sendReply(senderId, HANDOFF_MSG, business.accessToken);
    
    // 2. Save the message to DB
    await saveMessage(conversation.id, "OUTBOUND", HANDOFF_MSG, "HANDOFF");
  } catch (err) {
    console.error("Failed to send handoff message on Instagram:", err);
  }

  // 3. Mark conversation as WAITING_HUMAN
  await prisma.conversation.update({
    where: { id: conversation.id },
    data: {
      status: "WAITING_HUMAN",
      handoffAt: new Date()
    }
  });

  // 4. Update the Lead status to ESCALATED
  let lead = await prisma.lead.findUnique({
    where: { conversationId: conversation.id }
  });

  if (lead) {
    lead = await prisma.lead.update({
      where: { id: lead.id },
      data: { status: "ESCALATED" }
    });
    
    // 5. Fire notification to staff
    await fireStaffNotification(lead.id, "ESCALATED", reason);
  } else {
    // If no lead exists yet, create a new NEW lead that is immediately ESCALATED
    const newLead = await prisma.lead.create({
      data: {
        businessId: business.id,
        conversationId: conversation.id,
        status: "ESCALATED"
      }
    });
    await fireStaffNotification(newLead.id, "ESCALATED", reason);
  }
}
