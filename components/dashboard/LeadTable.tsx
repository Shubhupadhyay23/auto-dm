"use client";

import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface Lead {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  serviceInterest: string | null;
  status: "NEW" | "WARM" | "HOT" | "ESCALATED" | "RESOLVED";
  notes: string | null;
  createdAt: string;
}

interface LeadTableProps {
  initialLeads: Lead[];
}

export default function LeadTable({ initialLeads }: LeadTableProps) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  // Edit states for modal
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editService, setEditService] = useState("");
  const [editStatus, setEditStatus] = useState<"NEW" | "WARM" | "HOT" | "ESCALATED" | "RESOLVED">("NEW");
  const [editNotes, setEditNotes] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const filteredLeads = statusFilter === "ALL" 
    ? leads 
    : leads.filter((l) => l.status === statusFilter);

  const openEditModal = (lead: Lead) => {
    setSelectedLead(lead);
    setEditName(lead.name || "");
    setEditPhone(lead.phone || "");
    setEditEmail(lead.email || "");
    setEditService(lead.serviceInterest || "");
    setEditStatus(lead.status);
    setEditNotes(lead.notes || "");
    setModalOpen(true);
  };

  const handleUpdate = async () => {
    if (!selectedLead) return;
    setIsUpdating(true);

    try {
      const res = await fetch(`/api/leads/${selectedLead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          phone: editPhone,
          email: editEmail,
          serviceInterest: editService,
          status: editStatus,
          notes: editNotes
        })
      });

      if (!res.ok) throw new Error("Failed to update lead");

      const updatedLead = await res.json();
      
      // Update local state list
      setLeads((prev) =>
        prev.map((l) => (l.id === selectedLead.id ? { ...l, ...updatedLead } : l))
      );

      toast.success("Lead details updated and synced successfully!");
      setModalOpen(false);
    } catch (e) {
      toast.error("Failed to save changes. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Filter Toolbar */}
      <div className="flex justify-between items-center bg-slate-900/30 p-4 rounded-lg border border-slate-800">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Filter Status:</span>
        <div className="flex gap-2">
          {["ALL", "NEW", "WARM", "HOT", "ESCALATED", "RESOLVED"].map((status) => (
            <Button
              key={status}
              size="sm"
              variant={statusFilter === status ? "default" : "outline"}
              onClick={() => setStatusFilter(status)}
              className={statusFilter === status 
                ? "bg-violet-600 hover:bg-violet-700 text-white text-xs" 
                : "border-slate-800 hover:bg-slate-800 text-slate-300 text-xs"
              }
            >
              {status}
            </Button>
          ))}
        </div>
      </div>

      {/* Leads Table */}
      <div className="rounded-lg border border-slate-800 bg-slate-900/20 overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-900/60 border-b border-slate-850">
            <TableRow>
              <TableHead className="text-slate-400">Name</TableHead>
              <TableHead className="text-slate-400">Phone</TableHead>
              <TableHead className="text-slate-400">Service Interest</TableHead>
              <TableHead className="text-slate-400">Status</TableHead>
              <TableHead className="text-slate-400">Captured Date</TableHead>
              <TableHead className="text-slate-400 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLeads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-slate-500 text-xs">
                  No leads found matching your filter criteria.
                </TableCell>
              </TableRow>
            ) : (
              filteredLeads.map((lead) => (
                <TableRow key={lead.id} className="border-b border-slate-900 hover:bg-slate-900/10">
                  <TableCell className="font-semibold text-slate-200">{lead.name || "Anonymous"}</TableCell>
                  <TableCell className="font-mono text-slate-300 text-xs">{lead.phone || "n/a"}</TableCell>
                  <TableCell className="text-slate-300 text-xs truncate max-w-xs">{lead.serviceInterest || "n/a"}</TableCell>
                  <TableCell>
                    <Badge
                      className={
                        lead.status === "HOT"
                          ? "bg-red-950/60 border border-red-500/30 text-red-400"
                          : lead.status === "ESCALATED"
                          ? "bg-orange-950/60 border border-orange-500/30 text-orange-400"
                          : lead.status === "WARM"
                          ? "bg-blue-950/60 border border-blue-500/30 text-blue-400"
                          : lead.status === "RESOLVED"
                          ? "bg-emerald-950/60 border border-emerald-500/30 text-emerald-400"
                          : "bg-slate-850 border border-slate-700 text-slate-300"
                      }
                    >
                      {lead.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-450 text-xs font-mono">
                    {new Date(lead.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEditModal(lead)}
                      className="border-slate-800 hover:bg-slate-800 text-xs h-8"
                    >
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit Details Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Lead Details</DialogTitle>
            <DialogDescription className="text-slate-400">
              Modifying lead data triggers a background update to active Google Sheets & HubSpot CRM records.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right text-slate-400">Name</Label>
              <Input
                id="name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="col-span-3 bg-slate-950 border-slate-800 text-slate-100"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="phone" className="text-right text-slate-400">Phone</Label>
              <Input
                id="phone"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                className="col-span-3 bg-slate-950 border-slate-800 text-slate-100 font-mono"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right text-slate-400">Email</Label>
              <Input
                id="email"
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                className="col-span-3 bg-slate-950 border-slate-800 text-slate-100"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="service" className="text-right text-slate-400">Service Interest</Label>
              <Input
                id="service"
                value={editService}
                onChange={(e) => setEditService(e.target.value)}
                className="col-span-3 bg-slate-950 border-slate-800 text-slate-100"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="status" className="text-right text-slate-400">Funnel Status</Label>
              <Select
                value={editStatus}
                onValueChange={(val: any) => setEditStatus(val)}
              >
                <SelectTrigger id="status" className="col-span-3 bg-slate-950 border-slate-800 text-slate-100">
                  <SelectValue placeholder="Select Status" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                  <SelectItem value="NEW">NEW</SelectItem>
                  <SelectItem value="WARM">WARM</SelectItem>
                  <SelectItem value="HOT">HOT</SelectItem>
                  <SelectItem value="ESCALATED">ESCALATED</SelectItem>
                  <SelectItem value="RESOLVED">RESOLVED</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="notes" className="text-right text-slate-400">Internal Notes</Label>
              <Textarea
                id="notes"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                rows={3}
                className="col-span-3 bg-slate-950 border-slate-800 text-slate-100"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setModalOpen(false)}
              className="border-slate-800 hover:bg-slate-800 text-slate-350"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={isUpdating}
              onClick={handleUpdate}
              className="bg-violet-600 hover:bg-violet-700 text-white"
            >
              {isUpdating ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
