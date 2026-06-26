import Anthropic from "@anthropic-ai/sdk";
import { buildSystemPrompt } from "./prompt-builder";
import { prisma } from "@/lib/db/prisma";
import { getLastNMessages } from "@/lib/instagram/conversations";
import type { Business } from "@prisma/client";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "sk-mock-key-for-now"
});

export interface AIReplyResult {
  text: string;
  confidence: number;
}

export async function getAIReply(
  message: string,
  business: Business,
  conversationId: string
): Promise<AIReplyResult> {
  const [recent, faqs] = await Promise.all([
    getLastNMessages(conversationId, 5),
    prisma.fAQ.findMany({
      where: {
        businessId: business.id,
        isActive: true
      }
    })
  ]);

  const systemPrompt = buildSystemPrompt(business, faqs);

  const messages = recent.map((m) => ({
    role: m.direction === "INBOUND" ? ("user" as const) : ("assistant" as const),
    content: m.content
  }));
  messages.push({ role: "user", content: message });

  try {
    const res = await anthropic.messages.create({
      model: "claude-3-5-haiku-20241022",
      max_tokens: 300,
      temperature: 0.3,
      system: systemPrompt,
      messages
    });

    const raw = res.content[0].type === "text" ? res.content[0].text : "{}";
    
    // Strip markdown JSON code block formatting if present
    const clean = raw.replace(/```json\s*|\s*```/g, "").trim();
    const parsed = JSON.parse(clean);

    return {
      text: String(parsed.reply ?? ""),
      confidence: Number(parsed.confidence ?? 0.5)
    };
  } catch (err) {
    console.error("AI inference call failed:", err);
    return {
      text: "I'd like to connect you with our team to help you further.",
      confidence: 0.0 // Force human handoff
    };
  }
}
