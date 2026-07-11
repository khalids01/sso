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
import { CreateApplicationClientForm } from "./client.form";
import type { CreateApplicationClientInput } from "./schema";

type CreateApplicationClientDialogProps = {
  disabled: boolean;
  isLoading: boolean;
  onCreate: (input: CreateApplicationClientInput) => void;
};

export function CreateApplicationClientDialog({
  disabled,
  isLoading,
  onCreate,
}: CreateApplicationClientDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button disabled={disabled}>
            <Plus className="mr-2 h-4 w-4" />
            Create client
          </Button>
        }
      />
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create client</DialogTitle>
          <DialogDescription>
            Add a browser client for the selected application.
          </DialogDescription>
        </DialogHeader>

        <CreateApplicationClientForm
          isLoading={isLoading}
          onCreate={onCreate}
          onCreated={() => setOpen(false)}
          resetKey={open ? "open" : "closed"}
        />
      </DialogContent>
    </Dialog>
  );
}
