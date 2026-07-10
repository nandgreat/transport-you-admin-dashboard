"use client";

import { Building2, User as UserIcon, ShieldCheck, LogOut } from "lucide-react";
import { useAuthStore, displayName, isSuperAdmin, primaryRole } from "@/store/auth";
import { useLogout } from "@/hooks/useAuth";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function Row({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 py-3 last:border-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm font-medium text-slate-900">{value ?? "—"}</span>
    </div>
  );
}

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();
  const superAdmin = isSuperAdmin(user);

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Your account and tenant details." />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserIcon className="h-4 w-4 text-slate-400" /> Profile
            </CardTitle>
          </CardHeader>
          <CardBody className="py-1">
            <Row label="Name" value={displayName(user)} />
            <Row label="Email" value={user?.email} />
            <Row label="Phone" value={user?.phone} />
            <Row
              label="Role"
              value={
                superAdmin ? (
                  <Badge tone="purple">Super Admin</Badge>
                ) : (
                  <Badge tone="blue">{primaryRole(user)}</Badge>
                )
              }
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-slate-400" /> Tenant
            </CardTitle>
          </CardHeader>
          <CardBody className="py-1">
            <Row label="Tenant" value={user?.tenant?.name} />
            <Row label="Tenant ID" value={user?.tenant_id ?? "—"} />
            <Row label="Email" value={user?.tenant?.email} />
            <Row label="Phone" value={user?.tenant?.phone} />
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-slate-400" /> Session
          </CardTitle>
        </CardHeader>
        <CardBody className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-900">Sign out of this device</p>
            <p className="text-sm text-slate-500">You&apos;ll need to sign in again to access the dashboard.</p>
          </div>
          <Button variant="danger" onClick={() => logout.mutate()} loading={logout.isPending}>
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        </CardBody>
      </Card>
    </div>
  );
}
