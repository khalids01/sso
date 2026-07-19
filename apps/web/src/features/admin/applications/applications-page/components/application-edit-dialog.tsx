import { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ApplicationForm } from "../../application.form";
import type { AdminApplication, ApplicationAuthMethod, ApplicationRegistrationMode, ApplicationStatus } from "../../types";

export function ApplicationEditDialog(props: {
  application: AdminApplication | null;
  isLoading: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: {
    name?: string;
    slug?: string;
    description?: string;
    status?: ApplicationStatus;
    signInMethods?: ApplicationAuthMethod[];
    signUpMethods?: Array<"magic_link">;
    registrationMode?: ApplicationRegistrationMode;
  }) => void;
}) {
  const initialValues = useMemo(
    () =>
      props.application
        ? {
            name: props.application.name,
            slug: props.application.slug,
            description: props.application.description ?? "",
            status: props.application.status,
            signInMethods: props.application.signInMethods,
            signUpMethods: props.application.signUpMethods,
            registrationMode: props.application.registrationMode,
          }
        : undefined,
    [props.application],
  );

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
            onSubmit={props.onSubmit}
            onSubmitted={() => props.onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
