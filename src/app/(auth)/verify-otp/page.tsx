"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useResendOtp, useVerifyOtp } from "@/hooks/useAuth";
import { apiErrorMessage } from "@/lib/axios";
import { AuthShell } from "@/components/layout/auth-shell";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";

const schema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
  otp: z.string().length(6, "Enter the 6-digit code"),
});

type FormValues = z.infer<typeof schema>;

const RESEND_SECONDS = 30;

function VerifyOtpForm() {
  const params = useSearchParams();
  const emailParam = params.get("email") ?? "";

  const verify = useVerifyOtp();
  const resend = useResendOtp();
  const [cooldown, setCooldown] = useState(0);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: emailParam, otp: "" },
  });

  // Count the resend cooldown down to zero, one second at a time.
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const onSubmit = (values: FormValues) => verify.mutate(values);

  const onResend = () => {
    const email = getValues("email");
    if (!email || cooldown > 0) return;
    resend.mutate(email, { onSuccess: () => setCooldown(RESEND_SECONDS) });
  };

  return (
    <AuthShell
      title="Verify your email"
      subtitle={
        emailParam
          ? `We sent a 6-digit code to ${emailParam}.`
          : "Enter the 6-digit code we sent to your admin email."
      }
      footer={
        <p className="mt-6 text-center text-sm text-slate-500">
          Entered the wrong details?{" "}
          <Link href="/register" className="font-medium text-brand-600 hover:text-brand-700">
            Start over
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
        {verify.isError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {apiErrorMessage(verify.error, "That code didn't work. Please try again.")}
          </div>
        )}
        {resend.isSuccess && cooldown > 0 && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            A new code has been sent to your email.
          </div>
        )}

        {/* Email is prefilled from registration; editable as a fallback. */}
        <Field label="Email address" required error={errors.email?.message}>
          <Input
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            aria-invalid={!!errors.email}
            {...register("email")}
          />
        </Field>

        <Field label="Verification code" required error={errors.otp?.message}>
          <Input
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="000000"
            className="text-center text-lg tracking-[0.5em]"
            aria-invalid={!!errors.otp}
            {...register("otp")}
          />
        </Field>

        <Button type="submit" size="lg" className="w-full" loading={verify.isPending}>
          Verify &amp; continue
        </Button>

        <div className="text-center text-sm text-slate-500">
          Didn&apos;t get a code?{" "}
          <button
            type="button"
            onClick={onResend}
            disabled={cooldown > 0 || resend.isPending}
            className="font-medium text-brand-600 hover:text-brand-700 disabled:cursor-not-allowed disabled:text-slate-400"
          >
            {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
          </button>
        </div>
      </form>
    </AuthShell>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={null}>
      <VerifyOtpForm />
    </Suspense>
  );
}
