import { Menu } from "@base-ui/react/menu";
import { Fragment, useState, type ButtonHTMLAttributes, type ReactNode } from "react";

import { completeAuthInteraction } from "./auth-completion.js";
import { useOptionalSso } from "./index.js";
import { UserProfile } from "./user-profile.js";

type AsyncAction = () => unknown | Promise<unknown>;

export interface SsoSignInButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> {
  callbackURL?: string;
  onSignIn?: AsyncAction;
  loadingLabel?: string;
  onAuthError?: (error: Error) => void;
}

export interface SsoMenuItem {
  label: string;
  href?: string;
  icon?: ReactNode;
  onSelect?: AsyncAction;
  disabled?: boolean;
}

export interface SsoDisplayUser {
  name: string;
  email: string;
  emailVerified?: boolean;
  image?: string | null;
}

export interface SsoUserMenuProps {
  user?: SsoDisplayUser | null;
  items?: readonly SsoMenuItem[];
  onLogout?: AsyncAction;
  logoutReturnTo?: string;
  className?: string;
  align?: "start" | "center" | "end";
  profileLabel?: string;
  logoutLabel?: string;
}

export function SsoSignInButton({
  callbackURL = "/",
  onSignIn,
  loadingLabel = "Signing in…",
  onAuthError,
  children = "Sign in",
  className,
  disabled,
  ...buttonProps
}: SsoSignInButtonProps) {
  const sso = useOptionalSso();
  const [loading, setLoading] = useState(false);

  const signIn = async () => {
    setLoading(true);
    try {
      if (onSignIn) {
        await onSignIn();
      } else if (sso) {
        completeAuthInteraction(
          await sso.signIn({ returnTo: callbackURL }),
          callbackURL,
        );
      } else {
        throw new Error("SsoSignInButton requires SkyCanvasProvider or onSignIn");
      }
    } catch (cause) {
      onAuthError?.(cause instanceof Error ? cause : new Error("SSO sign-in failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      className={joinClasses("sso-button sso-sign-in-button", className)}
      disabled={disabled || loading}
      aria-busy={loading}
      onClick={() => void signIn()}
      {...buttonProps}
    >
      {loading ? <SpinnerIcon /> : null}
      <span>{loading ? loadingLabel : children}</span>
    </button>
  );
}

export function SsoUserMenu({
  user: suppliedUser,
  items = [],
  onLogout,
  logoutReturnTo = "/",
  className,
  align = "end",
  profileLabel = "Profile",
  logoutLabel = "Signout",
}: SsoUserMenuProps) {
  const sso = useOptionalSso();
  const user = suppliedUser === undefined ? sso?.session?.user : suppliedUser;
  const [profileOpen, setProfileOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!user) return null;

  const run = async (action: AsyncAction | undefined) => {
    if (!action) return;
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
    }
  };

  const logout = onLogout ?? (() => sso?.logout({
    returnTo: logoutReturnTo,
  }));
  return (
    <Fragment>
      <Menu.Root>
        <Menu.Trigger
          render={
          <button
            type="button"
            className={joinClasses("sso-user-trigger", className)}
            aria-label="Open account menu"
          />
          }
        >
          <Avatar user={user} />
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner className="sso-menu-positioner" align={align} sideOffset={8}>
          <Menu.Popup className="sso-menu-content">
            <div className="sso-menu-header">
              <Avatar user={user} />
              <div className="sso-menu-identity">
                <strong>{user.name}</strong>
                <span>{user.email}</span>
              </div>
            </div>
            <Menu.Separator className="sso-menu-separator" />
            <Menu.Item className="sso-menu-item" onClick={() => setProfileOpen(true)}>
              <ProfileIcon />
              {profileLabel}
            </Menu.Item>
            {items.map((item, index) => (
              <Fragment key={`${item.label}-${index}`}>
                {item.href ? (
                  <Menu.Item
                    className="sso-menu-item"
                    disabled={item.disabled ?? false}
                    render={<a href={item.href} />}
                  >
                      {item.icon}
                      {item.label}
                  </Menu.Item>
                ) : (
                  <Menu.Item
                    className="sso-menu-item"
                    disabled={item.disabled || busy}
                    onClick={() => void run(item.onSelect)}
                  >
                    {item.icon}
                    {item.label}
                  </Menu.Item>
                )}
              </Fragment>
            ))}
            <Menu.Separator className="sso-menu-separator" />
            <Menu.Item
              className="sso-menu-item sso-menu-item-danger"
              disabled={busy}
              onClick={() => void run(logout)}
            >
              {busy ? <SpinnerIcon /> : <LogoutIcon />}
              {logoutLabel}
            </Menu.Item>
          </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
      {sso ? (
        <UserProfile
          mode="dialog"
          label={null}
          open={profileOpen}
          onOpenChange={setProfileOpen}
        />
      ) : null}
    </Fragment>
  );
}

function Avatar({ user, large = false }: { user: SsoDisplayUser; large?: boolean }) {
  const initial = user.name.trim().charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase();
  return (
    <span className={large ? "sso-avatar sso-avatar-large" : "sso-avatar"} aria-hidden="true">
      {user.image ? <img src={user.image} alt="" referrerPolicy="no-referrer" /> : initial}
    </span>
  );
}

function joinClasses(...values: Array<string | undefined>) {
  return values.filter(Boolean).join(" ");
}

function SpinnerIcon() {
  return <svg className="sso-spin" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12a9 9 0 1 1-6.22-8.56" /></svg>;
}

function ProfileIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>;
}

function LogoutIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 17l5-5-5-5M15 12H3M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /></svg>;
}
