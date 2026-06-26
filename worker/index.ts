import { redis } from "../lib/redis/client";
import { prisma } from "../lib/db/prisma";
import { getOrCreateConversation, saveMessage } from "../lib/instagram/conversations";
import { sendReply, sendPrivateCommentReply } from "../lib/instagram/sender";
import { handleHandoff } from "../lib/instagram/handoff";
import { matchFAQ, incrementFAQMatchCount } from "../lib/rules/matcher";
import { getAIReply } from "../lib/ai/claude";
import { runLeadCaptureIfNeeded, getOrCreateLead } from "../lib/leads/capture";
import { updateLeadTag } from "../lib/rules/tagger";
import type { Business } from "@prisma/client";

// Helper to determine if the business is currently closed
function isOffHours(hours: any): boolean {
  if (!hours) return false;
  const now = new Date();
  
  // Format day as mon, tue, wed, thu, fri, sat, sun
  const day = now.toLocaleDateString("en-US", { weekday: "short" }).toLowerCase();
  const range = hours[day];
  
  if (!range || range.toLowerCase() === "closed") {
    return true;
  }

  const parts = range.split("-");
  if (parts.length !== 2) return false;
  const [start, end] = parts;

  const [startHour, startMin] = start.split(":").map(Number);
  const [endHour, endMin] = end.split(":").map(Number);

  const currentHour = now.getHours();
  const currentMin = now.getMinutes();

  const currentMinutes = currentHour * 60 + currentMin;
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;

  return currentMinutes < startMinutes || currentMinutes > endMinutes;
}

async function processMessage(payloadStr: string) {
  const payload = JSON.parse(payloadStr);
  const type = payload.type || "message";

  if (type === "comment") {
    const { senderId, username, recipientId, messageText, commentId } = payload;

    // 1. Resolve business configuration
    const business = await prisma.business.findUnique({
      where: { instagramPageId: recipientId }
    });

    if (!business) {
      console.warn(`No business configuration found for Instagram Page ID (recipientId): ${recipientId}`);
      return;
    }

    // 2. Match FAQs (Rule Engine)
    const matchedFAQ = await matchFAQ(messageText, business.id);
    if (!matchedFAQ) {
      console.log(`No FAQ match for comment: "${messageText}". Skipping auto-reply.`);
      return;
    }

    console.log(`FAQ matched for comment! Sending private reply for FAQ ID: ${matchedFAQ.id}`);

    // 3. Retrieve or initialize the conversation
    const conversation = await getOrCreateConversation(business.id, senderId);

    // 4. Update lead handle if username is present
    if (username) {
      const lead = await getOrCreateLead(conversation.id, business.id);
      if (lead.instagramHandle !== username) {
        await prisma.lead.update({
          where: { id: lead.id },
          data: { instagramHandle: username }
        });
      }
    }

    // 5. Send private reply comment
    await sendPrivateCommentReply(commentId, matchedFAQ.answer, business.accessToken);

    // 6. Save messages in DB
    await saveMessage(conversation.id, "INBOUND", `[Comment on Reel] ${messageText}`);
    await saveMessage(conversation.id, "OUTBOUND", matchedFAQ.answer, "FAQ_MATCH");
    await incrementFAQMatchCount(matchedFAQ.id);

    // 7. Update Lead Categorization Tag
    await updateLeadTag(conversation.id, messageText);
    return;
  }

  const { senderId, recipientId, messageText, timestamp, messageId } = payload;

  // 1. Resolve business configuration
  const business = await prisma.business.findUnique({
    where: { instagramPageId: recipientId }
  });

  if (!business) {
    console.warn(`No business configuration found for Instagram Page ID (recipientId): ${recipientId}`);
    return;
  }

  // 2. Retrieve or initialize the conversation
  const conversation = await getOrCreateConversation(business.id, senderId);

  // 3. Save incoming message
  await saveMessage(conversation.id, "INBOUND", messageText);

  // 4. If conversation is marked WAITING_HUMAN, skip automated processing
  if (conversation.status === "WAITING_HUMAN") {
    console.log(`Conversation ${conversation.id} is in WAITING_HUMAN mode. Skipping auto-reply.`);
    // Update lead tag to ESCALATED in case it was resolved and re-opened
    await updateLeadTag(conversation.id, messageText, { lowConfidence: true });
    return;
  }

  // 5. Escalation keyword match check
  const escalationKeywords = business.escalationKeywords || [];
  const matchesEscalation = escalationKeywords.some((kw) =>
    messageText.toLowerCase().includes(kw.toLowerCase().trim())
  );

  if (matchesEscalation) {
    console.log(`Escalation keyword matched: "${messageText}". Handoff initiated.`);
    await handleHandoff(conversation, business, senderId, "ESCALATION_KEYWORD");
    return;
  }

  // 6. Check Business Off-Hours
  if (isOffHours(business.hours)) {
    const offHoursSentKey = `offhours:sent:${senderId}`;
    const alreadySent = await redis.get(offHoursSentKey);

    if (!alreadySent) {
      await sendReply(senderId, business.offHoursMessage, business.accessToken);
      await saveMessage(conversation.id, "OUTBOUND", business.offHoursMessage, "HUMAN");
      // Throttle off-hours notification to once every 2 hours per customer
      await redis.set(offHoursSentKey, "1", "EX", 7200);
      console.log(`Off-hours message sent to recipient: ${senderId}`);
    } else {
      console.log(`Off-hours message throttled for: ${senderId}`);
    }
    return;
  }

  // 7. Match FAQs (Rule Engine)
  const matchedFAQ = await matchFAQ(messageText, business.id);
  if (matchedFAQ) {
    console.log(`FAQ matched! Sending answer for FAQ ID: ${matchedFAQ.id}`);
    await sendReply(senderId, matchedFAQ.answer, business.accessToken);
    await saveMessage(conversation.id, "OUTBOUND", matchedFAQ.answer, "FAQ_MATCH");
    await incrementFAQMatchCount(matchedFAQ.id);

    // Run Lead Capture State Machine
    await runLeadCaptureIfNeeded(conversation, business, senderId, messageText, business.accessToken);

    // Update Lead Categorization Tag
    await updateLeadTag(conversation.id, messageText);
    return;
  }

  // 8. AI Fallback (Claude 3.5 Haiku)
  console.log(`No FAQ match. Falling back to AI response for: "${messageText}"`);
  const aiResult = await getAIReply(messageText, business, conversation.id);

  if (aiResult.confidence >= 0.6) {
    console.log(`AI generated response with confidence: ${aiResult.confidence}. Sending.`);
    await sendReply(senderId, aiResult.text, business.accessToken);
    await saveMessage(conversation.id, "OUTBOUND", aiResult.text, "AI_REPLY", aiResult.confidence);

    // Run Lead Capture State Machine
    await runLeadCaptureIfNeeded(conversation, business, senderId, messageText, business.accessToken);

    // Update Lead Categorization Tag
    await updateLeadTag(conversation.id, messageText);
  } else {
    console.log(`AI confidence low: ${aiResult.confidence}. Handing off thread.`);
    await handleHandoff(conversation, business, senderId, "LOW_CONFIDENCE");
  }
}

async function startWorker() {
  console.log("🚀 InstaReply AI Queue Worker started. Listening for incoming messages...");
  
  while (true) {
    try {
      // BRPOP blocks connection until item is available in list 'dm:queue'
      const result = await redis.brpop("dm:queue", 0);
      if (result) {
        const [, payload] = result;
        console.log(`Processing queued message: ${payload}`);
        await processMessage(payload);
      }
    } catch (error) {
      console.error("Queue Worker execution error:", error);
      // Wait a short bit on error to avoid tight error-looping
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
}

startWorker();
