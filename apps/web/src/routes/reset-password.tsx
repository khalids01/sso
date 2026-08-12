import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { env } from "@sso/env/public";

export const Route = createFileRoute("/reset-password")({ component: ResetPasswordPage });

function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<{ tone: "error" | "success"; text: string } | null>(null);
  const [pending, setPending] = useState(false);
  const token = typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("token");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!token) return setStatus({ tone: "error", text: "This password-reset link is invalid or has expired." });
    if (password.length < 15) return setStatus({ tone: "error", text: "Password must be at least 15 characters." });
    if (password !== confirmPassword) return setStatus({ tone: "error", text: "Passwords do not match." });
    setPending(true);
    setStatus(null);
    try {
      const response = await fetch(`${env.VITE_SERVER_URL}/api/auth/reset-password`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });
      if (!response.ok) throw new Error("This password-reset link is invalid or has expired.");
      setStatus({ tone: "success", text: "Password updated. You can now return to your application and sign in." });
      setPassword("");
      setConfirmPassword("");
    } catch (error) {
      setStatus({ tone: "error", text: error instanceof Error ? error.message : "Could not reset password." });
    } finally {
      setPending(false);
    }
  };

  return <main className="min-h-screen bg-background px-6 py-16"><section className="mx-auto w-full max-w-md rounded-xl border bg-card p-7 shadow-sm"><h1 className="text-2xl font-semibold">Reset your password</h1><p className="mt-2 text-sm text-muted-foreground">Choose a new password for your SkyCanvas SSO account.</p><form className="mt-7 grid gap-4" onSubmit={submit}><div className="grid gap-2"><Label htmlFor="new-password">New password</Label><Input id="new-password" type="password" autoComplete="new-password" minLength={15} placeholder="Create a password (15+ characters)" value={password} onChange={(event) => setPassword(event.target.value)} disabled={pending} /></div><div className="grid gap-2"><Label htmlFor="confirm-password">Confirm new password</Label><Input id="confirm-password" type="password" autoComplete="new-password" placeholder="Enter your new password again" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} disabled={pending} /></div><Button type="submit" disabled={pending || !token}>{pending ? "Updating password…" : "Update password"}</Button></form>{status ? <p className={`mt-4 rounded-md border p-3 text-sm ${status.tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-destructive/30 bg-destructive/10 text-destructive"}`} role={status.tone === "success" ? "status" : "alert"}>{status.text}</p> : null}<Link className="mt-5 inline-block text-sm text-muted-foreground underline underline-offset-4" to="/login">Back to sign in</Link></section></main>;
}
