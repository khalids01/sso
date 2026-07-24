import { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ApplicationForm } from "../../application.form";
import type {
  CreateApplicationFormValues,
  CreateApplicationInput,
} from "../../schema";
import type {
  AdminApplication,
  ApplicationOAuthConnections,
} from "../../types";
import type { OAuthConnectionOption } from "../../../oauth-connections/types";

const oauthProviders = [
  "google",
  "facebook",
  "github",
  "linkedin",
] as const;

export function ApplicationEditDialog(props: {
  application: AdminApplication | null;
  isLoading: boolean;
  oauthConnectionOptions?: OAuthConnectionOption[];
  onOpenChange: (open: boolean) => void;
  errorMessage?: string | null;
  onSubmit: (payload: CreateApplicationInput) => Promise<void>;
}) {
  const currentOAuthConnections = useMemo(
    () =>
      Object.fromEntries(
        props.application?.oauthConnections.map((connection) => [
          connection.provider,
          connection.id,
        ]) ?? [],
      ) as ApplicationOAuthConnections,
    [props.application],
  );
  const initialValues = useMemo<CreateApplicationFormValues | undefined>(
    () =>
      props.application
        ? {
            name: props.application.name,
            slug: props.application.slug,
            description: props.application.description ?? "",
            status: props.application.status,
            oauthConnections: currentOAuthConnections,
          }
        : undefined,
    [currentOAuthConnections, props.application],
  );
  const oauthConnectionOptions = useMemo(() => {
    const options = [...(props.oauthConnectionOptions ?? [])];
    for (const connection of props.application?.oauthConnections ?? []) {
      if (!options.some((option) => option.id === connection.id)) {
        options.push(connection);
      }
    }
    return options;
  }, [props.application, props.oauthConnectionOptions]);

  return (
    <Dialog open={Boolean(props.application)} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit application</DialogTitle>
          <DialogDescription>{props.application?.name}</DialogDescription>
        </DialogHeader>
        {initialValues ? (
          <ApplicationForm
            initialValues={initialValues}
            isLoading={props.isLoading}
            resetKey={props.application?.id ?? "closed"}
            oauthConnectionOptions={oauthConnectionOptions}
            onSubmit={(input) => {
              const changedOAuthConnections =
                Object.fromEntries(
                  oauthProviders
                    .filter(
                      (provider) =>
                        (input.oauthConnections?.[provider] ?? null) !==
                        (currentOAuthConnections[provider] ?? null),
                    )
                    .map((provider) => [
                      provider,
                      input.oauthConnections?.[provider] ?? null,
                    ]),
                ) as ApplicationOAuthConnections;

              return props.onSubmit({
                ...input,
                oauthConnections:
                  Object.keys(changedOAuthConnections).length > 0
                    ? changedOAuthConnections
                    : undefined,
              });
            }}
            onSubmitted={() => props.onOpenChange(false)}
            errorMessage={props.errorMessage}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
