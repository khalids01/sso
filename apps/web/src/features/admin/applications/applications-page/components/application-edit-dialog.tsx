import { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ApplicationForm } from "../../application.form";
import type { AdminApplication, ApplicationStatus } from "../../types";

export function ApplicationEditDialog(props: {
  application: AdminApplication | null;
  isLoading: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: {
    name?: string;
    slug?: string;
    description?: string;
    status?: ApplicationStatus;
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
          }
        : undefined,
    [props.application],
  );

  return (
    <Dialog open={Boolean(props.application)} onOpenChange={props.onOpenChange}>
      <DialogContent>
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
