"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

interface SetupWizardProps {
  initialBusiness: any;
}

export default function SetupWizard({ initialBusiness }: SetupWizardProps) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState(initialBusiness?.name || "");
  const [instagramPageId, setInstagramPageId] = useState(initialBusiness?.instagramPageId || "");
  const [accessToken, setAccessToken] = useState(initialBusiness?.accessToken || "");
  const [tone, setTone] = useState(initialBusiness?.tone || "friendly");
  const [offHoursMessage, setOffHoursMessage] = useState(initialBusiness?.offHoursMessage || "We are currently closed. We will reply soon!");
  
  const [hours, setHours] = useState<Record<string, string>>(
    initialBusiness?.hours || {
      mon: "09:00-18:00",
      tue: "09:00-18:00",
      wed: "09:00-18:00",
      thu: "09:00-18:00",
      fri: "09:00-18:00",
      sat: "10:00-16:00",
      sun: "closed"
    }
  );

  const [services, setServices] = useState<Array<{ name: string; price: string }>>(
    (initialBusiness?.services as Array<{ name: string; price: string }>) || [
      { name: "Consultation", price: "$50" }
    ]
  );

  const [isLoading, setIsLoading] = useState(false);

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

  const saveConfig = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/business", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          instagramPageId,
          accessToken,
          hours,
          tone,
          offHoursMessage,
          services
        })
      });

      if (!res.ok) {
        throw new Error("Failed to save configuration");
      }

      toast.success("Business configuration saved successfully!");
      window.location.href = "/dashboard";
    } catch (err) {
      toast.error("Error saving setup. Please check your inputs.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto border-slate-800 bg-slate-900 text-slate-100 shadow-xl">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
            Setup Wizard
          </CardTitle>
          <span className="text-xs text-slate-500 font-mono">Step {step} of 3</span>
        </div>
        <CardDescription className="text-slate-400">
          {step === 1 && "Integrate your Meta Developers App and Instagram page keys."}
          {step === 2 && "Configure tone of voice and working hours."}
          {step === 3 && "Add services you offer and compile pricing list."}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="business-name">Business Name</Label>
              <Input
                id="business-name"
                placeholder="e.g. Blossom Salon"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-slate-950 border-slate-800 text-slate-100"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="page-id">Instagram Page ID</Label>
              <Input
                id="page-id"
                placeholder="e.g. 17841400000000000"
                value={instagramPageId}
                onChange={(e) => setInstagramPageId(e.target.value)}
                className="bg-slate-950 border-slate-800 text-slate-100 font-mono text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="access-token">Page Access Token</Label>
              <Textarea
                id="access-token"
                placeholder="Paste the Meta Page Access Token here..."
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                rows={4}
                className="bg-slate-950 border-slate-800 text-slate-100 font-mono text-xs"
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tone-select">AI Reply Tone</Label>
              <Select value={tone} onValueChange={(val) => setTone(val || "friendly")}>
                <SelectTrigger id="tone-select" className="bg-slate-950 border-slate-800 text-slate-100">
                  <SelectValue placeholder="Select tone" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                  <SelectItem value="friendly">Friendly & Warm</SelectItem>
                  <SelectItem value="professional">Professional & Direct</SelectItem>
                  <SelectItem value="casual">Casual & Conversational</SelectItem>
                  <SelectItem value="excited">Enthusiastic & Eager</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="off-hours-msg">Off-Hours Message</Label>
              <Textarea
                id="off-hours-msg"
                placeholder="Sent when customer messages outside hours..."
                value={offHoursMessage}
                onChange={(e) => setOffHoursMessage(e.target.value)}
                rows={2}
                className="bg-slate-950 border-slate-800 text-slate-100"
              />
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800">
              <Label className="text-sm font-semibold text-slate-300">Weekly Business Hours</Label>
              <div className="grid grid-cols-2 gap-3 mt-2">
                {Object.entries(hours).map(([day, val]) => (
                  <div key={day} className="flex items-center space-x-2 justify-between bg-slate-950/40 p-2 rounded border border-slate-800/40">
                    <span className="text-xs uppercase font-bold text-slate-400 w-12">{day}</span>
                    <Input
                      size={10}
                      value={val}
                      onChange={(e) => handleHourChange(day, e.target.value)}
                      placeholder="e.g. 09:00-18:00 or closed"
                      className="h-8 text-xs bg-slate-950 border-slate-800 text-slate-100 font-mono py-1 w-32"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label className="text-sm font-semibold text-slate-300">Services & Pricing</Label>
              <Button type="button" variant="outline" size="sm" onClick={addService} className="border-slate-800 hover:bg-slate-800">
                + Add Service
              </Button>
            </div>
            
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {services.map((service, index) => (
                <div key={index} className="flex items-center space-x-3 bg-slate-950/40 p-3 rounded border border-slate-800/50">
                  <div className="flex-1 space-y-1">
                    <Input
                      placeholder="Service Name (e.g. Wash & Blow Dry)"
                      value={service.name}
                      onChange={(e) => handleServiceChange(index, "name", e.target.value)}
                      className="bg-slate-950 border-slate-800 text-slate-100 h-9"
                    />
                  </div>
                  <div className="w-24">
                    <Input
                      placeholder="Price (e.g. $45)"
                      value={service.price}
                      onChange={(e) => handleServiceChange(index, "price", e.target.value)}
                      className="bg-slate-950 border-slate-800 text-slate-100 h-9 font-mono text-sm"
                    />
                  </div>
                  {services.length > 1 && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => removeService(index)}
                      className="h-9 px-3"
                    >
                      Delete
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex justify-between border-t border-slate-800 pt-4">
        <Button
          type="button"
          variant="outline"
          disabled={step === 1}
          onClick={() => setStep((s) => s - 1)}
          className="border-slate-800 hover:bg-slate-800"
        >
          Back
        </Button>
        {step < 3 ? (
          <Button
            type="button"
            onClick={() => setStep((s) => s + 1)}
            className="bg-violet-600 hover:bg-violet-700 text-white"
          >
            Next
          </Button>
        ) : (
          <Button
            type="button"
            disabled={isLoading}
            onClick={saveConfig}
            className="bg-gradient-to-r from-blue-500 to-violet-600 hover:from-blue-600 hover:to-violet-700 text-white"
          >
            {isLoading ? "Saving Setup..." : "Complete Onboarding"}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
