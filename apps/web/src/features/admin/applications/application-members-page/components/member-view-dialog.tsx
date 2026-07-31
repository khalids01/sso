import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ApplicationMember } from "../../types";
import { InfoGrid } from "../../components/info-grid";
import { AuthMethodBadges } from "../../../components/auth-method-badges";

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
          <div className="space-y-4">
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
            <div>
              <p className="mb-2 text-sm font-medium">Auth methods</p>
              <AuthMethodBadges methods={member.user.authMethods} />
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
