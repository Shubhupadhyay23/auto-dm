import { google } from "googleapis";

function getGoogleAuth() {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is not configured in the environment.");
  }
  
  const credentialsJson = JSON.parse(
    Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_JSON, "base64").toString("utf-8")
  );

  return new google.auth.GoogleAuth({
    credentials: credentialsJson,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"]
  });
}

export async function appendLeadRow(sheetId: string, lead: any) {
  if (process.env.ENABLE_SHEETS !== "true") {
    console.log("Google Sheets sync is disabled via feature flag.");
    return;
  }

  try {
    const auth = getGoogleAuth();
    const sheets = google.sheets({ version: "v4", auth });

    const dashboardUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/dashboard/conversations/${lead.conversationId}`;
    
    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: "Sheet1!A:G",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [
          [
            new Date().toISOString(),
            lead.name ?? "",
            lead.phone ?? "",
            lead.serviceInterest ?? "",
            lead.status,
            lead.instagramHandle ?? "",
            dashboardUrl
          ]
        ]
      }
    });

    console.log(`Successfully synced lead ${lead.id} to Google Sheet ${sheetId}`);
  } catch (error) {
    console.error("Failed to append row to Google Sheets:", error);
  }
}
