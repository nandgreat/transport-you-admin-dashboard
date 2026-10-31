"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bus, X } from "lucide-react";
import { navSections } from "./nav";
import { useAuthStore, isSuperAdmin } from "@/store/auth";
import { cn } from "@/lib/utils";

function isActive(href: string, pathname: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(href + "/");
}

export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const isSuper = isSuperAdmin(useAuthStore((s) => s.user));

  // Hide super-admin-only items for everyone else, and drop sections that end
  // up empty (e.g. "Administration" for a plain tenant admin).
  const sections = navSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => !item.superAdmin || isSuper),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-2.5 border-b border-slate-800 px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600">
          <Bus className="h-5 w-5 text-white" />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-bold text-white">Transport You</p>
          <p className="text-[11px] text-slate-400">Admin Console</p>
        </div>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
        {sections.map((section, i) => (
          <div key={i}>
            {section.title && (
              <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                {section.title}
              </p>
            )}
            <ul className="space-y-1">
              {section.items.map((item) => {
                const active = isActive(item.href, pathname, item.exact);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
                        active
                          ? "bg-brand-600 text-white"
                          : "text-slate-300 hover:bg-slate-800 hover:text-white"
                      )}
                    >
                      <Icon className="h-4.5 w-4.5 shrink-0" style={{ width: 18, height: 18 }} />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 bg-slate-900 lg:block">
      <SidebarContent />
    </aside>
  );
}

export function MobileSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} />
      <div className="absolute inset-y-0 left-0 w-64 bg-slate-900 shadow-xl">
        <button
          onClick={onClose}
          className="absolute right-3 top-4 rounded-md p-1 text-slate-400 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>
        <SidebarContent onNavigate={onClose} />
      </div>
    </div>
  );
}
