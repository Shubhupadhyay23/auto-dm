import { redis } from "@/lib/redis/client";

const WINDOW_MS = 23.5 * 60 * 60 * 1000; // 23.5 hours safety margin

export async function sendReply(recipientId: string, text: string, accessToken: string) {
  // Check the 24-hour window
  const lastInboundStr = await redis.get(`last:inbound:${recipientId}`);
  if (!lastInboundStr) {
    throw new Error(`Cannot reply to ${recipientId}: no recent inbound message found in Redis`);
  }

  const elapsed = Date.now() - parseInt(lastInboundStr, 10);
  if (elapsed > WINDOW_MS) {
    throw new Error(`Cannot reply to ${recipientId}: 24-hour window expired (${(elapsed / 3600000).toFixed(1)} hours since last contact)`);
  }

  const res = await fetch(`https://graph.facebook.com/v18.0/me/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipient: { id: recipientId },
      message: { text },
      access_token: accessToken
    })
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Instagram Graph API error: ${err}`);
  }
}

export async function sendPrivateCommentReply(commentId: string, text: string, accessToken: string) {
  // Send a private reply (DM) to a comment using its comment ID
  // Note: 24h window safety validation does not apply for initial private comment replies
  const res = await fetch(`https://graph.facebook.com/v18.0/me/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipient: { comment_id: commentId },
      message: { text },
      access_token: accessToken
    })
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Instagram Private Comment Reply API error: ${err}`);
  }
}
