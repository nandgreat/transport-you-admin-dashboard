"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail, Lock } from "lucide-react";
import { useLogin } from "@/hooks/useAuth";
import { useAuthStore } from "@/store/auth";
import { apiErrorMessage } from "@/lib/axios";
import { AuthShell } from "@/components/layout/auth-shell";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";

const schema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const login = useLogin();
  const { token, hydrated } = useAuthStore();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  // Already signed in → bounce to the dashboard.
  useEffect(() => {
    if (hydrated && token) router.replace("/");
  }, [hydrated, token, router]);

  const onSubmit = (values: FormValues) => login.mutate(values);

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to your admin account to continue."
      footer={
        <>
          <p className="mt-6 text-center text-sm text-slate-500">
            New to Transport You?{" "}
            <Link
              href="/register"
              className="font-medium text-brand-600 hover:text-brand-700"
            >
              Register your travel company
            </Link>
          </p>
          <p className="mt-2 text-center text-xs text-slate-400">
            Trouble signing in? Contact your platform administrator.
          </p>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
        {login.isError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {apiErrorMessage(login.error, "Invalid credentials. Please try again.")}
          </div>
        )}

        <Field label="Email address" required error={errors.email?.message}>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              className="pl-9"
              aria-invalid={!!errors.email}
              {...register("email")}
            />
          </div>
        </Field>

        <Field label="Password" required error={errors.password?.message}>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              className="pl-9"
              aria-invalid={!!errors.password}
              {...register("password")}
            />
          </div>
        </Field>

        <Button type="submit" size="lg" className="w-full" loading={login.isPending}>
          Sign in
        </Button>
      </form>
    </AuthShell>
  );
}
