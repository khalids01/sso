"use client";

import { Dialog } from "@base-ui/react/dialog";
import {
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useForm, type UseFormRegisterReturn } from "react-hook-form";

import type { SsoAuthMethod, SsoSession } from "../index.js";
import { useSkycanvas } from "./index.js";

type SocialMethod = Extract<SsoAuthMethod, "google" | "facebook" | "linkedin" | "github">;

type AuthFormValues = {
  name: string;
  email: string;
  password: string;
};

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
  const [message, setMessage] = useState<string | null>(null);
  const passwordForm = useForm<AuthFormValues>({
    defaultValues: { name: "", email: "", password: "" },
  });
  const magicLinkForm = useForm<AuthFormValues>({
    defaultValues: { name: "", email: "", password: "" },
  });
  const magicLinkName = magicLinkForm.watch("name");
  const magicLinkEmail = magicLinkForm.watch("email");

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

  const submitPassword = async (values: AuthFormValues) => {
    setMessage(null);
    try {
      if (mode === "signin") {
        complete(await auth.signInWithPassword({ email: values.email, password: values.password, returnTo }));
        return;
      }
      const result = await auth.signUpWithPassword({
        name: values.name,
        email: values.email,
        password: values.password,
        returnTo,
      });
      if (result.requiresEmailVerification) {
        setMessage("Check your email to verify your account, then sign in.");
      } else {
        complete(result.session);
      }
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Authentication failed");
    }
  };

  const submitMagicLink = async (values: AuthFormValues) => {
    setMessage(null);
    try {
      await auth.sendMagicLink({
        intent: mode,
        email: values.email,
        returnTo,
        ...(mode === "signup" ? { name: values.name } : {}),
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
        <form className="sso-auth-form" onSubmit={passwordForm.handleSubmit(submitPassword)}>
          {mode === "signup" ? (
            <AuthField
              id="sso-password-name"
              label="Name"
              type="text"
              autoComplete="name"
              registration={passwordForm.register("name", { required: "Name is required" })}
              error={passwordForm.formState.errors.name?.message}
            />
          ) : null}
          <AuthField
            id="sso-password-email"
            label="Email"
            type="email"
            autoComplete="email"
            registration={passwordForm.register("email", {
              required: "Email is required",
              pattern: { value: /^\S+@\S+$/i, message: "Enter a valid email" },
            })}
            error={passwordForm.formState.errors.email?.message}
          />
          <AuthField
            id="sso-password-password"
            label="Password"
            type="password"
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            minLength={mode === "signup" ? 15 : 1}
            registration={passwordForm.register("password", {
              required: "Password is required",
              ...(mode === "signup"
                ? { minLength: { value: 15, message: "Password must be at least 15 characters" } }
                : {}),
            })}
            error={passwordForm.formState.errors.password?.message}
          />
          <button className="sso-button sso-auth-submit" type="submit" disabled={busy || passwordForm.formState.isSubmitting}>
            {busy || passwordForm.formState.isSubmitting ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>
      ) : null}

      {hasMagicLink ? (
        <form className="sso-auth-form sso-auth-magic-form" onSubmit={magicLinkForm.handleSubmit(submitMagicLink)}>
          {hasPassword ? <AuthDivider /> : null}
          {mode === "signup" ? (
            <AuthField
              id="sso-magic-name"
              label="Name"
              type="text"
              autoComplete="name"
              registration={magicLinkForm.register("name", { required: "Name is required" })}
              error={magicLinkForm.formState.errors.name?.message}
            />
          ) : null}
          <AuthField
            id="sso-magic-email"
            label="Email"
            type="email"
            autoComplete="email"
            registration={magicLinkForm.register("email", {
              required: "Email is required",
              pattern: { value: /^\S+@\S+$/i, message: "Enter a valid email" },
            })}
            error={magicLinkForm.formState.errors.email?.message}
          />
          <button
            className="sso-auth-provider"
            type="submit"
            disabled={busy || magicLinkForm.formState.isSubmitting || !magicLinkEmail || (mode === "signup" && !magicLinkName)}
          >
            {busy || magicLinkForm.formState.isSubmitting ? "Please wait…" : "Email me a magic link"}
          </button>
        </form>
      ) : null}

      {message || auth.error ? (
        <p className="sso-auth-message" role="alert">{message ?? auth.error?.message}</p>
      ) : null}

      {canSwitch ? <p className="sso-auth-switch">
        {mode === "signin" ? "Need an account?" : "Already have an account?"}{" "}
        <button type="button" onClick={() => {
          setMessage(null);
          passwordForm.clearErrors();
          magicLinkForm.clearErrors();
          setMode(mode === "signin" ? "signup" : "signin");
        }}>
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
  registration: UseFormRegisterReturn;
  error: string | undefined;
  minLength?: number | undefined;
}) {
  return (
    <label className="sso-auth-field" htmlFor={props.id}>
      <span>{props.label}</span>
      <input
        {...props.registration}
        id={props.id}
        type={props.type}
        autoComplete={props.autoComplete}
        minLength={props.minLength}
        aria-invalid={props.error ? "true" : "false"}
      />
      {props.error ? <span className="sso-auth-field-error" role="alert">{props.error}</span> : null}
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
