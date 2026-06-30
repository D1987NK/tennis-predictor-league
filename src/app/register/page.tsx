"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/tour-badge";
import { useToast } from "@/components/ui/toast";

type Fields = "firstName" | "lastName" | "username" | "email" | "password" | "confirmPassword";

export default function RegisterPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<Record<Fields, string>>({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<Partial<Record<Fields, string[]>>>({});

  function update(field: Fields, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setLoading(true);
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      if (data.issues) setErrors(data.issues);
      toast({ variant: "error", title: "Registration failed", description: data.error });
      return;
    }

    toast({ variant: "success", title: "Account created!", description: "Logging you in…" });
    await signIn("credentials", {
      username: form.username,
      password: form.password,
      redirect: false,
    });
    router.push("/dashboard");
    router.refresh();
  }

  const fieldDef: { id: Fields; label: string; type?: string; half?: boolean }[] = [
    { id: "firstName", label: "First name", half: true },
    { id: "lastName", label: "Last name", half: true },
    { id: "username", label: "Username" },
    { id: "email", label: "Email", type: "email" },
    { id: "password", label: "Password", type: "password" },
    { id: "confirmPassword", label: "Confirm password", type: "password" },
  ];

  return (
    <main className="court-gradient flex min-h-screen items-center justify-center p-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2 text-center">
          <Link href="/" className="mx-auto">
            <Logo className="text-2xl" />
          </Link>
          <CardTitle>Create your account</CardTitle>
          <CardDescription>Join the league and start predicting</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {fieldDef
                .filter((f) => f.half)
                .map((f) => (
                  <div key={f.id} className="space-y-2">
                    <Label htmlFor={f.id}>{f.label}</Label>
                    <Input
                      id={f.id}
                      value={form[f.id]}
                      onChange={(e) => update(f.id, e.target.value)}
                      required
                    />
                    {errors[f.id] && (
                      <p className="text-xs text-destructive">{errors[f.id]![0]}</p>
                    )}
                  </div>
                ))}
            </div>
            {fieldDef
              .filter((f) => !f.half)
              .map((f) => (
                <div key={f.id} className="space-y-2">
                  <Label htmlFor={f.id}>{f.label}</Label>
                  <Input
                    id={f.id}
                    type={f.type}
                    value={form[f.id]}
                    onChange={(e) => update(f.id, e.target.value)}
                    required
                  />
                  {errors[f.id] && (
                    <p className="text-xs text-destructive">{errors[f.id]![0]}</p>
                  )}
                </div>
              ))}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating account…" : "Register"}
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:underline">
              Login
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
