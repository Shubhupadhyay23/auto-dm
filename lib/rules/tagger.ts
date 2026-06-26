import { prisma } from "@/lib/db/prisma";
import { redis } from "@/lib/redis/client";
import { fireStaffNotification } from "@/lib/notifications/dispatch";
import type { LeadStatus } from "@prisma/client";

const PRICE_KEYWORDS = ["price", "cost", "how much", "fee", "charge", "rate"];
const AVAILABILITY_KEYWORDS = ["available", "availability", "slot", "timing", "book", "appointment", "when can"];

const RANK: Record<LeadStatus, number> = {
  NEW: 0,
  WARM: 1,
  HOT: 2,
  ESCALATED: 3,
  RESOLVED: 4
};

function containsAny(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some((k) => lower.includes(k));
}

export async function updateLeadTag(
  conversationId: string,
  newInboundText: string,
  options?: { lowConfidence?: boolean; escalationKeywordMatched?: boolean }
) {
  const lead = await prisma.lead.findUnique({
    where: { conversationId }
  });
  if (!lead) return;

  let candidateStatus: LeadStatus = lead.status;

  // ESCALATED status takes top priority
  if (options?.escalationKeywordMatched || options?.lowConfidence) {
    candidateStatus = "ESCALATED";
  } else {
    // Check signals in Redis to see if the user has asked about price + availability
    const sessionKey = `signals:${conversationId}`;
    const cachedSignals = await redis.get(sessionKey);
    const signals = cachedSignals ? JSON.parse(cachedSignals) : { price: false, avail: false };

    if (containsAny(newInboundText, PRICE_KEYWORDS)) {
      signals.price = true;
    }
    if (containsAny(newInboundText, AVAILABILITY_KEYWORDS)) {
      signals.avail = true;
    }

    await redis.setex(sessionKey, 86400, JSON.stringify(signals)); // 24 hour TTL

    // Transition to HOT if both pricing and availability signals were checked,
    // otherwise if we've captured name/phone we are WARM
    if (signals.price && signals.avail) {
      candidateStatus = "HOT";
    } else if (lead.name || lead.phone) {
      candidateStatus = "WARM";
    }
  }

  // One-way ratchet: status rank must strictly increase (unless set to RESOLVED by staff manually)
  if (RANK[candidateStatus] > RANK[lead.status] && candidateStatus !== "RESOLVED") {
    const updatedLead = await prisma.lead.update({
      where: { id: lead.id },
      data: { status: candidateStatus }
    });

    // Alert staff immediately when a lead transitions to HOT or ESCALATED
    if (candidateStatus === "HOT" || candidateStatus === "ESCALATED") {
      const reason = options?.escalationKeywordMatched
        ? "ESCALATION_KEYWORD"
        : options?.lowConfidence
        ? "LOW_CONFIDENCE"
        : undefined;
      await fireStaffNotification(updatedLead.id, candidateStatus, reason);
    }
  }
}
