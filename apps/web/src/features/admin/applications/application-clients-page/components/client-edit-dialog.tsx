import { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ApplicationClientForm } from "../../client.form";
import {
  getClientSocialProviderSecret,
  type SocialProviderId,
} from "../../crud/clients";
import type { CreateApplicationClientInput } from "../../schema";
import type { AdminApplication, ApplicationClient } from "../../types";

export function ClientEditDialog(props: {
  value: { application: AdminApplication; client: ApplicationClient } | null;
  isLoading: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: CreateApplicationClientInput) => void;
}) {
  const initialValues = useMemo(
    () =>
      props.value
        ? {
            name: props.value.client.name,
            status: props.value.client.status,
            redirectUris: props.value.client.redirectUris.length
              ? props.value.client.redirectUris
              : [""],
            allowedOrigins: props.value.client.allowedOrigins.length
              ? props.value.client.allowedOrigins
              : [""],
            googleClientId: props.value.client.socialProviderCredentials.find((item) => item.provider === "google")?.clientId ?? "",
            googleClientSecret: "",
            removeGoogleCredentials: false,
            facebookClientId: props.value.client.socialProviderCredentials.find((item) => item.provider === "facebook")?.clientId ?? "",
            facebookClientSecret: "",
            removeFacebookCredentials: false,
            githubClientId: props.value.client.socialProviderCredentials.find((item) => item.provider === "github")?.clientId ?? "",
            githubClientSecret: "",
            removeGithubCredentials: false,
          }
        : undefined,
    [props.value],
  );

  return (
    <Dialog open={Boolean(props.value)} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Edit client</DialogTitle>
          <DialogDescription>{props.value?.application.name}</DialogDescription>
        </DialogHeader>
        {initialValues ? (
          <ApplicationClientForm
            initialValues={initialValues}
            isLoading={props.isLoading}
            resetKey={props.value?.client.id ?? "closed"}
            loadProviderSecret={(provider: SocialProviderId) =>
              getClientSocialProviderSecret({
                applicationId: props.value!.application.id,
                clientId: props.value!.client.id,
                provider,
              })
            }
            onSubmit={props.onSubmit}
            onSubmitted={() => props.onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
