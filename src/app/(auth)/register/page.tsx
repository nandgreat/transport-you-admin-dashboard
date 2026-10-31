"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRegisterCompany } from "@/hooks/useAuth";
import { useAuthStore } from "@/store/auth";
import { apiErrorMessage } from "@/lib/axios";
import { AuthShell } from "@/components/layout/auth-shell";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";

const schema = z
  .object({
    company_name: z.string().min(1, "Company name is required"),
    company_email: z
      .string()
      .email("Enter a valid email")
      .optional()
      .or(z.literal("")),
    company_phone: z.string().optional().or(z.literal("")),
    first_name: z.string().min(1, "First name is required"),
    last_name: z.string().min(1, "Last name is required"),
    email: z.string().min(1, "Email is required").email("Enter a valid email"),
    phone: z.string().optional().or(z.literal("")),
    password: z.string().min(8, "Use at least 8 characters"),
    password_confirmation: z.string().min(1, "Confirm your password"),
  })
  .refine((v) => v.password === v.password_confirmation, {
    path: ["password_confirmation"],
    message: "Passwords do not match",
  });

type FormValues = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const registerCompany = useRegisterCompany();
  const { token, hydrated } = useAuthStore();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      company_name: "",
      company_email: "",
      company_phone: "",
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      password: "",
      password_confirmation: "",
    },
  });

  // Already signed in → bounce to the dashboard.
  useEffect(() => {
    if (hydrated && token) router.replace("/");
  }, [hydrated, token, router]);

  const onSubmit = (values: FormValues) => {
    // Drop empty optionals so the API's nullable rules don't reject "".
    const payload = {
      company_name: values.company_name,
      first_name: values.first_name,
      last_name: values.last_name,
      email: values.email,
      password: values.password,
      password_confirmation: values.password_confirmation,
      ...(values.company_email ? { company_email: values.company_email } : {}),
      ...(values.company_phone ? { company_phone: values.company_phone } : {}),
      ...(values.phone ? { phone: values.phone } : {}),
    };

    registerCompany.mutate(payload, {
      onSuccess: () =>
        router.push(`/verify-otp?email=${encodeURIComponent(values.email)}`),
    });
  };

  return (
    <AuthShell
      wide
      title="Register your travel company"
      subtitle="Create an account to start managing your fleet and bookings."
      footer={
        <p className="mt-6 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-brand-600 hover:text-brand-700">
            Sign in
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-6">
        {registerCompany.isError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {apiErrorMessage(registerCompany.error, "Could not complete registration.")}
          </div>
        )}

        {/* Company */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-900">Company details</h3>

          <Field label="Company name" required error={errors.company_name?.message}>
            <Input
              placeholder="ABC Transport"
              aria-invalid={!!errors.company_name}
              {...register("company_name")}
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Company email" error={errors.company_email?.message}>
              <Input
                type="email"
                placeholder="info@company.com"
                aria-invalid={!!errors.company_email}
                {...register("company_email")}
              />
            </Field>
            <Field label="Company phone" error={errors.company_phone?.message}>
              <Input
                placeholder="080..."
                aria-invalid={!!errors.company_phone}
                {...register("company_phone")}
              />
            </Field>
          </div>
        </div>

        {/* Admin account */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-900">Admin account</h3>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="First name" required error={errors.first_name?.message}>
              <Input
                placeholder="Okoro"
                aria-invalid={!!errors.first_name}
                {...register("first_name")}
              />
            </Field>
            <Field label="Last name" required error={errors.last_name?.message}>
              <Input
                placeholder="Ejiofor"
                aria-invalid={!!errors.last_name}
                {...register("last_name")}
              />
            </Field>
          </div>

          <Field label="Email address" required error={errors.email?.message}>
            <Input
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              aria-invalid={!!errors.email}
              {...register("email")}
            />
          </Field>

          <Field label="Phone" error={errors.phone?.message}>
            <Input
              placeholder="080..."
              aria-invalid={!!errors.phone}
              {...register("phone")}
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label="Password"
              required
              hint="At least 8 characters"
              error={errors.password?.message}
            >
              <Input
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                aria-invalid={!!errors.password}
                {...register("password")}
              />
            </Field>
            <Field
              label="Confirm password"
              required
              error={errors.password_confirmation?.message}
            >
              <Input
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                aria-invalid={!!errors.password_confirmation}
                {...register("password_confirmation")}
              />
            </Field>
          </div>
        </div>

        <Button
          type="submit"
          size="lg"
          className="w-full"
          loading={registerCompany.isPending}
        >
          Create account
        </Button>
      </form>
    </AuthShell>
  );
}
