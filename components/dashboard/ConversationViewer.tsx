"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface Message {
  id: string;
  direction: "INBOUND" | "OUTBOUND";
  content: string;
  replyType: string | null;
  confidence: number | null;
  sentAt: string;
}

interface Conversation {
  id: string;
  instagramUserId: string;
  status: "ACTIVE" | "WAITING_HUMAN" | "RESOLVED";
  lead?: {
    id: string;
    name: string | null;
    status: string;
  } | null;
}

interface ConversationViewerProps {
  conversation: Conversation;
  initialMessages: Message[];
}

export default function ConversationViewer({
  conversation: initialConv,
  initialMessages
}: ConversationViewerProps) {
  const [conversation, setConversation] = useState<Conversation>(initialConv);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of conversation
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Poll for new messages every 3 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/conversations/${conversation.id}/messages`);
        if (res.ok) {
          const data = await res.json();
          // Map backend dates if needed, otherwise string dates match
          setMessages(data);
        }
      } catch (err) {
        console.error("Poller error:", err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [conversation.id]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    setIsSending(true);
    const text = inputText;
    setInputText("");

    try {
      const res = await fetch(`/api/conversations/${conversation.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to dispatch manual message");
      }

      const savedMsg = await res.json();
      setMessages((prev) => [...prev, savedMsg]);
      toast.success("Manual reply dispatched successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to send message. Is the 24h window closed?");
      setInputText(text); // Restore text on error
    } finally {
      setIsSending(false);
    }
  };

  const updateStatus = async (newStatus: "ACTIVE" | "RESOLVED" | "WAITING_HUMAN") => {
    setIsResolving(true);
    try {
      const res = await fetch(`/api/conversations/${conversation.id}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });

      if (!res.ok) throw new Error("Failed to update status");
      
      const updated = await res.json();
      setConversation((prev) => ({ ...prev, status: updated.status }));
      toast.success(`Thread status updated to ${newStatus}`);
    } catch (err) {
      toast.error("Failed to change thread status.");
    } finally {
      setIsResolving(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/10 border border-slate-900 rounded-lg overflow-hidden">
      {/* Thread Header */}
      <div className="flex justify-between items-center px-6 py-4 bg-slate-900/40 border-b border-slate-900 shrink-0">
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-slate-200">User @{conversation.instagramUserId}</span>
            <Badge
              className={
                conversation.status === "ACTIVE"
                  ? "bg-blue-950 border border-blue-500/30 text-blue-400"
                  : conversation.status === "WAITING_HUMAN"
                  ? "bg-amber-950 border border-amber-500/30 text-amber-400"
                  : "bg-emerald-950 border border-emerald-500/30 text-emerald-400"
              }
            >
              {conversation.status}
            </Badge>
          </div>
          {conversation.lead && (
            <p className="text-xs text-slate-400 mt-1">
              Lead: <span className="text-slate-200 font-medium">{conversation.lead.name || "Anonymous"}</span> ({conversation.lead.status})
            </p>
          )}
        </div>

        <div className="flex gap-2">
          {conversation.status !== "RESOLVED" ? (
            <Button
              size="sm"
              disabled={isResolving}
              onClick={() => updateStatus("RESOLVED")}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8"
            >
              ✓ Resolve Thread
            </Button>
          ) : (
            <Button
              size="sm"
              disabled={isResolving}
              onClick={() => updateStatus("ACTIVE")}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs h-8 border border-slate-700"
            >
              Reopen Thread
            </Button>
          )}
          {conversation.status !== "WAITING_HUMAN" && (
            <Button
              size="sm"
              variant="outline"
              disabled={isResolving}
              onClick={() => updateStatus("WAITING_HUMAN")}
              className="border-slate-850 hover:bg-slate-800 text-amber-500 text-xs h-8"
            >
              ⚠️ Escalate
            </Button>
          )}
        </div>
      </div>

      {/* Message History list */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-500 text-xs font-medium">
            No messages recorded in this thread yet.
          </div>
        ) : (
          messages.map((msg) => {
            const isSelf = msg.direction === "OUTBOUND";
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isSelf ? "items-end" : "items-start"}`}
              >
                <div
                  className={`max-w-[70%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    isSelf
                      ? "bg-violet-600 text-white rounded-tr-none"
                      : "bg-slate-900 border border-slate-850 text-slate-200 rounded-tl-none"
                  }`}
                >
                  {msg.content}
                </div>
                
                {/* Meta details */}
                <div className="flex items-center space-x-2 mt-1 px-1">
                  <span className="text-[9px] text-slate-500 font-mono">
                    {new Date(msg.sentAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </span>
                  {msg.replyType && (
                    <Badge variant="secondary" className="text-[8px] bg-slate-950 border border-slate-850 text-slate-400 py-0 px-1 font-bold">
                      {msg.replyType}
                      {msg.confidence !== null && ` (${Math.round(msg.confidence * 100)}%)`}
                    </Badge>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={scrollRef} />
      </div>

      {/* Manual Input Footer */}
      <form onSubmit={handleSend} className="p-4 bg-slate-900/40 border-t border-slate-900 flex gap-2 shrink-0">
        <Input
          placeholder={
            conversation.status === "RESOLVED"
              ? "Reopen the thread to type a message..."
              : "Type your manual reply here (Meta 24h window applies)..."
          }
          disabled={conversation.status === "RESOLVED" || isSending}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          className="bg-slate-950 border-slate-850 text-slate-100 placeholder-slate-500 flex-1 focus:border-violet-500 focus:ring-0"
        />
        <Button
          type="submit"
          disabled={conversation.status === "RESOLVED" || isSending || !inputText.trim()}
          className="bg-violet-600 hover:bg-violet-700 text-white font-medium text-xs px-4"
        >
          {isSending ? "Sending..." : "Send DM"}
        </Button>
      </form>
    </div>
  );
}
