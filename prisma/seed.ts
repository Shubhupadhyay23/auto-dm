import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = "admin@mira.ai";
  const existingUser = await prisma.user.findUnique({
    where: { email: adminEmail }
  });

  if (existingUser) {
    console.log("Database already seeded.");
    return;
  }

  // Create Business
  const business = await prisma.business.create({
    data: {
      name: "Mira Salon",
      instagramPageId: "mock_page_id",
      accessToken: "mock_access_token_123",
      hours: {
        mon: "09:00-18:00",
        tue: "09:00-18:00",
        wed: "09:00-18:00",
        thu: "09:00-18:00",
        fri: "09:00-18:00",
        sat: "10:00-16:00",
        sun: "closed"
      },
      tone: "friendly & professional",
      offHoursMessage: "Thank you for reaching out! We are currently closed, but a member of our team will get back to you as soon as we open.",
      escalationKeywords: ["speak to someone", "human", "agent", "call me", "talk to human", "manager"],
      notifyEmails: ["staff@mira.ai"],
      notifyWhatsapp: "+15550199",
      services: [
        { name: "Haircut & Style", price: "$60" },
        { name: "Hair Coloring", price: "$120" },
        { name: "Deep Conditioning Treatment", price: "$45" }
      ]
    }
  });

  // Create FAQs
  await prisma.fAQ.createMany({
    data: [
      {
        businessId: business.id,
        keywords: ["location", "address", "where are you", "where is"],
        question: "Where are you located?",
        answer: "We are located at 123 Beauty Lane, Suite A, downtown. There is free parking in the back!",
        isActive: true
      },
      {
        businessId: business.id,
        keywords: ["hours", "open", "timing", "close"],
        question: "What are your business hours?",
        answer: "We are open Monday to Friday from 9 AM to 6 PM, Saturday from 10 AM to 4 PM, and closed on Sundays.",
        isActive: true
      },
      {
        businessId: business.id,
        keywords: ["pricing", "price", "cost", "how much"],
        question: "What are your haircut prices?",
        answer: "Our standard Haircut & Style starts at $60, Hair Coloring starts at $120, and Conditioning Treatments are $45. Book via DM!",
        isActive: true
      }
    ]
  });

  // Create Admin Owner User
  const hashedPassword = await bcrypt.hash("admin123", 10);
  await prisma.user.create({
    data: {
      name: "Salon Owner",
      email: adminEmail,
      password: hashedPassword,
      role: "OWNER",
      businessId: business.id
    }
  });

  console.log("✅ Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
