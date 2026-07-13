import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ApplicationClient } from "../../types";
import { InfoGrid } from "./info-grid";

export function ClientViewDialog({
  client,
  onOpenChange,
}: {
  client: ApplicationClient | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={Boolean(client)} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Client details</DialogTitle>
          <DialogDescription>{client?.name}</DialogDescription>
        </DialogHeader>
        {client ? (
          <InfoGrid
            rows={[
              ["Name", client.name],
              ["Client ID", client.clientId],
              ["Type", client.clientType],
              ["Status", client.status],
              ["Redirect URIs", client.redirectUris.join("\n") || "None"],
              ["Allowed origins", client.allowedOrigins.join("\n") || "None"],
              ["Created", new Date(client.createdAt).toLocaleString()],
              ["Updated", new Date(client.updatedAt).toLocaleString()],
            ]}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
