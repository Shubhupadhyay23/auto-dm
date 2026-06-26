"use client";

import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

interface FAQ {
  id: string;
  question: string;
  answer: string;
  keywords: string[];
  isActive: boolean;
  matchCount: number;
}

interface FAQEditorProps {
  initialFaqs: FAQ[];
}

export default function FAQEditor({ initialFaqs }: FAQEditorProps) {
  const [faqs, setFaqs] = useState<FAQ[]>(initialFaqs);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedFaq, setSelectedFaq] = useState<FAQ | null>(null);

  // Form states
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [keywordsStr, setKeywordsStr] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const openAddModal = () => {
    setSelectedFaq(null);
    setQuestion("");
    setAnswer("");
    setKeywordsStr("");
    setIsActive(true);
    setModalOpen(true);
  };

  const openEditModal = (faq: FAQ) => {
    setSelectedFaq(faq);
    setQuestion(faq.question);
    setAnswer(faq.answer);
    setKeywordsStr(faq.keywords.join(", "));
    setIsActive(faq.isActive);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || !answer.trim() || !keywordsStr.trim()) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setIsSubmitting(true);
    const keywords = keywordsStr
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);

    try {
      const url = selectedFaq ? `/api/faqs/${selectedFaq.id}` : "/api/faqs";
      const method = selectedFaq ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, answer, keywords, isActive })
      });

      if (!res.ok) throw new Error("Failed to save FAQ");

      const savedFaq = await res.json();

      if (selectedFaq) {
        setFaqs((prev) => prev.map((f) => (f.id === selectedFaq.id ? savedFaq : f)));
        toast.success("FAQ updated successfully!");
      } else {
        setFaqs((prev) => [savedFaq, ...prev]);
        toast.success("FAQ created successfully!");
      }

      setModalOpen(false);
    } catch (err) {
      toast.error("An error occurred saving the FAQ rule.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (faqId: string) => {
    if (!confirm("Are you sure you want to delete this FAQ rule? This cannot be undone.")) return;

    try {
      const res = await fetch(`/api/faqs/${faqId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete FAQ");

      setFaqs((prev) => prev.filter((f) => f.id !== faqId));
      toast.success("FAQ rule deleted.");
    } catch (err) {
      toast.error("Failed to delete FAQ rule.");
    }
  };

  const toggleActiveStatus = async (faq: FAQ, checked: boolean) => {
    try {
      const res = await fetch(`/api/faqs/${faq.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: checked })
      });

      if (!res.ok) throw new Error("Failed to toggle status");
      
      setFaqs((prev) =>
        prev.map((f) => (f.id === faq.id ? { ...f, isActive: checked } : f))
      );
      toast.success(`Rule ${checked ? "enabled" : "disabled"}`);
    } catch (err) {
      toast.error("Failed to update rule status.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-350">FAQ Match Database</h2>
        <Button onClick={openAddModal} className="bg-violet-600 hover:bg-violet-700 text-white text-xs h-8">
          + Add FAQ Rule
        </Button>
      </div>

      {/* Rules Table */}
      <div className="rounded-lg border border-slate-900 bg-slate-900/10 overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-900/40 border-b border-slate-900">
            <TableRow>
              <TableHead className="text-slate-400 text-xs">Keywords</TableHead>
              <TableHead className="text-slate-400 text-xs">Question / Trigger</TableHead>
              <TableHead className="text-slate-400 text-xs">Auto Answer</TableHead>
              <TableHead className="text-slate-400 text-xs">Matches</TableHead>
              <TableHead className="text-slate-400 text-xs">Active</TableHead>
              <TableHead className="text-slate-400 text-xs text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {faqs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-slate-500 text-xs">
                  No FAQ rules created yet. Auto replies will default directly to Claude AI fallback.
                </TableCell>
              </TableRow>
            ) : (
              faqs.map((faq) => (
                <TableRow key={faq.id} className="border-b border-slate-900/60 hover:bg-slate-900/5">
                  <TableCell className="max-w-[200px]">
                    <div className="flex flex-wrap gap-1.5">
                      {faq.keywords.map((kw) => (
                        <Badge key={kw} variant="secondary" className="bg-slate-950 border border-slate-850 text-slate-350 text-[10px] py-0 px-1 font-mono">
                          {kw}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="font-semibold text-slate-200 text-xs">{faq.question}</TableCell>
                  <TableCell className="text-slate-350 text-xs max-w-xs truncate">{faq.answer}</TableCell>
                  <TableCell className="font-mono text-xs text-slate-300 text-center">{faq.matchCount}</TableCell>
                  <TableCell>
                    <Switch
                      checked={faq.isActive}
                      onCheckedChange={(checked) => toggleActiveStatus(faq, checked)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditModal(faq)}
                        className="border-slate-850 hover:bg-slate-800 text-xs h-7 px-2"
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(faq.id)}
                        className="text-xs h-7 px-2"
                      >
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-lg">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{selectedFaq ? "Edit FAQ Rule" : "Create FAQ Rule"}</DialogTitle>
              <DialogDescription className="text-slate-400">
                Configure direct-response rules. Matching keywords triggers the answer instantly without AI cost.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="question" className="text-slate-350 text-xs">Question / Intention Label</Label>
                <Input
                  id="question"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="e.g. What is your address?"
                  required
                  className="bg-slate-950 border-slate-800 text-slate-100"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="keywords" className="text-slate-350 text-xs">Trigger Keywords (comma separated)</Label>
                <Input
                  id="keywords"
                  value={keywordsStr}
                  onChange={(e) => setKeywordsStr(e.target.value)}
                  placeholder="e.g. location, address, map, directions"
                  required
                  className="bg-slate-950 border-slate-800 text-slate-100 font-mono text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="answer" className="text-slate-350 text-xs">Automatic Response Answer</Label>
                <Textarea
                  id="answer"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="We are located at..."
                  required
                  rows={4}
                  className="bg-slate-950 border-slate-800 text-slate-100"
                />
              </div>
              <div className="flex items-center space-x-2 pt-2">
                <Switch
                  id="isActive"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
                <Label htmlFor="isActive" className="text-slate-300 text-xs">Enable this FAQ rule auto-responder</Label>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
                className="border-slate-850 hover:bg-slate-800 text-slate-350 text-xs h-9"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-violet-600 hover:bg-violet-700 text-white text-xs h-9"
              >
                {isSubmitting ? "Saving..." : "Save Rule"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
