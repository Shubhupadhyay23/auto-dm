"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function SettingsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Profile
  const [name, setName] = useState("");
  const [instagramPageId, setInstagramPageId] = useState("");
  const [accessToken, setAccessToken] = useState("");

  // Auto responder
  const [tone, setTone] = useState("friendly");
  const [offHoursMessage, setOffHoursMessage] = useState("");
  const [escalationKeywordsStr, setEscalationKeywordsStr] = useState("");

  // Notifications
  const [notifyEmailsStr, setNotifyEmailsStr] = useState("");
  const [notifyWhatsapp, setNotifyWhatsapp] = useState("");

  // Integrations
  const [sheetId, setSheetId] = useState("");

  // Services
  const [services, setServices] = useState<Array<{ name: string; price: string }>>([]);

  // Hours
  const [hours, setHours] = useState<Record<string, string>>({
    mon: "09:00-18:00",
    tue: "09:00-18:00",
    wed: "09:00-18:00",
    thu: "09:00-18:00",
    fri: "09:00-18:00",
    sat: "10:00-16:00",
    sun: "closed"
  });

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch("/api/business");
        if (!res.ok) throw new Error("Failed to load business settings");
        
        const data = await res.json();
        setName(data.name || "");
        setInstagramPageId(data.instagramPageId || "");
        setAccessToken(data.accessToken || "");
        setTone(data.tone || "friendly");
        setOffHoursMessage(data.offHoursMessage || "");
        setEscalationKeywordsStr(data.escalationKeywords?.join(", ") || "");
        setNotifyEmailsStr(data.notifyEmails?.join(", ") || "");
        setNotifyWhatsapp(data.notifyWhatsapp || "");
        setSheetId(data.sheetId || "");
        setServices(data.services || []);
        if (data.hours) setHours(data.hours);
      } catch (err) {
        toast.error("Failed to load settings from server.");
      } finally {
        setIsLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleHourChange = (day: string, value: string) => {
    setHours((prev) => ({ ...prev, [day]: value }));
  };

  const handleServiceChange = (index: number, field: "name" | "price", value: string) => {
    const updated = [...services];
    updated[index][field] = value;
    setServices(updated);
  };

  const addService = () => {
    setServices((prev) => [...prev, { name: "", price: "" }]);
  };

  const removeService = (index: number) => {
    setServices((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setIsSaving(true);
    
    const escalationKeywords = escalationKeywordsStr
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);

    const notifyEmails = notifyEmailsStr
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean);

    try {
      const res = await fetch("/api/business", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          instagramPageId,
          accessToken,
          tone,
          offHoursMessage,
          escalationKeywords,
          notifyEmails,
          notifyWhatsapp,
          sheetId,
          services,
          hours
        })
      });

      if (!res.ok) throw new Error("Failed to save settings");

      toast.success("Settings updated successfully!");
    } catch (err) {
      toast.error("Failed to update settings. Please check your credentials.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-96 flex items-center justify-center text-slate-500 font-sans text-xs">
        Loading business settings...
      </div>
    );
  }

  return (
    <div className="space-y-8 font-sans max-w-4xl">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">System Settings</h1>
        <p className="text-sm text-slate-400">
          Configure API integrations, notification targets, and business parameters.
        </p>
      </div>

      <div className="space-y-6">
        {/* Meta Integration */}
        <Card className="border-slate-800 bg-slate-900/30 text-slate-100">
          <CardHeader>
            <CardTitle className="text-md font-bold">Instagram API Integration</CardTitle>
            <CardDescription className="text-slate-400 text-xs">Configure access credentials generated in Meta Developers Dashboard.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="biz-name">Business Profile Name</Label>
                <Input
                  id="biz-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-slate-950 border-slate-850 text-slate-100 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="page-id">Instagram Page ID</Label>
                <Input
                  id="page-id"
                  value={instagramPageId}
                  onChange={(e) => setInstagramPageId(e.target.value)}
                  className="bg-slate-950 border-slate-850 text-slate-100 font-mono text-xs"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="token">Page Access Token</Label>
              <Textarea
                id="token"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                rows={3}
                className="bg-slate-950 border-slate-850 text-slate-100 font-mono text-xs"
              />
            </div>
          </CardContent>
        </Card>

        {/* AI & Hours Settings */}
        <Card className="border-slate-800 bg-slate-900/30 text-slate-100">
          <CardHeader>
            <CardTitle className="text-md font-bold">Automation & Scheduling</CardTitle>
            <CardDescription className="text-slate-400 text-xs">Manage AI response tone, escalation keywords, and operational hours.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="tone-select">AI Voice Tone</Label>
                <Select value={tone} onValueChange={(val) => setTone(val || "friendly")}>
                  <SelectTrigger id="tone-select" className="bg-slate-950 border-slate-850 text-slate-100 text-xs">
                    <SelectValue placeholder="Select tone" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-slate-100 text-xs">
                    <SelectItem value="friendly">Friendly & Warm</SelectItem>
                    <SelectItem value="professional">Professional & Direct</SelectItem>
                    <SelectItem value="casual">Casual & Conversational</SelectItem>
                    <SelectItem value="excited">Enthusiastic & Eager</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="escalations">Escalation Keywords (comma separated)</Label>
                <Input
                  id="escalations"
                  value={escalationKeywordsStr}
                  onChange={(e) => setEscalationKeywordsStr(e.target.value)}
                  placeholder="e.g. human, manager, call me"
                  className="bg-slate-950 border-slate-850 text-slate-100 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="offhours-msg">Off-Hours Message</Label>
              <Textarea
                id="offhours-msg"
                value={offHoursMessage}
                onChange={(e) => setOffHoursMessage(e.target.value)}
                rows={2}
                className="bg-slate-950 border-slate-850 text-slate-100 text-xs"
              />
            </div>

            <div className="pt-4 border-t border-slate-900">
              <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Operational Hours</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                {Object.entries(hours).map(([day, val]) => (
                  <div key={day} className="flex flex-col gap-1.5 bg-slate-950/40 p-2.5 rounded border border-slate-850/40">
                    <span className="text-[10px] uppercase font-bold text-slate-500">{day}</span>
                    <Input
                      value={val}
                      onChange={(e) => handleHourChange(day, e.target.value)}
                      placeholder="09:00-18:00 or closed"
                      className="h-8 text-xs bg-slate-950 border-slate-850 text-slate-100 font-mono"
                    />
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notifications & Integrations */}
        <Card className="border-slate-800 bg-slate-900/30 text-slate-100">
          <CardHeader>
            <CardTitle className="text-md font-bold">Staff Alerts & Syncs</CardTitle>
            <CardDescription className="text-slate-400 text-xs">Configure WhatsApp/Email destinations for hot leads and Google Sheets sync targets.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="whatsapp-alert">Staff WhatsApp Number</Label>
                <Input
                  id="whatsapp-alert"
                  value={notifyWhatsapp}
                  onChange={(e) => setNotifyWhatsapp(e.target.value)}
                  placeholder="e.g. +15550100"
                  className="bg-slate-950 border-slate-850 text-slate-100 text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="sheet-id">Google Sheets Spreadsheet ID</Label>
                <Input
                  id="sheet-id"
                  value={sheetId}
                  onChange={(e) => setSheetId(e.target.value)}
                  placeholder="e.g. 1aBcDeFgHiJkLmNoP..."
                  className="bg-slate-950 border-slate-850 text-slate-100 text-xs font-mono"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="emails-alert">Staff Notification Emails (comma separated)</Label>
              <Input
                id="emails-alert"
                value={notifyEmailsStr}
                onChange={(e) => setNotifyEmailsStr(e.target.value)}
                placeholder="e.g. admin@business.com, staff@business.com"
                className="bg-slate-950 border-slate-850 text-slate-100 text-xs"
              />
            </div>
          </CardContent>
        </Card>

        {/* Services & Pricing */}
        <Card className="border-slate-800 bg-slate-900/30 text-slate-100">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-md font-bold">Services catalog</CardTitle>
              <CardDescription className="text-slate-400 text-xs">Offered services shared with the AI to consult on pricing.</CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={addService} className="border-slate-800 hover:bg-slate-800 text-xs h-8">
              + Add Service
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {services.length === 0 ? (
              <div className="text-center text-slate-500 text-xs py-4">No services configured.</div>
            ) : (
              services.map((service, index) => (
                <div key={index} className="flex items-center space-x-3 bg-slate-950/40 p-3 rounded border border-slate-850/40">
                  <div className="flex-1">
                    <Input
                      placeholder="Service Name (e.g. Consultation)"
                      value={service.name}
                      onChange={(e) => handleServiceChange(index, "name", e.target.value)}
                      className="bg-slate-950 border-slate-850 text-slate-100 text-xs h-9"
                    />
                  </div>
                  <div className="w-24">
                    <Input
                      placeholder="Price"
                      value={service.price}
                      onChange={(e) => handleServiceChange(index, "price", e.target.value)}
                      className="bg-slate-950 border-slate-850 text-slate-100 font-mono text-xs h-9"
                    />
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => removeService(index)}
                    className="h-9 px-3"
                  >
                    Delete
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Save Footer */}
        <div className="flex justify-end pt-4">
          <Button
            type="button"
            disabled={isSaving}
            onClick={handleSave}
            className="bg-gradient-to-r from-blue-500 to-violet-600 hover:from-blue-600 hover:to-violet-700 text-white px-6 py-2 font-medium"
          >
            {isSaving ? "Saving Settings..." : "Save Settings"}
          </Button>
        </div>
      </div>
    </div>
  );
}
