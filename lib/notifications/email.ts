import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_PORT === "465",
  auth: {
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || ""
  }
});

export async function sendEmail(to: string[], subject: string, html: string) {
  if (to.length === 0 || !process.env.SMTP_USER) {
    console.warn("Skipping email alert: no recipients or SMTP credentials configured.");
    return;
  }

  await transporter.sendMail({
    from: `"Mira AI Assistant" <${process.env.SMTP_USER}>`,
    to: to.join(","),
    subject,
    html
  });
}
