import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

// Only initialize twilio client if keys are present to prevent crashes in dev
const client = accountSid && authToken ? twilio(accountSid, authToken) : null;

export async function sendWhatsAppAlert(toPhone: string, body: string) {
  if (!client || !process.env.TWILIO_WHATSAPP_FROM) {
    console.warn("Skipping WhatsApp alert: Twilio credentials not configured in environment.");
    return;
  }

  // Format phone number: ensure prefix is present, strip invalid characters
  const cleanPhone = toPhone.replace(/[^\d+]/g, "");
  const formattedTo = cleanPhone.startsWith("+") ? cleanPhone : `+${cleanPhone}`;

  await client.messages.create({
    from: process.env.TWILIO_WHATSAPP_FROM,
    to: `whatsapp:${formattedTo}`,
    body
  });
}
