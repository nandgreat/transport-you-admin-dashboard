"use client";

import { useState, useRef, useEffect } from "react";
import { Menu, ChevronDown, LogOut, Building2 } from "lucide-react";
import { useAuthStore, displayName, isSuperAdmin } from "@/store/auth";
import { useLogout } from "@/hooks/useAuth";
import { initials, assetUrl } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export function Header({ onMenu }: { onMenu: () => void }) {
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const superAdmin = isSuperAdmin(user);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6">
      <button
        onClick={onMenu}
        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="hidden items-center gap-2 text-sm text-slate-500 sm:flex">
        {user?.tenant?.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={assetUrl(user.tenant.logo_url) ?? ""}
            alt={user.tenant.name}
            className="h-6 w-6 rounded-full border border-slate-200 object-cover"
          />
        ) : (
          <Building2 className="h-4 w-4" />
        )}
        <span className="font-medium text-slate-700">
          {user?.tenant?.name ?? (superAdmin ? "All Tenants" : "My Tenant")}
        </span>
      </div>

      <div className="ml-auto flex items-center gap-3">
        {superAdmin && <Badge tone="purple">Super Admin</Badge>}

        <div className="relative" ref={ref}>
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-2 rounded-lg py-1.5 pl-1.5 pr-2 transition hover:bg-slate-100"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">
              {initials(user?.first_name, user?.last_name)}
            </span>
            <span className="hidden text-left sm:block">
              <span className="block text-sm font-medium leading-tight text-slate-900">
                {displayName(user) || "Account"}
              </span>
              <span className="block text-xs leading-tight text-slate-400">{user?.email}</span>
            </span>
            <ChevronDown className="h-4 w-4 text-slate-400" />
          </button>

          {open && (
            <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
              <div className="border-b border-slate-100 px-4 py-3">
                <p className="text-sm font-medium text-slate-900">{displayName(user)}</p>
                <p className="truncate text-xs text-slate-400">{user?.email}</p>
              </div>
              <button
                onClick={() => logout.mutate()}
                disabled={logout.isPending}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-red-600 transition hover:bg-red-50 disabled:opacity-50"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
