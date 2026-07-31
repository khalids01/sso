import { useState } from "react";
import { Roles } from "@sso/rbac";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function InviteDialog(props: {
  onInvite: (email: string, roleSlug: string) => void;
  isLoading: boolean;
}) {
  const [email, setEmail] = useState("");
  const [roleSlug, setRoleSlug] = useState<string>(Roles.PlatformUser);
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button>
            <UserPlus className="mr-2 h-4 w-4" />
            Invite User
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite User</DialogTitle>
          <DialogDescription>Send an invitation email to a new user.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <label htmlFor="email">Email</label>
            <Input
              id="email"
              placeholder="user@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <label htmlFor="role">Role</label>
            <Select
              value={roleSlug}
              onValueChange={(value) => setRoleSlug(value || Roles.PlatformUser)}
            >
              <SelectTrigger id="role" className="w-full">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={Roles.PlatformUser}>User</SelectItem>
                <SelectItem value={Roles.PlatformAdmin}>Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button
            disabled={props.isLoading || !email}
            onClick={() => {
              props.onInvite(email, roleSlug);
              setOpen(false);
              setEmail("");
            }}
          >
            {props.isLoading ? "Sending..." : "Send Invitation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
