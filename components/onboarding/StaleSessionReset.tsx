"use client";

import { useEffect } from "react";
import { signOut } from "next-auth/react";

export default function StaleSessionReset() {
  useEffect(() => {
    signOut({ callbackUrl: "/login" });
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-200 font-sans">
      <div className="text-center space-y-4 max-w-md bg-slate-900 border border-slate-800 rounded-lg p-8 shadow-2xl">
        <h2 className="text-2xl font-extrabold bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
          Refreshing Session
        </h2>
        <p className="text-slate-400 text-sm">
          Your local database was reset. We are automatically clearing your stale session cookies and redirecting you to the login page.
        </p>
        <div className="pt-2">
          <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    </div>
  );
}
