import { prisma } from "@/lib/db/prisma";
import { redis } from "@/lib/redis/client";
import type { FAQ } from "@prisma/client";

const CACHE_TTL_SECONDS = 300; // 5 minutes

export async function matchFAQ(message: string, businessId: string): Promise<FAQ | null> {
  const cacheKey = `faqs:${businessId}`;
  let faqs: FAQ[];

  const cached = await redis.get(cacheKey);
  if (cached) {
    faqs = JSON.parse(cached);
  } else {
    faqs = await prisma.fAQ.findMany({
      where: {
        businessId,
        isActive: true
      }
    });
    await redis.setex(cacheKey, CACHE_TTL_SECONDS, JSON.stringify(faqs));
  }

  // Normalize incoming message: lowercase, strip punctuation, compress whitespace
  const normalized = message
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  for (const faq of faqs) {
    const matched = faq.keywords.some((kw) => {
      const k = kw.toLowerCase().trim();
      return normalized.includes(k);
    });
    if (matched) {
      return faq;
    }
  }

  return null;
}

export async function invalidateFAQCache(businessId: string) {
  await redis.del(`faqs:${businessId}`);
}

export async function incrementFAQMatchCount(faqId: string) {
  await prisma.fAQ.update({
    where: { id: faqId },
    data: {
      matchCount: {
        increment: 1
      }
    }
  });
}
