"use client";

import { Dialog } from "@base-ui/react/dialog";
import { useEffect, useState, type ReactNode } from "react";
import { useForm, type UseFormRegisterReturn } from "react-hook-form";

import type { SsoAuthMethod, SsoSession } from "../index.js";
import { completeAuthInteraction } from "./auth-completion.js";
import { useSkycanvas } from "./index.js";

type SocialMethod = Extract<
  SsoAuthMethod,
  "google" | "facebook" | "linkedin" | "github"
>;

type AuthFormValues = {
  name: string;
  email: string;
  password: string;
};

type PendingMethod = "password" | "magic_link" | SocialMethod | null;
type AuthMessage = { tone: "error" | "success"; text: string } | null;

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
  const [message, setMessage] = useState<AuthMessage>(null);
  const [pendingMethod, setPendingMethod] = useState<PendingMethod>(null);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const passwordForm = useForm<AuthFormValues>({
    defaultValues: { name: "", email: "", password: "" },
  });
  const magicLinkForm = useForm<AuthFormValues>({
    defaultValues: { name: "", email: "", password: "" },
  });
  const magicLinkName = magicLinkForm.watch("name");
  const magicLinkEmail = magicLinkForm.watch("email");
  const resetForm = useForm<Pick<AuthFormValues, "email">>({
    defaultValues: { email: "" },
  });

  useEffect(() => setMode(suppliedMode), [suppliedMode]);

  const methods =
    mode === "signin"
      ? auth.metadata?.sign_in_methods
      : auth.metadata?.sign_up_methods;
  const enabledMethods = methods ?? [];
  const socialMethods = enabledMethods.filter(isSocialMethod);
  const hasPassword = enabledMethods.includes("password");
  const hasMagicLink = enabledMethods.includes("magic_link");
  const canSwitch =
    mode === "signin"
      ? Boolean(auth.metadata?.sign_up_methods?.length)
      : Boolean(auth.metadata?.sign_in_methods?.length);
  const busy = pendingMethod !== null;

  const complete = (session: SsoSession | null) => {
    completeAuthInteraction(session, returnTo, onSuccess);
  };

  const submitPassword = async (values: AuthFormValues) => {
    setMessage(null);
    setPendingMethod("password");
    try {
      if (mode === "signin") {
        complete(
          await auth.signInWithPassword({
            email: values.email,
            password: values.password,
            returnTo,
          }),
        );
        return;
      }
      const result = await auth.signUpWithPassword({
        name: values.name,
        email: values.email,
        password: values.password,
        returnTo,
      });
      if (result.requiresEmailVerification) {
        setMessage({
          tone: "success",
          text: "Check your inbox to verify your email, then sign in.",
        });
      } else {
        complete(result.session);
      }
    } catch (cause) {
      setMessage({
        tone: "error",
        text: cause instanceof Error ? cause.message : "Authentication failed",
      });
    } finally {
      setPendingMethod(null);
    }
  };

  const submitMagicLink = async (values: AuthFormValues) => {
    setMessage(null);
    setPendingMethod("magic_link");
    try {
      await auth.sendMagicLink({
        intent: mode,
        email: values.email,
        returnTo,
        ...(mode === "signup" ? { name: values.name } : {}),
      });
      setMessage({
        tone: "success",
        text: "Check your inbox for your secure sign-in link. Keep this window open.",
      });
    } catch (cause) {
      setMessage({
        tone: "error",
        text:
          cause instanceof Error ? cause.message : "Could not send magic link",
      });
    } finally {
      setPendingMethod(null);
    }
  };

  const openHosted = async (provider?: SocialMethod) => {
    setMessage(null);
    if (provider) setPendingMethod(provider);
    try {
      complete(
        await auth.signIn({
          returnTo,
          mode: oauthMode,
          intent: mode,
          ...(provider ? { provider } : {}),
        }),
      );
    } catch (cause) {
      setMessage({
        tone: "error",
        text: cause instanceof Error ? cause.message : "Authentication failed",
      });
    } finally {
      if (provider) setPendingMethod(null);
    }
  };

  const submitPasswordReset = async ({
    email,
  }: Pick<AuthFormValues, "email">) => {
    setMessage(null);
    setPendingMethod("password");
    try {
      await auth.requestPasswordReset({ email });
      setMessage({
        tone: "success",
        text: "If an account exists for this email, we sent a secure password-reset link.",
      });
    } catch (cause) {
      setMessage({
        tone: "error",
        text:
          cause instanceof Error
            ? cause.message
            : "Could not request a password reset",
      });
    } finally {
      setPendingMethod(null);
    }
  };

  if (!auth.metadata) {
    return (
      <section className={joinClasses("sso-auth-card", className)}>
        <AuthHeading mode={mode} title={title} subtitle={subtitle} />
        {auth.error ? (
          <p className="sso-auth-message" role="alert">
            {auth.error.message}
          </p>
        ) : (
          <AuthLoadingState />
        )}
      </section>
    );
  }

  if (routing === "hosted") {
    return (
      <section className={joinClasses("sso-auth-card", className)}>
        <AuthHeading mode={mode} title={title} subtitle={subtitle} />
        <button
          className="sso-button sso-auth-submit"
          type="button"
          disabled={busy}
          onClick={() => void openHosted()}
        >
          {busy ? (
            <>
              <LoadingSpinner /> Opening secure sign-in…
            </>
          ) : (
            <>Continue to sign {mode === "signin" ? "in" : "up"}</>
          )}
        </button>
      </section>
    );
  }

  if (showPasswordReset) {
    return (
      <section className={joinClasses("sso-auth-card", className)}>
        <AuthHeading
          mode={mode}
          title="Reset your password"
          subtitle="Enter your email and we’ll send a secure reset link."
        />
        <form
          className="sso-auth-form"
          onSubmit={resetForm.handleSubmit(submitPasswordReset)}
        >
          <AuthField
            id="sso-reset-email"
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            registration={resetForm.register("email", {
              required: "Email is required",
              pattern: { value: /^\S+@\S+$/i, message: "Enter a valid email" },
            })}
            error={resetForm.formState.errors.email?.message}
          />
          <button
            className="sso-button sso-auth-submit"
            type="submit"
            disabled={
              pendingMethod !== null || resetForm.formState.isSubmitting
            }
          >
            {pendingMethod === "password" ? (
              <>
                <LoadingSpinner /> Sending reset link…
              </>
            ) : (
              "Email reset link"
            )}
          </button>
        </form>
        {message ? (
          <p
            className={`sso-auth-message ${message.tone === "success" ? "sso-auth-message-success" : ""}`}
            role={message.tone === "success" ? "status" : "alert"}
          >
            {message.text}
          </p>
        ) : null}
        <p className="sso-auth-switch">
          <button
            type="button"
            onClick={() => {
              setMessage(null);
              setShowPasswordReset(false);
            }}
          >
            Back to sign in
          </button>
        </p>
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
              {pendingMethod === provider ? (
                <LoadingSpinner />
              ) : (
                <ProviderIcon provider={provider} />
              )}
              {pendingMethod === provider
                ? `Opening ${socialLabels[provider]}…`
                : `Continue with ${socialLabels[provider]}`}
            </button>
          ))}
        </div>
      ) : null}

      {socialMethods.length > 0 && (hasPassword || hasMagicLink) ? (
        <AuthDivider label="or continue with email" />
      ) : null}

      {hasPassword ? (
        <form
          className="sso-auth-form"
          onSubmit={passwordForm.handleSubmit(submitPassword)}
        >
          {mode === "signup" ? (
            <AuthField
              id="sso-password-name"
              label="Name"
              type="text"
              autoComplete="name"
              placeholder="Alex Morgan"
              registration={passwordForm.register("name", {
                required: "Name is required",
              })}
              error={passwordForm.formState.errors.name?.message}
            />
          ) : null}
          <AuthField
            id="sso-password-email"
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
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
            autoComplete={
              mode === "signin" ? "current-password" : "new-password"
            }
            placeholder={
              mode === "signin"
                ? "Enter your password"
                : "Create a password (15+ characters)"
            }
            minLength={mode === "signup" ? 15 : 1}
            registration={passwordForm.register("password", {
              required: "Password is required",
              ...(mode === "signup"
                ? {
                    minLength: {
                      value: 15,
                      message: "Password must be at least 15 characters",
                    },
                  }
                : {}),
            })}
            error={passwordForm.formState.errors.password?.message}
          />
          <button
            className="sso-button sso-auth-submit"
            type="submit"
            disabled={busy || passwordForm.formState.isSubmitting}
          >
            {pendingMethod === "password" ? (
              <>
                <LoadingSpinner />{" "}
                {mode === "signin" ? "Signing in…" : "Creating account…"}
              </>
            ) : mode === "signin" ? (
              "Sign in"
            ) : (
              "Create account"
            )}
          </button>
          {mode === "signin" ? (
            <button
              className="sso-auth-text-button"
              type="button"
              disabled={busy}
              onClick={() => {
                setMessage(null);
                setShowPasswordReset(true);
              }}
            >
              Forgot password?
            </button>
          ) : null}
        </form>
      ) : null}

      {hasMagicLink ? (
        <form
          className="sso-auth-form sso-auth-magic-form"
          onSubmit={magicLinkForm.handleSubmit(submitMagicLink)}
        >
          {hasPassword ? <AuthDivider label="or use a magic link" /> : null}
          {mode === "signup" ? (
            <AuthField
              id="sso-magic-name"
              label="Name"
              type="text"
              autoComplete="name"
              placeholder="Alex Morgan"
              registration={magicLinkForm.register("name", {
                required: "Name is required",
              })}
              error={magicLinkForm.formState.errors.name?.message}
            />
          ) : null}
          <AuthField
            id="sso-magic-email"
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            registration={magicLinkForm.register("email", {
              required: "Email is required",
              pattern: { value: /^\S+@\S+$/i, message: "Enter a valid email" },
            })}
            error={magicLinkForm.formState.errors.email?.message}
          />
          <button
            className="sso-auth-provider"
            type="submit"
            disabled={
              busy ||
              magicLinkForm.formState.isSubmitting ||
              !magicLinkEmail ||
              (mode === "signup" && !magicLinkName)
            }
          >
            {pendingMethod === "magic_link" ? (
              <>
                <LoadingSpinner /> Sending secure link…
              </>
            ) : (
              "Email me a magic link"
            )}
          </button>
        </form>
      ) : null}

      {message || auth.error ? (
        <p
          className={`sso-auth-message ${message?.tone === "success" ? "sso-auth-message-success" : ""}`}
          role={message?.tone === "success" ? "status" : "alert"}
        >
          {message?.text ?? auth.error?.message}
        </p>
      ) : null}

      {canSwitch ? (
        <p className="sso-auth-switch">
          {mode === "signin" ? "Need an account?" : "Already have an account?"}{" "}
          <button
            type="button"
            onClick={() => {
              setMessage(null);
              setPendingMethod(null);
              setShowPasswordReset(false);
              passwordForm.clearErrors();
              magicLinkForm.clearErrors();
              setMode(mode === "signin" ? "signup" : "signin");
            }}
          >
            {mode === "signin" ? "Sign up" : "Sign in"}
          </button>
        </p>
      ) : null}
    </section>
  );
}

export function SsoAuthDialog({
  open,
  onOpenChange,
  ...props
}: SsoAuthDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="sso-dialog-overlay" />
        <Dialog.Popup className="sso-dialog-content sso-auth-dialog">
          <Dialog.Title className="sso-visually-hidden">
            Authentication
          </Dialog.Title>
          <Dialog.Close
            className="sso-icon-button sso-auth-close"
            aria-label="Close authentication"
          >
            ×
          </Dialog.Close>
          <SsoAuth
            {...props}
            onSuccess={(session) => {
              onOpenChange(false);
              completeAuthInteraction(
                session,
                props.returnTo ?? "/",
                props.onSuccess,
              );
            }}
          />
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function AuthHeading({
  mode,
  title,
  subtitle,
}: Pick<SsoAuthProps, "title" | "subtitle"> & { mode: "signin" | "signup" }) {
  return (
    <header className="sso-auth-heading">
      <h2>
        {title ?? (mode === "signin" ? "Welcome back" : "Create your account")}
      </h2>
      <p>
        {subtitle ??
          (mode === "signin"
            ? "Sign in to continue"
            : "Sign up to get started")}
      </p>
    </header>
  );
}

function AuthField(props: {
  id: string;
  label: string;
  type: string;
  autoComplete: string;
  placeholder: string;
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
        placeholder={props.placeholder}
        minLength={props.minLength}
        aria-invalid={props.error ? "true" : "false"}
      />
      {props.error ? (
        <span className="sso-auth-field-error" role="alert">
          {props.error}
        </span>
      ) : null}
    </label>
  );
}

function AuthDivider({ label }: { label: string }) {
  return (
    <div className="sso-auth-divider">
      <span>{label}</span>
    </div>
  );
}

function AuthLoadingState() {
  return (
    <div
      className="sso-auth-skeleton"
      role="status"
      aria-label="Loading sign-in options"
    >
      <span className="sso-auth-skeleton-line sso-auth-skeleton-provider" />
      <span className="sso-auth-skeleton-divider" />
      <span className="sso-auth-skeleton-line sso-auth-skeleton-input" />
      <span className="sso-auth-skeleton-line sso-auth-skeleton-input" />
      <span className="sso-auth-skeleton-line sso-auth-skeleton-submit" />
      <span className="sso-auth-loading">Loading secure sign-in options…</span>
    </div>
  );
}

function LoadingSpinner() {
  return <span className="sso-auth-spinner" aria-hidden="true" />;
}

function ProviderIcon({ provider }: { provider: SocialMethod }) {
  if (provider === "google")
    return (
      <svg className="sso-provider-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="#4285F4"
          d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.41Z"
        />
        <path
          fill="#34A853"
          d="M12 22c2.7 0 4.98-.9 6.63-2.43l-3.24-2.54c-.9.6-2.05.96-3.39.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.62A10 10 0 0 0 12 22Z"
        />
        <path
          fill="#FBBC05"
          d="M6.39 13.86A6 6 0 0 1 6.08 12c0-.65.11-1.28.31-1.86V7.52H3.04A10 10 0 0 0 2 12c0 1.61.38 3.14 1.04 4.48l3.35-2.62Z"
        />
        <path
          fill="#EA4335"
          d="M12 6.01c1.47 0 2.79.51 3.83 1.5l2.87-2.88A9.64 9.64 0 0 0 12 2a10 10 0 0 0-8.96 5.52l3.35 2.62C7.18 7.77 9.39 6.01 12 6.01Z"
        />
      </svg>
    );
  if (provider === "github")
    return (
      <svg
        className="sso-provider-icon sso-provider-icon-github"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.87c-2.78.6-3.37-1.18-3.37-1.18-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.9 1.53 2.35 1.09 2.92.83.09-.65.35-1.09.64-1.34-2.22-.25-4.56-1.11-4.56-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02A9.55 9.55 0 0 1 12 6.82a9.5 9.5 0 0 1 2.5.34c1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.86v2.76c0 .27.18.58.69.48A10 10 0 0 0 12 2Z" />
      </svg>
    );
  if (provider === "facebook")
    return (
      <svg className="sso-provider-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="#1877F2"
          d="M22 12A10 10 0 1 0 10.44 21.9v-7H7.9V12h2.54V9.8c0-2.51 1.5-3.9 3.78-3.9 1.1 0 2.24.2 2.24.2v2.46H15.2c-1.24 0-1.63.77-1.63 1.56V12h2.77l-.44 2.9h-2.33v7A10 10 0 0 0 22 12Z"
        />
        <path
          fill="#fff"
          d="m15.9 14.9.44-2.9h-2.77v-1.88c0-.79.39-1.56 1.63-1.56h1.26V6.1s-1.15-.2-2.24-.2c-2.28 0-4.76 1.39-4.76 3.9V12H7.9v2.9h2.54v7a10.1 10.1 0 0 0 3.13 0v-7h2.33Z"
        />
      </svg>
    );
  return (
    <svg className="sso-provider-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#0A66C2"
        d="M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.34V8.98h3.42v1.57h.05c.47-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.29ZM5.32 7.41a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12Zm1.78 13.04H3.54V8.98H7.1v11.47Z"
      />
    </svg>
  );
}

function isSocialMethod(method: SsoAuthMethod): method is SocialMethod {
  return (
    method === "google" ||
    method === "facebook" ||
    method === "linkedin" ||
    method === "github"
  );
}

function joinClasses(...classes: Array<string | undefined>) {
  return classes.filter(Boolean).join(" ");
}
