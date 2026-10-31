"use client";

import { Bus } from "lucide-react";
import { cn } from "@/lib/utils";

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  // Registration carries more fields, so give it a slightly wider column.
  wide?: boolean;
}

// Shared split layout for the public auth pages (login, register, verify OTP):
// a branded panel on the left and the page's own form on the right.
export function AuthShell({ title, subtitle, children, footer, wide }: AuthShellProps) {
  return (
    <div className="flex min-h-screen">
      {/* Brand panel */}
      <div className="relative hidden w-1/2 flex-col justify-between bg-slate-900 p-12 text-white lg:flex">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600">
            <Bus className="h-6 w-6" />
          </div>
          <span className="text-lg font-bold">Transport You</span>
        </div>
        <div className="max-w-md">
          <h1 className="text-3xl font-bold leading-tight">
            Run your transport operation from one dashboard.
          </h1>
          <p className="mt-4 text-slate-400">
            Manage schedules, bookings, vehicles and routes across your fleet — all in real
            time.
          </p>
        </div>
        <p className="text-sm text-slate-500">
          © {new Date().getFullYear()} Transport You. All rights reserved.
        </p>
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, #4f46e5 0, transparent 40%), radial-gradient(circle at 80% 80%, #6366f1 0, transparent 35%)",
          }}
        />
      </div>

      {/* Content */}
      <div className="flex w-full items-center justify-center px-6 py-12 lg:w-1/2">
        <div className={cn("w-full", wide ? "max-w-md" : "max-w-sm")}>
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600">
              <Bus className="h-6 w-6 text-white" />
            </div>
            <span className="text-lg font-bold text-slate-900">Transport You</span>
          </div>

          <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>

          {children}

          {footer}
        </div>
      </div>
    </div>
  );
}
