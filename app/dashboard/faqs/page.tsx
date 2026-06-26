import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import FAQEditor from "@/components/dashboard/FAQEditor";

export default async function FAQsPage() {
  const session = await auth();
  const businessId = (session?.user as any).businessId;

  const faqs = await prisma.fAQ.findMany({
    where: { businessId },
    orderBy: { createdAt: "desc" }
  });

  return (
    <div className="space-y-6 font-sans">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">FAQ Rule Manager</h1>
        <p className="text-sm text-slate-400">
          Define automatic triggers for common questions. Matches are delivered instantly without AI costs.
        </p>
      </div>

      <FAQEditor initialFaqs={faqs} />
    </div>
  );
}
