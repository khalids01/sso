import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CreateApplicationForm } from "./application.form";
import type { CreateApplicationInput } from "./schema";
import type { OAuthConnectionOption } from "../oauth-connections/types";

type CreateApplicationDialogProps = {
  isLoading: boolean;
  onCreate: (input: CreateApplicationInput) => void;
  oauthConnectionOptions?: OAuthConnectionOption[];
};

export function CreateApplicationDialog({
  isLoading,
  onCreate,
  oauthConnectionOptions,
}: CreateApplicationDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create application
          </Button>
        }
      />
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create application</DialogTitle>
          <DialogDescription>
            Register an app that will use SSO for sign-in.
          </DialogDescription>
        </DialogHeader>

        <CreateApplicationForm
          isLoading={isLoading}
          onCreate={onCreate}
          onCreated={() => setOpen(false)}
          resetKey={open ? "open" : "closed"}
          oauthConnectionOptions={oauthConnectionOptions}
        />
      </DialogContent>
    </Dialog>
  );
}
