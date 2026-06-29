export const dynamic = "force-dynamic";

import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function DashboardPage() {
  const session = await auth();
  const businessId = (session?.user as any).businessId;

  // Retrieve metrics
  const totalConversations = await prisma.conversation.count({
    where: { businessId }
  });

  const waitingForHuman = await prisma.conversation.count({
    where: { businessId, status: "WAITING_HUMAN" }
  });

  const totalLeads = await prisma.lead.count({
    where: { businessId }
  });

  const hotLeads = await prisma.lead.count({
    where: { businessId, status: "HOT" }
  });

  const activeFaqCount = await prisma.fAQ.count({
    where: { businessId, isActive: true }
  });

  const recentLeads = await prisma.lead.findMany({
    where: { businessId },
    orderBy: { createdAt: "desc" },
    take: 5
  });

  const conversionPercentage = totalConversations > 0 
    ? Math.round((totalLeads / totalConversations) * 100) 
    : 0;

  return (
    <div className="space-y-8 font-sans">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Dashboard Overview</h1>
          <p className="text-sm text-slate-400">Real-time metrics for your Instagram automation funnel.</p>
        </div>
        <Link href="/dashboard/conversations">
          <Button className="bg-violet-600 hover:bg-violet-700 text-white font-medium text-sm">
            Open Chat Inbox
          </Button>
        </Link>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-slate-800/80 bg-slate-900/50 text-slate-100 backdrop-blur-md shadow-lg glow-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Conversations</CardTitle>
            <span className="text-xl">💬</span>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold">{totalConversations}</div>
            <p className="text-[10px] text-slate-500 mt-1">Unique customer DM threads</p>
          </CardContent>
        </Card>

        <Card className="border-slate-800/80 bg-slate-900/50 text-slate-100 backdrop-blur-md shadow-lg glow-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-wider">Waiting on Human</CardTitle>
            <span className="text-xl">⚠️</span>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-orange-400">{waitingForHuman}</div>
            <p className="text-[10px] text-slate-500 mt-1">Requires manual team reply</p>
          </CardContent>
        </Card>

        <Card className="border-slate-800/80 bg-slate-900/50 text-slate-100 backdrop-blur-md shadow-lg glow-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Leads</CardTitle>
            <span className="text-xl">👥</span>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold">{totalLeads}</div>
            <div className="flex justify-between items-center mt-1">
              <span className="text-[10px] text-slate-500">Funnel conversion rate:</span>
              <span className="text-xs font-bold text-blue-400">{conversionPercentage}%</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-800/80 bg-slate-900/50 text-slate-100 backdrop-blur-md shadow-lg glow-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-wider">Hot Leads</CardTitle>
            <span className="text-xl">🔥</span>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-red-500">{hotLeads}</div>
            <p className="text-[10px] text-slate-500 mt-1">Both pricing + slots mentioned</p>
          </CardContent>
        </Card>
      </div>

      {/* Funnel & Recent Leads Split Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* System Settings/Overview */}
        <Card className="lg:col-span-1 border-slate-800 bg-slate-900/30 text-slate-100">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Automation Status</CardTitle>
            <CardDescription className="text-slate-400">Current active rule setups</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center py-2.5 border-b border-slate-800/60">
              <span className="text-xs text-slate-400">FAQ Rule Engine</span>
              <Badge className="bg-emerald-950 border border-emerald-500/30 text-emerald-400">{activeFaqCount} Active FAQ Rules</Badge>
            </div>
            <div className="flex justify-between items-center py-2.5 border-b border-slate-800/60">
              <span className="text-xs text-slate-400">AI Fallback Model</span>
              <Badge className="bg-blue-950 border border-blue-500/30 text-blue-400 font-mono">Claude 3.5 Haiku</Badge>
            </div>
            <div className="flex justify-between items-center py-2.5 border-b border-slate-800/60">
              <span className="text-xs text-slate-400">Confidence Cutoff</span>
              <Badge variant="outline" className="border-slate-700 text-slate-300 font-mono">&ge; 60%</Badge>
            </div>
            <div className="flex justify-between items-center py-2.5">
              <span className="text-xs text-slate-400">Integrations Enabled</span>
              <div className="flex gap-1.5">
                {process.env.ENABLE_SHEETS === "true" && (
                  <Badge variant="secondary" className="bg-green-950/40 border border-green-500/20 text-green-400 text-[10px]">Sheets</Badge>
                )}
                {process.env.ENABLE_HUBSPOT === "true" && (
                  <Badge variant="secondary" className="bg-orange-950/40 border border-orange-500/20 text-orange-400 text-[10px]">HubSpot</Badge>
                )}
                {process.env.ENABLE_SHEETS !== "true" && process.env.ENABLE_HUBSPOT !== "true" && (
                  <span className="text-[10px] text-slate-500">None configured</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Leads list */}
        <Card className="lg:col-span-2 border-slate-800 bg-slate-900/30 text-slate-100">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-lg font-bold">Recent Leads Captured</CardTitle>
              <CardDescription className="text-slate-400">Latest user data captured by automation funnel.</CardDescription>
            </div>
            <Link href="/dashboard/leads">
              <Button variant="ghost" size="sm" className="text-xs text-slate-400 hover:text-white">
                View All Leads &rarr;
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentLeads.length === 0 ? (
              <div className="h-40 flex flex-col justify-center items-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-md">
                <span>No leads captured yet.</span>
                <span className="mt-1 text-[10px]">Verify your Meta webhook settings and trigger a test message!</span>
              </div>
            ) : (
              <div className="space-y-3">
                {recentLeads.map((lead) => (
                  <div
                    key={lead.id}
                    className="flex justify-between items-center p-3 rounded-md bg-slate-950/40 border border-slate-800/40 hover:border-slate-800 transition"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-200">{lead.name || "Anonymous User"}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {lead.phone ? `📞 ${lead.phone}` : ""} {lead.serviceInterest ? `• 🏷️ ${lead.serviceInterest}` : ""}
                      </p>
                    </div>
                    <Badge
                      className={
                        lead.status === "HOT"
                          ? "bg-red-950/60 border border-red-500/30 text-red-400"
                          : lead.status === "ESCALATED"
                          ? "bg-orange-950/60 border border-orange-500/30 text-orange-400"
                          : lead.status === "WARM"
                          ? "bg-blue-950/60 border border-blue-500/30 text-blue-400"
                          : "bg-slate-800 text-slate-300"
                      }
                    >
                      {lead.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
