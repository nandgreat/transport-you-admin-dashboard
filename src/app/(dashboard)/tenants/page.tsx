"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Plus,
  Building2,
  Pencil,
  Trash2,
  Search,
  Users,
  Bus,
  CalendarClock,
  Ticket,
  MapPin,
  Eye,
  Mail,
  Phone,
  Calendar,
} from "lucide-react";
import {
  useTenantCompanies,
  useCreateTenantCompany,
  useUpdateTenantCompany,
  useDeleteTenantCompany,
} from "@/hooks/resources";
import { useQueryFlag } from "@/hooks/useQueryFlag";
import { useAuthStore, isSuperAdmin } from "@/store/auth";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Table, THead, TH, TBody, TR, TD } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState, LoadingBlock, ErrorState } from "@/components/ui/states";
import { Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/ui/confirm";
import { Input, Select, Field } from "@/components/ui/input";
import { toast } from "@/components/ui/toaster";
import { apiErrorMessage } from "@/lib/axios";
import { formatDate } from "@/lib/utils";
import type {
  TenantCompany,
  TenantCreatePayload,
  TenantUpdatePayload,
} from "@/types/api";

const schema = z
  .object({
    name: z.string().min(1, "Company name is required"),
    email: z.string().email("Enter a valid email").or(z.literal("")).optional(),
    phone: z.string().optional(),
    status: z.enum(["active", "inactive"]),
    // Optional first admin, only offered when creating a company.
    admin_first_name: z.string().optional(),
    admin_last_name: z.string().optional(),
    admin_email: z.string().email("Enter a valid email").or(z.literal("")).optional(),
    admin_phone: z.string().optional(),
    admin_password: z.string().optional(),
  })
  .refine(
    (v) =>
      !v.admin_email ||
      (!!v.admin_first_name && !!v.admin_last_name && (v.admin_password?.length ?? 0) >= 8),
    {
      path: ["admin_password"],
      message: "Admin first name, last name and an 8+ character password are required",
    }
  );

type FormValues = z.infer<typeof schema>;

function TenantFormModal({
  open,
  onClose,
  tenant,
}: {
  open: boolean;
  onClose: () => void;
  tenant?: TenantCompany | null;
}) {
  const isEdit = !!tenant;
  const create = useCreateTenantCompany();
  const update = useUpdateTenantCompany();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (!open) return;
    reset({
      name: tenant?.name ?? "",
      email: tenant?.email ?? "",
      phone: tenant?.phone ?? "",
      status: (tenant?.status as "active" | "inactive") ?? "active",
      admin_first_name: "",
      admin_last_name: "",
      admin_email: "",
      admin_phone: "",
      admin_password: "",
    });
  }, [open, tenant, reset]);

  const busy = create.isPending || update.isPending;

  const submit = (v: FormValues) => {
    if (isEdit && tenant) {
      const body: TenantUpdatePayload = {
        name: v.name.trim(),
        email: v.email?.trim() || null,
        phone: v.phone?.trim() || null,
        status: v.status,
      };
      update.mutate(
        { id: tenant.id, body },
        {
          onSuccess: () => {
            toast.success("Company updated");
            onClose();
          },
          onError: (e) => toast.error(apiErrorMessage(e, "Could not update company")),
        }
      );
      return;
    }

    const body: TenantCreatePayload = {
      name: v.name.trim(),
      email: v.email?.trim() || null,
      phone: v.phone?.trim() || null,
      ...(v.admin_email?.trim()
        ? {
            admin_first_name: v.admin_first_name?.trim(),
            admin_last_name: v.admin_last_name?.trim(),
            admin_email: v.admin_email.trim(),
            admin_phone: v.admin_phone?.trim() || null,
            admin_password: v.admin_password,
          }
        : {}),
    };
    create.mutate(body, {
      onSuccess: () => {
        toast.success("Company created");
        reset();
        onClose();
      },
      onError: (e) => toast.error(apiErrorMessage(e, "Could not create company")),
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit company" : "New tenant company"}
      description={
        isEdit
          ? undefined
          : "Register a travel company and, optionally, its first admin user."
      }
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={handleSubmit(submit)} loading={busy}>
            {isEdit ? "Save changes" : "Create company"}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(submit)} className="space-y-5">
        <div className="space-y-4">
          <Field label="Company name" required error={errors.name?.message}>
            <Input placeholder="ABC Transport" {...register("name")} />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Company email" error={errors.email?.message}>
              <Input type="email" placeholder="info@company.com" {...register("email")} />
            </Field>
            <Field label="Company phone" error={errors.phone?.message}>
              <Input placeholder="080..." {...register("phone")} />
            </Field>
          </div>
          {isEdit && (
            <Field
              label="Status"
              error={errors.status?.message}
              hint="Inactive companies keep their data but can't operate."
            >
              <Select {...register("status")}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Select>
            </Field>
          )}
        </div>

        {!isEdit && (
          <div className="space-y-4 border-t border-slate-100 pt-5">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Company admin</h3>
              <p className="text-xs text-slate-400">
                Optional. Leave blank to create the company only — the admin is created
                ready to sign in (no OTP needed).
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="First name" error={errors.admin_first_name?.message}>
                <Input placeholder="Okoro" {...register("admin_first_name")} />
              </Field>
              <Field label="Last name" error={errors.admin_last_name?.message}>
                <Input placeholder="Ejiofor" {...register("admin_last_name")} />
              </Field>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Admin email" error={errors.admin_email?.message}>
                <Input type="email" placeholder="admin@company.com" {...register("admin_email")} />
              </Field>
              <Field label="Admin phone" error={errors.admin_phone?.message}>
                <Input placeholder="080..." {...register("admin_phone")} />
              </Field>
            </div>
            <Field
              label="Temporary password"
              hint="At least 8 characters. Share it with the admin to sign in."
              error={errors.admin_password?.message}
            >
              <Input type="password" placeholder="••••••••" {...register("admin_password")} />
            </Field>
          </div>
        )}
      </form>
    </Modal>
  );
}

export default function TenantsPage() {
  const router = useRouter();
  const { user, hydrated } = useAuthStore();
  const allowed = isSuperAdmin(user);

  const openNewFlag = useQueryFlag("new");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [status, setStatus] = useState<"" | "active" | "inactive">("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<TenantCompany | null>(null);
  const [toDelete, setToDelete] = useState<TenantCompany | null>(null);
  const [viewing, setViewing] = useState<TenantCompany | null>(null);

  // Keep non-super-admins out even if they reach the URL directly.
  useEffect(() => {
    if (hydrated && !allowed) router.replace("/");
  }, [hydrated, allowed, router]);

  // Debounce the search box so we don't refetch on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, isError, refetch } = useTenantCompanies({
    page,
    per_page: 15,
    search: debounced || undefined,
    status: status || undefined,
  });
  const del = useDeleteTenantCompany();

  const openCreate = () => {
    setEditing(null);
    setShowForm(true);
  };
  const openEdit = (t: TenantCompany) => {
    setEditing(t);
    setShowForm(true);
  };
  const closeForm = () => {
    setShowForm(false);
    setEditing(null);
  };

  useEffect(() => {
    if (openNewFlag && allowed) openCreate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openNewFlag, allowed]);

  const items = data?.items ?? [];

  const confirmDelete = () => {
    if (!toDelete) return;
    del.mutate(toDelete.id, {
      onSuccess: () => {
        toast.success("Company deleted");
        setToDelete(null);
      },
      onError: (e) => toast.error(apiErrorMessage(e, "Could not delete company")),
    });
  };

  if (!hydrated) return <LoadingBlock />;
  if (!allowed) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tenant Companies"
        description="Manage every travel company on the platform."
        action={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> New company
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search by company name or email"
            className="pl-9"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <Select
          className="sm:w-48"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as "" | "active" | "inactive");
            setPage(1);
          }}
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </Select>
      </div>

      <Card>
        {isLoading ? (
          <LoadingBlock />
        ) : isError ? (
          <ErrorState onRetry={refetch} />
        ) : items.length === 0 ? (
          <EmptyState
            icon={Building2}
            title={debounced || status ? "No matching companies" : "No companies yet"}
            description={
              debounced || status
                ? "Try a different search or status filter."
                : "Create your first tenant company to get started."
            }
            action={
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4" /> New company
              </Button>
            }
          />
        ) : (
          <>
            <Table className="min-w-[980px]">
              <THead>
                <TR>
                  <TH>Company</TH>
                  <TH>Status</TH>
                  <TH>Locations</TH>
                  <TH>Users</TH>
                  <TH>Vehicles</TH>
                  <TH>Schedules</TH>
                  <TH>Bookings</TH>
                  <TH>Created</TH>
                  <TH className="text-right">Actions</TH>
                </TR>
              </THead>
              <TBody>
                {items.map((t) => (
                  <TR
                    key={t.id}
                    className="cursor-pointer"
                    onClick={() => setViewing(t)}
                  >
                    <TD>
                      <p className="font-medium text-slate-900">{t.name}</p>
                      {t.email ? (
                        <p className="text-sm text-slate-500">{t.email}</p>
                      ) : null}
                    </TD>
                    <TD>
                      <StatusBadge status={t.status ?? "active"} />
                    </TD>
                    <TD>
                      <StatCell icon={MapPin} value={t.locations_count} />
                    </TD>
                    <TD>
                      <StatCell icon={Users} value={t.users_count} />
                    </TD>
                    <TD>
                      <StatCell icon={Bus} value={t.vehicles_count} />
                    </TD>
                    <TD>
                      <StatCell icon={CalendarClock} value={t.schedules_count} />
                    </TD>
                    <TD>
                      <StatCell icon={Ticket} value={t.bookings_count} />
                    </TD>
                    <TD className="text-slate-500">{formatDate(t.created_at)}</TD>
                    <TD className="text-right" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setViewing(t)}
                      >
                        <Eye className="h-4 w-4 text-slate-500" /> View
                      </Button>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
            <Pagination
              page={data?.meta?.current_page ?? page}
              lastPage={data?.meta?.last_page ?? 1}
              total={data?.meta?.total}
              onChange={setPage}
            />
          </>
        )}
      </Card>

      <TenantFormModal open={showForm} onClose={closeForm} tenant={editing} />

      <TenantDetailsModal
        tenant={viewing}
        onClose={() => setViewing(null)}
        onEdit={(t) => {
          setViewing(null);
          openEdit(t);
        }}
        onDelete={(t) => {
          setViewing(null);
          setToDelete(t);
        }}
      />

      <ConfirmDialog
        open={!!toDelete}
        title="Delete company"
        description={
          toDelete
            ? `Delete ${toDelete.name}? A company with vehicles, schedules or bookings can't be deleted — deactivate it instead.`
            : ""
        }
        confirmLabel="Delete"
        danger
        loading={del.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}

function StatCell({
  icon: Icon,
  value,
}: {
  icon: typeof Users;
  value?: number;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 text-slate-700">
      <Icon className="h-3.5 w-3.5 text-slate-400" />
      {value ?? 0}
    </span>
  );
}

// Read-only details view for a tenant company. Edit and Delete live here — not
// on the table row — so they're only reachable after opening a company.
function TenantDetailsModal({
  tenant,
  onClose,
  onEdit,
  onDelete,
}: {
  tenant: TenantCompany | null;
  onClose: () => void;
  onEdit: (t: TenantCompany) => void;
  onDelete: (t: TenantCompany) => void;
}) {
  return (
    <Modal
      open={!!tenant}
      onClose={onClose}
      title={tenant?.name ?? "Company"}
      description="Transport operator details"
      footer={
        tenant ? (
          <div className="flex w-full items-center justify-between">
            <Button variant="danger" onClick={() => onDelete(tenant)}>
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
              <Button onClick={() => onEdit(tenant)}>
                <Pencil className="h-4 w-4" /> Edit
              </Button>
            </div>
          </div>
        ) : null
      }
    >
      {tenant && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <StatusBadge status={tenant.status ?? "active"} />
            <span className="inline-flex items-center gap-1.5 text-sm text-slate-500">
              <Calendar className="h-4 w-4 text-slate-400" />
              Joined {formatDate(tenant.created_at)}
            </span>
          </div>

          <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
            <DetailRow icon={Mail} label="Email" value={tenant.email} />
            <DetailRow icon={Phone} label="Phone" value={tenant.phone} />
          </dl>

          <div className="border-t border-slate-100 pt-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Operations
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              <StatTile icon={MapPin} label="Locations" value={tenant.locations_count} />
              <StatTile icon={Users} label="Users" value={tenant.users_count} />
              <StatTile icon={Bus} label="Vehicles" value={tenant.vehicles_count} />
              <StatTile icon={CalendarClock} label="Schedules" value={tenant.schedules_count} />
              <StatTile icon={Ticket} label="Bookings" value={tenant.bookings_count} />
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value?: string | null;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
      <div className="min-w-0">
        <dt className="text-xs text-slate-400">{label}</dt>
        <dd className="truncate text-sm font-medium text-slate-800">
          {value || <span className="font-normal text-slate-400">—</span>}
        </dd>
      </div>
    </div>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value?: number;
}) {
  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <Icon className="h-4 w-4 text-slate-400" />
      <p className="mt-2 text-lg font-semibold text-slate-900">{value ?? 0}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}
