import { useEffect, useState } from "react";
import { Globe2, LockKeyhole, Mail, Settings2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type {
  AdminApplication,
  ApplicationAuthMethod,
  ApplicationRegistrationMode,
  ApplicationSignupMethod,
} from "../../types";

function methodIcon(id: string) {
  if (id === "magic_link") return Mail;
  if (id === "password") return LockKeyhole;
  return Globe2;
}

export function ApplicationAuthSettingsDialog(props: {
  application: AdminApplication | null;
  canManage: boolean;
  isLoading: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (input: {
    signInMethods: ApplicationAuthMethod[];
    signUpMethods: ApplicationSignupMethod[];
    registrationMode: ApplicationRegistrationMode;
  }) => void;
}) {
  const [signInMethods, setSignInMethods] = useState<ApplicationAuthMethod[]>([]);
  const [signUpMethods, setSignUpMethods] =
    useState<ApplicationSignupMethod[]>([]);
  const [registrationMode, setRegistrationMode] =
    useState<ApplicationRegistrationMode>("closed");

  useEffect(() => {
    const application = props.application;
    if (!application) return;
    const availableIds = new Set(
      application.authCapabilities
        .filter((capability) => capability.available)
        .map((capability) => capability.id),
    );
    setSignInMethods(
      application.signInMethods.filter((method) => availableIds.has(method)),
    );
    setSignUpMethods(
      application.signUpMethods.filter(
        (method) => availableIds.has(method),
      ),
    );
    setRegistrationMode(application.registrationMode);
  }, [props.application]);

  const application = props.application;
  const canSave = props.canManage && signInMethods.length > 0;

  return (
    <Dialog open={Boolean(application)} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <div className="flex items-start gap-3 pr-8">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Settings2 className="size-5" />
            </div>
            <div>
              <DialogTitle>Authentication settings</DialogTitle>
              <DialogDescription>
                {application?.name} controls which SSO methods its users see.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {application ? (
          <div className="space-y-6">
            <section className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold">Sign-in methods</h3>
                <p className="text-xs text-muted-foreground">
                  A method is selectable only when it is fully configured on the
                  SSO server.
                </p>
              </div>
              <div className="divide-y rounded-lg border">
                {application.authCapabilities.map((capability) => {
                  const Icon = methodIcon(capability.id);
                  const supportedMethod = [
                    "magic_link",
                    "password",
                    "google",
                    "facebook",
                    "linkedin",
                    "github",
                  ].includes(capability.id);
                  const method = supportedMethod
                    ? (capability.id as ApplicationAuthMethod)
                    : null;
                  const signupMethod =
                    method && method !== "password"
                      ? (method as ApplicationSignupMethod)
                      : null;
                  const checked =
                    capability.available &&
                    method !== null &&
                    signInMethods.includes(method);

                  return (
                    <div
                      key={capability.id}
                      className="flex items-center gap-3 px-4 py-3"
                    >
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                        <Icon className="size-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium">
                            {capability.label}
                          </span>
                          <Badge
                            variant={capability.available ? "secondary" : "outline"}
                          >
                            {capability.available ? "Available" : "Not configured"}
                          </Badge>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {capability.available
                            ? "Available for this application."
                            : capability.unavailableReason}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-4">
                        <label className="grid justify-items-center gap-1 text-[10px] text-muted-foreground">
                          Sign in
                          <Switch
                            checked={checked}
                            disabled={
                              !props.canManage ||
                              !capability.available ||
                              !method ||
                              (checked && signInMethods.length === 1)
                            }
                            aria-label={`Enable ${capability.label} sign-in`}
                            onCheckedChange={(enabled) => {
                              if (!method) return;
                              setSignInMethods((current) =>
                                enabled
                                  ? [...new Set([...current, method])]
                                  : current.filter((value) => value !== method),
                              );
                              if (!enabled && signupMethod) {
                                setSignUpMethods((current) =>
                                  current.filter((value) => value !== signupMethod),
                                );
                              }
                            }}
                          />
                        </label>
                        <label className="grid justify-items-center gap-1 text-[10px] text-muted-foreground">
                          Signup
                          <Switch
                            checked={
                              capability.available &&
                              Boolean(
                                signupMethod &&
                                  signUpMethods.includes(signupMethod),
                              )
                            }
                            disabled={
                              !props.canManage ||
                              registrationMode === "closed" ||
                              !capability.available ||
                              !capability.supportsSignUp ||
                              !signupMethod ||
                              !checked
                            }
                            aria-label={`Enable ${capability.label} signup`}
                            onCheckedChange={(enabled) => {
                              if (!signupMethod) return;
                              setSignUpMethods((current) =>
                                enabled
                                  ? [...new Set([...current, signupMethod])]
                                  : current.filter(
                                      (value) => value !== signupMethod,
                                    ),
                              );
                            }}
                          />
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="rounded-lg border bg-muted/20 p-4">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="registration-mode">
                  Account registration
                </label>
                <Select
                  value={registrationMode}
                  disabled={!props.canManage}
                  onValueChange={(value) =>
                    setRegistrationMode(value as ApplicationRegistrationMode)
                  }
                >
                  <SelectTrigger id="registration-mode" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="closed">Closed</SelectItem>
                    <SelectItem value="invite_only">Invitation only</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Closed requires an existing member. Invitation-only accepts a
                  valid application invitation.
                </p>
              </div>

            </section>

            {signInMethods.length === 0 ? (
              <p className="text-sm text-destructive">
                At least one configured sign-in method is required.
              </p>
            ) : null}
          </div>
        ) : null}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => props.onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!canSave || props.isLoading}
            onClick={() =>
              props.onSave({
                signInMethods,
                signUpMethods:
                  registrationMode === "closed" ? [] : signUpMethods,
                registrationMode,
              })
            }
          >
            {props.isLoading ? "Saving..." : "Save settings"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
