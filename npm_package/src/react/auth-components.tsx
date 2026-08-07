"use client";

import { Dialog } from "@base-ui/react/dialog";
import {
  useEffect,
  useId,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

import type { SsoAuthMethod, SsoSession } from "../index.js";
import { useSkycanvas } from "./index.js";

type SocialMethod = Extract<SsoAuthMethod, "google" | "facebook" | "linkedin" | "github">;

const socialLabels: Record<SocialMethod, string> = {
  google: "Google",
  facebook: "Facebook",
  linkedin: "LinkedIn",
  github: "GitHub",
};

export interface SsoAuthProps {
  mode?: "signin" | "signup";
  routing?: "embedded" | "hosted";
  oauthMode?: "popup" | "redirect";
  returnTo?: string;
  className?: string;
  title?: ReactNode;
  subtitle?: ReactNode;
  onSuccess?: (session: SsoSession) => void;
}

export interface SsoAuthDialogProps extends SsoAuthProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SignIn(props: Omit<SsoAuthProps, "mode">) {
  return <SsoAuth {...props} mode="signin" />;
}

export function SignUp(props: Omit<SsoAuthProps, "mode">) {
  return <SsoAuth {...props} mode="signup" />;
}

export function SsoAuth({
  mode: suppliedMode = "signin",
  routing: suppliedRouting,
  oauthMode: suppliedOauthMode,
  returnTo = "/",
  className,
  title,
  subtitle,
  onSuccess,
}: SsoAuthProps) {
  const auth = useSkycanvas();
  const routing = suppliedRouting ?? auth.interactionMode;
  const oauthMode = suppliedOauthMode ?? auth.oauthMode;
  const [mode, setMode] = useState(suppliedMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const nameId = useId();
  const emailId = useId();
  const passwordId = useId();

  useEffect(() => setMode(suppliedMode), [suppliedMode]);

  const methods = mode === "signin"
    ? auth.metadata?.sign_in_methods
    : auth.metadata?.sign_up_methods;
  const enabledMethods = methods ?? [];
  const socialMethods = enabledMethods.filter(isSocialMethod);
  const hasPassword = enabledMethods.includes("password");
  const hasMagicLink = enabledMethods.includes("magic_link");
  const canSwitch = mode === "signin"
    ? Boolean(auth.metadata?.sign_up_methods?.length)
    : Boolean(auth.metadata?.sign_in_methods?.length);
  const busy = auth.status === "loading";

  const complete = (session: SsoSession | null) => {
    if (session) onSuccess?.(session);
  };

  const submitPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    try {
      if (mode === "signin") {
        complete(await auth.signInWithPassword({ email, password, returnTo }));
        return;
      }
      const result = await auth.signUpWithPassword({ name, email, password, returnTo });
      if (result.requiresEmailVerification) {
        setMessage("Check your email to verify your account, then sign in.");
      } else {
        complete(result.session);
      }
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Authentication failed");
    }
  };

  const submitMagicLink = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    try {
      await auth.sendMagicLink({
        intent: mode,
        email,
        returnTo,
        ...(mode === "signup" ? { name } : {}),
      });
      setMessage("Check your email to continue. Keep this browser window open.");
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Could not send magic link");
    }
  };

  const openHosted = async (provider?: SocialMethod) => {
    setMessage(null);
    try {
      complete(await auth.signIn({
        returnTo,
        mode: oauthMode,
        intent: mode,
        ...(provider ? { provider } : {}),
      }));
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Authentication failed");
    }
  };

  if (!auth.metadata) {
    return (
      <section className={joinClasses("sso-auth-card", className)}>
        <AuthHeading mode={mode} title={title} subtitle={subtitle} />
        <p className="sso-auth-loading" role="status">
          {auth.error ? auth.error.message : "Loading sign-in options…"}
        </p>
      </section>
    );
  }

  if (routing === "hosted") {
    return (
      <section className={joinClasses("sso-auth-card", className)}>
        <AuthHeading mode={mode} title={title} subtitle={subtitle} />
        <button className="sso-button sso-auth-submit" type="button" disabled={busy} onClick={() => void openHosted()}>
          Continue to sign {mode === "signin" ? "in" : "up"}
        </button>
      </section>
    );
  }

  return (
    <section className={joinClasses("sso-auth-card", className)}>
      <AuthHeading mode={mode} title={title} subtitle={subtitle} />

      {socialMethods.length > 0 ? (
        <div className="sso-auth-socials">
          {socialMethods.map((provider) => (
            <button
              key={provider}
              className="sso-auth-provider"
              type="button"
              disabled={busy}
              onClick={() => void openHosted(provider)}
            >
              <ProviderMark provider={provider} />
              Continue with {socialLabels[provider]}
            </button>
          ))}
        </div>
      ) : null}

      {socialMethods.length > 0 && (hasPassword || hasMagicLink) ? <AuthDivider /> : null}

      {hasPassword ? (
        <form className="sso-auth-form" onSubmit={(event) => void submitPassword(event)}>
          {mode === "signup" ? (
            <AuthField id={nameId} label="Name" type="text" autoComplete="name" value={name} onChange={setName} />
          ) : null}
          <AuthField id={emailId} label="Email" type="email" autoComplete="email" value={email} onChange={setEmail} />
          <AuthField
            id={passwordId}
            label="Password"
            type="password"
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            value={password}
            onChange={setPassword}
            minLength={mode === "signup" ? 15 : 1}
          />
          <button className="sso-button sso-auth-submit" type="submit" disabled={busy}>
            {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>
      ) : null}

      {hasMagicLink ? (
        <form className="sso-auth-form sso-auth-magic-form" onSubmit={(event) => void submitMagicLink(event)}>
          {hasPassword ? <AuthDivider /> : null}
          {mode === "signup" && !hasPassword ? (
            <AuthField id={`${nameId}-magic`} label="Name" type="text" autoComplete="name" value={name} onChange={setName} />
          ) : null}
          {!hasPassword ? (
            <AuthField id={`${emailId}-magic`} label="Email" type="email" autoComplete="email" value={email} onChange={setEmail} />
          ) : null}
          <button className="sso-auth-provider" type="submit" disabled={busy || !email || (mode === "signup" && !name)}>
            Email me a magic link
          </button>
        </form>
      ) : null}

      {message || auth.error ? (
        <p className="sso-auth-message" role="alert">{message ?? auth.error?.message}</p>
      ) : null}

      {canSwitch ? <p className="sso-auth-switch">
        {mode === "signin" ? "Need an account?" : "Already have an account?"}{" "}
        <button type="button" onClick={() => { setMessage(null); setMode(mode === "signin" ? "signup" : "signin"); }}>
          {mode === "signin" ? "Sign up" : "Sign in"}
        </button>
      </p> : null}
    </section>
  );
}

export function SsoAuthDialog({ open, onOpenChange, ...props }: SsoAuthDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="sso-dialog-overlay" />
        <Dialog.Popup className="sso-dialog-content sso-auth-dialog">
          <Dialog.Title className="sso-visually-hidden">Authentication</Dialog.Title>
          <Dialog.Close className="sso-icon-button sso-auth-close" aria-label="Close authentication">×</Dialog.Close>
          <SsoAuth {...props} onSuccess={(session) => { props.onSuccess?.(session); onOpenChange(false); }} />
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function AuthHeading({ mode, title, subtitle }: Pick<SsoAuthProps, "title" | "subtitle"> & { mode: "signin" | "signup" }) {
  return (
    <header className="sso-auth-heading">
      <h2>{title ?? (mode === "signin" ? "Welcome back" : "Create your account")}</h2>
      <p>{subtitle ?? (mode === "signin" ? "Sign in to continue" : "Sign up to get started")}</p>
    </header>
  );
}

function AuthField(props: {
  id: string;
  label: string;
  type: string;
  autoComplete: string;
  value: string;
  onChange: (value: string) => void;
  minLength?: number;
}) {
  return (
    <label className="sso-auth-field" htmlFor={props.id}>
      <span>{props.label}</span>
      <input
        id={props.id}
        type={props.type}
        autoComplete={props.autoComplete}
        value={props.value}
        minLength={props.minLength}
        required
        onChange={(event) => props.onChange(event.currentTarget.value)}
      />
    </label>
  );
}

function AuthDivider() {
  return <div className="sso-auth-divider"><span>or continue with email</span></div>;
}

function ProviderMark({ provider }: { provider: SocialMethod }) {
  return <span className={`sso-provider-mark sso-provider-${provider}`} aria-hidden="true">{socialLabels[provider].charAt(0)}</span>;
}

function isSocialMethod(method: SsoAuthMethod): method is SocialMethod {
  return method === "google" || method === "facebook" || method === "linkedin" || method === "github";
}

function joinClasses(...classes: Array<string | undefined>) {
  return classes.filter(Boolean).join(" ");
}
