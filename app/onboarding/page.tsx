export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import SetupWizard from "@/components/onboarding/SetupWizard";
import StaleSessionReset from "@/components/onboarding/StaleSessionReset";

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const businessId = (session.user as any).businessId;
  if (!businessId) {
    // If the user has no business, create a shell business and update the user record
    const newBusiness = await prisma.business.create({
      data: {
        name: "My New Business",
        instagramPageId: "",
        accessToken: "",
        hours: {
          mon: "09:00-18:00",
          tue: "09:00-18:00",
          wed: "09:00-18:00",
          thu: "09:00-18:00",
          fri: "09:00-18:00",
          sat: "10:00-16:00",
          sun: "closed"
        },
        tone: "friendly"
      }
    });

    await prisma.user.update({
      where: { id: (session.user as any).id },
      data: { businessId: newBusiness.id }
    });

    // Refresh context
    redirect("/onboarding");
  }

  const business = await prisma.business.findUnique({
    where: { id: businessId }
  });

  if (!business) {
    return <StaleSessionReset />;
  }

  // If business has already finished onboarding (i.e. has pageId and token set), redirect to dashboard
  if (business.instagramPageId && business.accessToken) {
    redirect("/dashboard");
  }

  return (
    <div className="relative min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 font-sans">
      <div className="absolute top-[-10%] left-[-10%] w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-violet-600/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-2xl text-center mb-6 relative z-10">
        <h1 className="text-4xl font-extrabold text-white mb-2 tracking-tight">
          Welcome to Mira AI Assistant
        </h1>
        <p className="text-slate-400 text-sm">
          Let's quickly get your Instagram auto-responder configured.
        </p>
      </div>

      <div className="w-full max-w-2xl relative z-10">
        <SetupWizard initialBusiness={business} />
      </div>
    </div>
  );
}
