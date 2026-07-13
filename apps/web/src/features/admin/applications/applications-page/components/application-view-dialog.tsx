import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { AdminApplication } from "../../types";
import { InfoGrid } from "./info-grid";

export function ApplicationViewDialog({
  application,
  onOpenChange,
}: {
  application: AdminApplication | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={Boolean(application)} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Application details</DialogTitle>
          <DialogDescription>{application?.name}</DialogDescription>
        </DialogHeader>
        {application ? (
          <InfoGrid
            rows={[
              ["Name", application.name],
              ["Slug", application.slug],
              ["Status", application.status],
              ["Description", application.description ?? "None"],
              ["Logo URL", application.logoUrl ?? "None"],
              ["Homepage URL", application.homepageUrl ?? "None"],
              ["Clients", String(application.clientCount)],
              ["Created", new Date(application.createdAt).toLocaleString()],
              ["Updated", new Date(application.updatedAt).toLocaleString()],
            ]}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
