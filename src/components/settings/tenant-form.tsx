"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useUpdateTenant, useUploadImage } from "@/hooks/resources";
import { useAuthStore } from "@/store/auth";
import { apiErrorMessage } from "@/lib/axios";
import { assetUrl } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { Input, Field } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ImageUpload } from "@/components/ui/image-upload";
import { EmptyState } from "@/components/ui/states";
import { toast } from "@/components/ui/toaster";
import { Building2 } from "lucide-react";

const schema = z.object({
  name: z.string().min(1, "Business name is required"),
  email: z.string().email("Enter a valid email").optional().or(z.literal("")),
  phone: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function TenantSettingsForm() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const tenant = user?.tenant ?? null;

  const update = useUpdateTenant();
  const upload = useUploadImage();
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: {
      name: tenant?.name ?? "",
      email: tenant?.email ?? "",
      phone: tenant?.phone ?? "",
    },
  });

  if (!tenant) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-slate-400" /> Business details
          </CardTitle>
        </CardHeader>
        <EmptyState
          icon={Building2}
          title="No tenant linked"
          description="Your account isn't associated with a tenant, so there's nothing to edit here."
        />
      </Card>
    );
  }

  const busy = update.isPending || upload.isPending;
  const canSave = isDirty || !!logoFile;

  const submit = async (v: FormValues) => {
    try {
      // 1. Upload the new logo first (server writes it to tenant.logo_url).
      if (logoFile) {
        await upload.mutateAsync({ file: logoFile, type: "tenants", modelId: tenant.id });
      }

      // 2. Update the tenant's text fields; the response is the fresh tenant
      //    (including the just-uploaded logo_url).
      const updated = await update.mutateAsync({
        name: v.name,
        email: v.email || null,
        phone: v.phone || null,
      });

      // 3. Reflect the change in the cached session immediately.
      if (user) setUser({ ...user, tenant: updated });
      setLogoFile(null);
      toast.success("Business details updated");
    } catch (e) {
      toast.error(apiErrorMessage(e, "Could not update your details"));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-slate-400" /> Business details
        </CardTitle>
      </CardHeader>
      <CardBody>
        <form onSubmit={handleSubmit(submit)} className="space-y-5">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-[200px_1fr]">
            <Field label="Logo">
              <ImageUpload
                existingUrl={assetUrl(tenant.logo_url)}
                file={logoFile}
                onSelect={setLogoFile}
                uploading={upload.isPending}
              />
            </Field>

            <div className="space-y-4">
              <Field label="Business name" required error={errors.name?.message}>
                <Input placeholder="ABC Transport Limited" {...register("name")} />
              </Field>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Email" error={errors.email?.message}>
                  <Input type="email" placeholder="business@example.com" {...register("email")} />
                </Field>
                <Field label="Phone" error={errors.phone?.message}>
                  <Input placeholder="0902 384 9288" {...register("phone")} />
                </Field>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
            <Button type="submit" loading={busy} disabled={!canSave}>
              Save changes
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
