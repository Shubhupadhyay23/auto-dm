export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";

export default async function DashboardLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const businessId = (session.user as any).businessId;
  if (!businessId) {
    redirect("/onboarding");
  }

  const business = await prisma.business.findUnique({
    where: { id: businessId }
  });

  // If business credentials are not set up yet, route to onboarding wizard
  if (!business || !business.instagramPageId || !business.accessToken) {
    redirect("/onboarding");
  }

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden">
      {/* Sidebar Navigation */}
      <aside className="w-64 border-r border-slate-900 bg-slate-900/60 backdrop-blur-md flex flex-col justify-between p-4 shrink-0">
        <div className="space-y-6">
          <div className="px-2">
            <h1 className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
              Mira AI Assistant
            </h1>
            <p className="text-xs text-slate-500 mt-1 font-medium truncate">{business.name}</p>
          </div>
          
          <nav className="space-y-1">
            <Link
              href="/dashboard"
              className="flex items-center space-x-3 px-3 py-2.5 rounded-md text-sm font-medium hover:bg-slate-800 transition text-slate-300 hover:text-slate-100"
            >
              <span>📊</span>
              <span>Overview</span>
            </Link>
            <Link
              href="/dashboard/conversations"
              className="flex items-center space-x-3 px-3 py-2.5 rounded-md text-sm font-medium hover:bg-slate-800 transition text-slate-300 hover:text-slate-100"
            >
              <span>💬</span>
              <span>Inbox / Chat</span>
            </Link>
            <Link
              href="/dashboard/leads"
              className="flex items-center space-x-3 px-3 py-2.5 rounded-md text-sm font-medium hover:bg-slate-800 transition text-slate-300 hover:text-slate-100"
            >
              <span>👥</span>
              <span>Leads</span>
            </Link>
            <Link
              href="/dashboard/faqs"
              className="flex items-center space-x-3 px-3 py-2.5 rounded-md text-sm font-medium hover:bg-slate-800 transition text-slate-300 hover:text-slate-100"
            >
              <span>📖</span>
              <span>FAQ Rules</span>
            </Link>
            <Link
              href="/dashboard/settings"
              className="flex items-center space-x-3 px-3 py-2.5 rounded-md text-sm font-medium hover:bg-slate-800 transition text-slate-300 hover:text-slate-100"
            >
              <span>⚙️</span>
              <span>Settings</span>
            </Link>
          </nav>
        </div>

        <div className="space-y-4 pt-4 border-t border-slate-900">
          <div className="flex items-center space-x-3 px-2">
            <div className="w-8 h-8 rounded-full bg-violet-600/30 flex items-center justify-center border border-violet-500/20 font-bold text-xs text-violet-400">
              {(session.user.name || "U").charAt(0).toUpperCase()}
            </div>
            <div className="truncate w-36">
              <p className="text-xs font-semibold text-slate-300 truncate">{session.user.name}</p>
              <p className="text-[10px] text-slate-500 truncate">{session.user.email}</p>
            </div>
          </div>
          <Link href="/api/auth/signout" className="block w-full">
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-100 hover:bg-slate-800"
            >
              Logout
            </Button>
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-950 bg-dot-grid overflow-hidden relative">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-violet-600/10 rounded-full blur-[140px] pointer-events-none" />
        <div className="flex-1 overflow-y-auto p-8 relative z-10 custom-scrollbar">
          {children}
        </div>
      </main>
      <Toaster theme="dark" closeButton />
    </div>
  );
}
