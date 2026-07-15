import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ApplicationMember } from "../../types";
import { InfoGrid } from "../../components/info-grid";

export function MemberViewDialog({
  member,
  onOpenChange,
}: {
  member: ApplicationMember | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={Boolean(member)} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Member details</DialogTitle>
          <DialogDescription>{member?.user.email}</DialogDescription>
        </DialogHeader>
        {member ? (
          <InfoGrid
            rows={[
              ["Name", member.user.name],
              ["Email", member.user.email],
              ["Status", member.status],
              ["User ID", member.userId],
              ["Created", new Date(member.createdAt).toLocaleString()],
              ["Updated", new Date(member.updatedAt).toLocaleString()],
            ]}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
