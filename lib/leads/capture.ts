import { prisma } from "@/lib/db/prisma";
import { redis } from "@/lib/redis/client";
import { sendReply } from "@/lib/instagram/sender";
import { syncLeadToExternals } from "./store";
import type { Business, Conversation } from "@prisma/client";

type CaptureState = "IDLE" | "AWAITING_NAME" | "AWAITING_PHONE" | "AWAITING_SERVICE" | "COMPLETE";
const TTL_SECONDS = 86400; // 24 hours

export async function getOrCreateLead(conversationId: string, businessId: string) {
  return prisma.lead.upsert({
    where: { conversationId },
    create: {
      conversationId,
      businessId,
      status: "NEW"
    },
    update: {}
  });
}

export async function runLeadCaptureIfNeeded(
  conversation: Conversation,
  business: Business,
  senderId: string,
  lastInboundText: string,
  accessToken: string
) {
  const stateKey = `lead:state:${conversation.id}`;
  const state = ((await redis.get(stateKey)) ?? "IDLE") as CaptureState;
  const lead = await getOrCreateLead(conversation.id, business.id);

  // If already complete, exit
  if (state === "COMPLETE") {
    return;
  }

  // 1. First prompt — ask for name
  if (state === "IDLE" && !lead.name) {
    await sendReply(senderId, "By the way, may I know your name?", accessToken);
    await redis.setex(stateKey, TTL_SECONDS, "AWAITING_NAME");
    return;
  }

  // 2. Capture name, ask for phone
  if (state === "AWAITING_NAME") {
    const name = lastInboundText.slice(0, 100).trim();
    await prisma.lead.update({
      where: { id: lead.id },
      data: {
        name,
        status: "WARM"
      }
    });
    await sendReply(senderId, `Thank you, ${name}! Could you share your phone number so we can follow up?`, accessToken);
    await redis.setex(stateKey, TTL_SECONDS, "AWAITING_PHONE");
    return;
  }

  // 3. Capture phone, ask for service
  if (state === "AWAITING_PHONE") {
    const phone = lastInboundText.replace(/[^\d+]/g, "").slice(0, 20);
    await prisma.lead.update({
      where: { id: lead.id },
      data: {
        phone,
        status: "WARM"
      }
    });

    const services = (business.services as Array<{ name: string }> | null) ?? [];
    const serviceList = services.slice(0, 3).map((s) => s.name).join(", ");
    
    await sendReply(
      senderId,
      `Which service are you interested in?${serviceList ? ` (e.g. ${serviceList})` : ""}`,
      accessToken
    );
    await redis.setex(stateKey, TTL_SECONDS, "AWAITING_SERVICE");
    return;
  }

  // 4. Capture service interest, transition to complete and sync
  if (state === "AWAITING_SERVICE") {
    const serviceInterest = lastInboundText.slice(0, 200).trim();
    const updatedLead = await prisma.lead.update({
      where: { id: lead.id },
      data: {
        serviceInterest,
        capturedAt: new Date()
      }
    });

    await redis.setex(stateKey, TTL_SECONDS, "COMPLETE");
    
    // Trigger external integrations asynchronously so we don't block the message pipeline
    syncLeadToExternals(updatedLead.id).catch((e) =>
      console.error("External sync failed for lead:", updatedLead.id, e)
    );
  }
}
