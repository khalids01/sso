import { Link, Outlet } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";

export function AppShell() {
  return (
    <>
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-6 md:px-8">
        <Link to="/" className="flex items-center gap-3" aria-label="SSO Demo home">
          <span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            <ShieldCheck className="size-5" />
          </span>
          <span>
            <strong className="block text-sm tracking-tight">SSO Demo</strong>
            <span className="block text-xs text-muted-foreground">
              Powered by @skycanvasstudio/sso
            </span>
          </span>
        </Link>
        <nav className="flex gap-4 text-sm text-muted-foreground">
          <Link to="/standalone">Standalone</Link>
          <Link to="/better-auth">Better Auth</Link>
        </nav>
      </header>

      <Outlet />

      <footer className="mx-auto mt-16 max-w-6xl border-t px-5 py-8 text-xs text-muted-foreground md:px-8">
        Authentication, verified sessions, profile UI, and global logout come
        from the SSO library.
      </footer>
    </>
  );
}
