export const dynamic = "force-dynamic";

import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export default async function ConversationsLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const businessId = (session?.user as any).businessId;

  // Retrieve all conversations for this business
  const conversations = await prisma.conversation.findMany({
    where: { businessId },
    include: {
      lead: true,
      messages: {
        orderBy: { sentAt: "desc" },
        take: 1
      }
    },
    orderBy: { updatedAt: "desc" }
  });

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-6 overflow-hidden font-sans">
      {/* Left panel: Threads List */}
      <div className="w-80 border border-slate-900 bg-slate-900/10 rounded-lg flex flex-col overflow-hidden shrink-0">
        <div className="px-4 py-3 bg-slate-900/40 border-b border-slate-900">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-350">Conversations Inbox</h2>
        </div>
        
        <div className="flex-1 overflow-y-auto divide-y divide-slate-950 custom-scrollbar">
          {conversations.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No conversations found.
            </div>
          ) : (
            conversations.map((conv) => {
              const lastMsg = conv.messages[0];
              return (
                <Link
                  key={conv.id}
                  href={`/dashboard/conversations/${conv.id}`}
                  className="block p-4 hover:bg-slate-900/20 transition cursor-pointer"
                >
                  <div className="flex justify-between items-start">
                    <span className="font-semibold text-sm text-slate-200 truncate w-36">
                      @{conv.instagramUserId}
                    </span>
                    <span className="text-[9px] text-slate-500 font-mono">
                      {new Date(conv.updatedAt).toLocaleDateString([], {
                        month: "short",
                        day: "numeric"
                      })}
                    </span>
                  </div>
                  
                  {conv.lead && (
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      👤 {conv.lead.name || "Anonymous Lead"} ({conv.lead.status})
                    </p>
                  )}

                  <p className="text-xs text-slate-500 mt-2 truncate">
                    {lastMsg ? lastMsg.content : "(No messages recorded)"}
                  </p>

                  <div className="flex justify-between items-center mt-2.5">
                    <Badge
                      className={
                        conv.status === "ACTIVE"
                          ? "bg-blue-950/40 border border-blue-500/10 text-blue-400 text-[8px] py-0 px-1 font-bold"
                          : conv.status === "WAITING_HUMAN"
                          ? "bg-amber-950/40 border border-amber-500/10 text-amber-400 text-[8px] py-0 px-1 font-bold"
                          : "bg-slate-900/40 border border-slate-800 text-slate-450 text-[8px] py-0 px-1 font-bold"
                      }
                    >
                      {conv.status}
                    </Badge>
                    
                    {lastMsg?.confidence !== null && lastMsg?.confidence !== undefined && (
                      <span className="text-[9px] text-slate-500 font-medium">
                        AI Conf: {Math.round(lastMsg.confidence * 100)}%
                      </span>
                    )}
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>

      {/* Right panel: Active Chat Detail */}
      <div className="flex-1 min-w-0">
        {children}
      </div>
    </div>
  );
}
