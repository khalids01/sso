"use client";

import { Dialog } from "@base-ui/react/dialog";
import {
  useEffect,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

import type { SsoProfileAccount, SsoProfileSession, SsoUserProfile } from "../index.js";
import { useSkycanvas } from "./index.js";

export interface UserProfileProps {
  mode?: "dialog" | "content";
  label?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  additionalContent?: ReactNode;
  className?: string;
}

export function UserProfile({
  mode = "content",
  label = "Profile",
  open: controlledOpen,
  onOpenChange,
  additionalContent,
  className,
}: UserProfileProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = (next: boolean) => {
    if (controlledOpen === undefined) setInternalOpen(next);
    onOpenChange?.(next);
  };
  const content = (
    <UserProfileContent
      active={mode === "content" || open}
      {...(additionalContent !== undefined ? { additionalContent } : {})}
      {...(className !== undefined ? { className } : {})}
    />
  );

  if (mode === "content") return content;

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      {label !== null ? (
        <Dialog.Trigger className="sso-profile-trigger">{label}</Dialog.Trigger>
      ) : null}
      <Dialog.Portal>
        <Dialog.Backdrop className="sso-dialog-overlay" />
        <Dialog.Popup className="sso-dialog-content sso-profile-dialog">
          <div className="sso-dialog-heading">
            <div>
              <Dialog.Title className="sso-dialog-title">Profile</Dialog.Title>
              <Dialog.Description className="sso-dialog-description">
                Manage your SkyCanvas identity and active sessions.
              </Dialog.Description>
            </div>
            <Dialog.Close className="sso-icon-button" aria-label="Close profile">
              <CloseIcon />
            </Dialog.Close>
          </div>
          {content}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function UserProfileContent({
  active,
  additionalContent,
  className,
}: {
  active: boolean;
  additionalContent?: ReactNode;
  className?: string;
}) {
  const auth = useSkycanvas();
  const [profile, setProfile] = useState<SsoUserProfile | null>(null);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [attemptedLoad, setAttemptedLoad] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "error" | "success"; text: string } | null>(null);

  const load = async () => {
    setAttemptedLoad(true);
    setLoading(true);
    setMessage(null);
    try {
      const next = await auth.getUserProfile();
      setProfile(next);
      setName(next.user.name);
    } catch (cause) {
      setMessage({
        tone: "error",
        text: cause instanceof Error ? cause.message : "Could not load profile",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (active && !attemptedLoad) void load();
  }, [active, attemptedLoad]);

  const action = async (
    key: string,
    input: Parameters<typeof auth.updateUserProfile>[0],
    success: string,
  ) => {
    setPending(key);
    setMessage(null);
    try {
      const next = await auth.updateUserProfile(input);
      setProfile(next);
      setName(next.user.name);
      setMessage({ tone: "success", text: success });
    } catch (cause) {
      setMessage({
        tone: "error",
        text: cause instanceof Error ? cause.message : "Profile update failed",
      });
    } finally {
      setPending(null);
    }
  };

  const saveName = (event: FormEvent) => {
    event.preventDefault();
    const value = name.trim();
    if (value.length < 2 || value === profile?.user.name) return;
    void action("name", { action: "update_name", name: value }, "Name updated.");
  };

  const resetPassword = async () => {
    if (!profile) return;
    setPending("password");
    setMessage(null);
    try {
      await auth.requestPasswordReset({ email: profile.user.email });
      setMessage({
        tone: "success",
        text: "If this account has a password, a secure reset link has been sent.",
      });
    } catch (cause) {
      setMessage({
        tone: "error",
        text: cause instanceof Error ? cause.message : "Could not send the reset link",
      });
    } finally {
      setPending(null);
    }
  };

  if (!profile && (loading || !attemptedLoad)) {
    return <div className="sso-profile-loading"><SpinnerIcon /> Loading profile…</div>;
  }
  if (!profile) {
    return (
      <div className={joinClasses("sso-profile", className)}>
        {message ? <StatusMessage value={message} /> : null}
        <button className="sso-auth-provider" type="button" onClick={() => void load()}>
          Try again
        </button>
      </div>
    );
  }

  const socialAccounts = profile.accounts.filter((account) => account.provider !== "password");
  const otherSessions = profile.sessions.filter((session) => !session.isCurrent);

  return (
    <div className={joinClasses("sso-profile", className)} aria-busy={pending !== null}>
      <section className="sso-profile-section">
        <div className="sso-profile-summary">
          <Avatar user={profile.user} />
          <div><strong>{profile.user.name}</strong><span>{profile.user.email}</span></div>
        </div>
        <form className="sso-profile-form" onSubmit={saveName}>
          <label htmlFor="sso-profile-name">Name</label>
          <div className="sso-profile-inline">
            <input
              id="sso-profile-name"
              className="sso-auth-input"
              value={name}
              minLength={2}
              maxLength={120}
              disabled={pending !== null}
              onChange={(event) => setName(event.target.value)}
            />
            <button className="sso-button" type="submit" disabled={pending !== null || name.trim() === profile.user.name}>
              {pending === "name" ? <SpinnerIcon /> : null} Save
            </button>
          </div>
        </form>
        <div className="sso-profile-email">
          <div><span>Email</span><strong>{profile.user.email}</strong></div>
          <span className={profile.user.emailVerified ? "sso-profile-badge" : "sso-profile-badge sso-profile-badge-warning"}>
            {profile.user.emailVerified ? "Verified" : "Not verified"}
          </span>
        </div>
        {!profile.capabilities.email ? (
          <div className="sso-profile-warning" role="status">
            Email features are unavailable. Connect a mail provider to this application to enable verification and password recovery.
          </div>
        ) : !profile.user.emailVerified ? (
          <button
            className="sso-auth-provider"
            type="button"
            disabled={pending !== null}
            onClick={() => void action("verification", { action: "resend_verification" }, "Verification email sent.")}
          >
            {pending === "verification" ? <SpinnerIcon /> : null} Resend verification email
          </button>
        ) : null}
      </section>

      {profile.capabilities.password ? (
        <section className="sso-profile-section">
          <div className="sso-profile-section-heading"><div><h3>Password</h3><p>Use a secure email link to {profile.capabilities.passwordSet ? "reset" : "set"} your password.</p></div></div>
          <button className="sso-auth-provider" type="button" disabled={!profile.capabilities.email || pending !== null} onClick={() => void resetPassword()}>
            {pending === "password" ? <SpinnerIcon /> : null} {profile.capabilities.passwordSet ? "Reset password" : "Set password"}
          </button>
        </section>
      ) : null}

      <section className="sso-profile-section">
        <div className="sso-profile-section-heading"><div><h3>Connected accounts</h3><p>Social accounts currently connected to your identity.</p></div></div>
        {socialAccounts.length ? (
          <div className="sso-profile-list">
            {socialAccounts.map((account) => (
              <AccountRow
                key={account.id}
                account={account}
                disabled={pending !== null}
                pending={pending === `account:${account.id}`}
                onDisconnect={() => void action(`account:${account.id}`, { action: "unlink_account", accountId: account.id }, `${providerLabel(account.provider)} disconnected.`)}
              />
            ))}
          </div>
        ) : <p className="sso-profile-empty">No social accounts are connected.</p>}
      </section>

      <section className="sso-profile-section">
        <div className="sso-profile-section-heading">
          <div><h3>Active sessions</h3><p>Review where your SkyCanvas identity is signed in.</p></div>
          {otherSessions.length ? (
            <button className="sso-auth-text-button" type="button" disabled={pending !== null} onClick={() => void action("sessions", { action: "revoke_other_sessions" }, "Other sessions signed out.")}>Sign out others</button>
          ) : null}
        </div>
        <div className="sso-profile-list">
          {profile.sessions.map((session) => (
            <SessionRow
              key={session.id}
              session={session}
              disabled={pending !== null}
              pending={pending === `session:${session.id}`}
              onRevoke={() => void action(`session:${session.id}`, { action: "revoke_session", sessionId: session.id }, "Session signed out.")}
            />
          ))}
        </div>
      </section>

      {additionalContent ? <section className="sso-profile-section">{additionalContent}</section> : null}
      {message ? <StatusMessage value={message} /> : null}
    </div>
  );
}

function AccountRow({ account, disabled, pending, onDisconnect }: { account: SsoProfileAccount; disabled: boolean; pending: boolean; onDisconnect: () => void }) {
  return <div className="sso-profile-row"><div><strong>{providerLabel(account.provider)}</strong><span>Connected {formatDate(account.createdAt)}</span></div><button className="sso-auth-text-button" type="button" disabled={disabled} onClick={onDisconnect}>{pending ? "Disconnecting…" : "Disconnect"}</button></div>;
}

function SessionRow({ session, disabled, pending, onRevoke }: { session: SsoProfileSession; disabled: boolean; pending: boolean; onRevoke: () => void }) {
  return <div className="sso-profile-row"><div><strong>{sessionLabel(session.userAgent)}{session.isCurrent ? " · This device" : ""}</strong><span>{session.ipAddress ?? "Unknown IP"} · Active {formatDate(session.updatedAt)}</span></div>{session.isCurrent ? <span className="sso-profile-badge">Current</span> : <button className="sso-auth-text-button" type="button" disabled={disabled} onClick={onRevoke}>{pending ? "Signing out…" : "Sign out"}</button>}</div>;
}

function Avatar({ user }: { user: SsoUserProfile["user"] }) {
  const initial = user.name.trim().charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase();
  return <span className="sso-avatar sso-avatar-large" aria-hidden="true">{user.image ? <img src={user.image} alt="" referrerPolicy="no-referrer" /> : initial}</span>;
}

function StatusMessage({ value }: { value: { tone: "error" | "success"; text: string } }) {
  return <p className={`sso-auth-message ${value.tone === "success" ? "sso-auth-message-success" : ""}`} role={value.tone === "success" ? "status" : "alert"}>{value.text}</p>;
}

function providerLabel(provider: SsoProfileAccount["provider"]) {
  return provider === "github" ? "GitHub" : provider.charAt(0).toUpperCase() + provider.slice(1);
}

function sessionLabel(userAgent: string | null) {
  if (!userAgent) return "Unknown browser";
  const browser = /Firefox/i.test(userAgent) ? "Firefox" : /Edg/i.test(userAgent) ? "Edge" : /Chrome/i.test(userAgent) ? "Chrome" : /Safari/i.test(userAgent) ? "Safari" : "Browser";
  const os = /Windows/i.test(userAgent) ? "Windows" : /Mac OS|Macintosh/i.test(userAgent) ? "macOS" : /Android/i.test(userAgent) ? "Android" : /iPhone|iPad/i.test(userAgent) ? "iOS" : /Linux/i.test(userAgent) ? "Linux" : "Unknown device";
  return `${browser} on ${os}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function joinClasses(...values: Array<string | undefined>) { return values.filter(Boolean).join(" "); }
function SpinnerIcon() { return <svg className="sso-spin" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12a9 9 0 1 1-6.22-8.56" /></svg>; }
function CloseIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>; }
