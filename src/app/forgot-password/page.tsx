"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/tour-badge";

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState("");

  return (
    <main className="court-gradient flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2 text-center">
          <Link href="/" className="mx-auto">
            <Logo className="text-2xl" />
          </Link>
          <CardTitle>Reset your password</CardTitle>
          <CardDescription>
            Enter your email and we&apos;ll send you a reset link.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="space-y-4 text-center">
              <p className="text-sm text-muted-foreground">
                If an account exists for <span className="font-medium">{email}</span>, a reset
                link is on its way.
              </p>
              <Button asChild variant="outline" className="w-full">
                <Link href="/login">Back to login</Link>
              </Button>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setSent(true);
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full">Send reset link</Button>
              <p className="text-center text-xs text-muted-foreground">
                Email delivery is stubbed in this build — wiring an email provider is a planned
                enhancement.
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
