"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false
      });

      if (res?.error) {
        setError("Invalid email or password");
        toast.error("Authentication failed. Please check your credentials.");
      } else {
        toast.success("Successfully logged in!");
        window.location.href = "/dashboard";
      }
    } catch (err) {
      setError("An unexpected error occurred");
      toast.error("Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-slate-950 overflow-hidden font-sans">
      {/* Decorative background shapes */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-[120px] pointer-events-none" />

      <Card className="w-full max-w-md mx-4 border-slate-800 bg-slate-900/80 backdrop-blur-md shadow-2xl text-slate-100 relative z-10">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
            Mira AI Assistant
          </CardTitle>
          <CardDescription className="text-slate-400 text-sm">
            Instagram DM Auto-Responder Admin Portal
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4 pt-4">
            {error && (
              <div className="p-3 bg-red-950/50 border border-red-500/40 text-red-300 rounded-md text-xs text-center">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-300">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@business.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-slate-950 border-slate-800 text-slate-100 focus:border-violet-500 focus:ring-violet-500 focus:ring-offset-slate-900 transition"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-300">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-slate-950 border-slate-800 text-slate-100 focus:border-violet-500 focus:ring-violet-500 focus:ring-offset-slate-900 transition"
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col pt-4">
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-500 to-violet-600 hover:from-blue-600 hover:to-violet-700 text-white font-medium py-2 rounded-md transition shadow-lg shadow-violet-950/20"
            >
              {isLoading ? "Signing In..." : "Sign In"}
            </Button>
            <p className="mt-4 text-xs text-slate-500 text-center">
              Demo Credentials: <span className="text-slate-400 font-mono">admin@mira.ai / admin123</span>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
