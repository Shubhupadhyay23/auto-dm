import { NextRequest, NextResponse } from "next/server";
import { verifyHmacSignature } from "@/lib/instagram/webhook";
import { redis } from "@/lib/redis/client";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.INSTAGRAM_VERIFY_TOKEN) {
    console.log("✅ Instagram webhook verified successfully");
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-hub-signature-256") ?? "";

  // 1. HMAC validation
  if (process.env.NODE_ENV === "production" && !verifyHmacSignature(rawBody, signature)) {
    console.warn("⚠️ Invalid HMAC signature, rejecting webhook request");
    return new NextResponse("Forbidden", { status: 403 });
  }

  let body;
  try {
    body = JSON.parse(rawBody);
  } catch (err) {
    return new NextResponse("Invalid JSON", { status: 400 });
  }

  // 2. Enqueue incoming events
  for (const entry of body.entry ?? []) {
    // A. Parse DMs
    for (const messaging of entry.messaging ?? []) {
      const messageId = messaging.message?.mid;
      const senderId = messaging.sender?.id;
      const recipientId = messaging.recipient?.id;
      const messageText = messaging.message?.text;

      if (!messageId || !senderId || !recipientId || !messageText) {
        continue;
      }

      const dedupKey = `dm:dedup:${messageId}`;
      const isNew = await redis.set(dedupKey, "1", "EX", 5, "NX");
      if (!isNew) {
        console.log(`Deduplicated message ID: ${messageId}`);
        continue;
      }

      await redis.set(`last:inbound:${senderId}`, String(Date.now()), "EX", 86400);

      await redis.lpush("dm:queue", JSON.stringify({
        type: "message",
        senderId,
        recipientId,
        messageText,
        timestamp: messaging.timestamp || Date.now(),
        messageId
      }));
    }

    // B. Parse Comments (e.g. comments on Reels)
    for (const change of entry.changes ?? []) {
      if (change.field === "comments") {
        const commentId = change.value?.id;
        const text = change.value?.text;
        const senderId = change.value?.from?.id;
        const username = change.value?.from?.username;
        const mediaId = change.value?.media?.id;
        const mediaProductType = change.value?.media?.media_product_type;
        const recipientId = entry.id; // Page ID is the entry ID

        if (!commentId || !text || !senderId || !recipientId) {
          continue;
        }

        const dedupKey = `comment:dedup:${commentId}`;
        const isNew = await redis.set(dedupKey, "1", "EX", 5, "NX");
        if (!isNew) {
          console.log(`Deduplicated comment ID: ${commentId}`);
          continue;
        }

        await redis.lpush("dm:queue", JSON.stringify({
          type: "comment",
          senderId,
          username,
          recipientId,
          messageText: text,
          commentId,
          mediaId,
          mediaProductType,
          timestamp: Date.now()
        }));
      }
    }
  }

  // 3. Return 200 OK fast to prevent Meta retries
  return NextResponse.json({ ok: true });
}
