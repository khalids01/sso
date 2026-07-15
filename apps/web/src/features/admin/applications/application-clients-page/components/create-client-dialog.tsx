import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ApplicationClientForm } from "../../client.form";
import type { CreateApplicationClientInput } from "../../schema";
import type { AdminApplication } from "../../types";

export function CreateClientDialog(props: {
  application: AdminApplication | null;
  isLoading: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: CreateApplicationClientInput) => void;
}) {
  return (
    <Dialog open={Boolean(props.application)} onOpenChange={props.onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create client</DialogTitle>
          <DialogDescription>
            {props.application
              ? `Add a browser client for ${props.application.name}.`
              : "Add a browser client."}
          </DialogDescription>
        </DialogHeader>
        <ApplicationClientForm
          isLoading={props.isLoading}
          resetKey={props.application?.id ?? "closed"}
          submitLabel="Create client"
          loadingLabel="Creating..."
          onSubmit={props.onSubmit}
          onSubmitted={() => props.onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
