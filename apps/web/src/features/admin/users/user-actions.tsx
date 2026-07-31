import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Ban,
  Eye,
  History,
  MoreHorizontal,
  Shield,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Roles } from "@sso/rbac";
import { queryKeys } from "@/constants/query-keys";
import { client } from "@/lib/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AssignableRole } from "@/features/admin/roles/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AuthMethodBadges } from "../components/auth-method-badges";
import type { AdminUser } from "./types";
import { useSession } from "@/providers/session-provider";

type UserSession = {
  id: string;
  expiresAt: string | Date;
  createdAt: string | Date;
  updatedAt: string | Date;
  ipAddress: string | null;
  userAgent: string | null;
  isCurrent?: boolean;
};

function getDeviceLabel(userAgent: string | null) {
  if (!userAgent) {
    return "Unknown device";
  }

  const os = userAgent.includes("Windows")
    ? "Windows"
    : userAgent.includes("Mac OS")
      ? "macOS"
      : userAgent.includes("Android")
        ? "Android"
        : userAgent.includes("iPhone") || userAgent.includes("iPad")
          ? "iOS"
          : userAgent.includes("Linux")
            ? "Linux"
            : "Unknown OS";
  const browser = userAgent.includes("Edg/")
    ? "Edge"
    : userAgent.includes("Chrome/")
      ? "Chrome"
      : userAgent.includes("Firefox/")
        ? "Firefox"
        : userAgent.includes("Safari/")
          ? "Safari"
          : "Browser";

  return `${browser} on ${os}`;
}

export function UserActions({ user }: { user: AdminUser }) {
  const { session } = useSession();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [sessionsOpen, setSessionsOpen] = useState(false);
  const [roleOpen, setRoleOpen] = useState(false);
  const [banConfirmOpen, setBanConfirmOpen] = useState(false);
  const [roleSlug, setRoleSlug] = useState<string>(user.role.slug);
  const queryClient = useQueryClient();

  const { data: sessions, isLoading: sessionsLoading } = useQuery({
    queryKey: queryKeys.admin.users.sessions(user.id),
    queryFn: async () => {
      const { data, error } = await client.admin
        .users({ id: user.id })
        .sessions.get();
      if (error) {
        throw new Error(
          error.value ? JSON.stringify(error.value) : "Unknown error",
        );
      }
      return data as UserSession[];
    },
    enabled: sessionsOpen,
  });

  const { data: assignableRoles, isLoading: rolesLoading } = useQuery({
    queryKey: queryKeys.admin.roles.assignable(),
    queryFn: async () => {
      const { data, error } = await client.admin.roles.assignable.get();
      if (error) {
        throw new Error("Failed to load assignable roles");
      }
      return data as AssignableRole[];
    },
    enabled: roleOpen,
  });

  const changeRoleMutation = useMutation({
    mutationFn: async (nextRoleSlug: string) => {
      const { data, error } = await client.admin.users({ id: user.id }).patch({
        roleSlug: nextRoleSlug,
      });
      if (error) {
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      toast.success("User role updated");
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.users.all() });
      setRoleOpen(false);
    },
    onError: (error: any) => {
      toast.error(
        String(
          error?.value?.message || error?.message || "Failed to update role",
        ),
      );
    },
  });

  const revokeSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const { error } = await client.admin
        .users({ id: user.id })
        .sessions({ sessionId })
        .delete();
      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      toast.success("Session revoked");
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.users.sessions(user.id),
      });
    },
    onError: (error: any) => {
      toast.error(
        String(
          error?.value?.message || error?.message || "Failed to revoke session",
        ),
      );
    },
  });

  const revokeAllSessionsMutation = useMutation({
    mutationFn: async () => {
      const { error } = await client.admin
        .users({ id: user.id })
        .sessions.delete();
      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      toast.success("All sessions revoked");
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.users.sessions(user.id),
      });
    },
    onError: (error: any) => {
      toast.error(
        String(
          error?.value?.message ||
            error?.message ||
            "Failed to revoke sessions",
        ),
      );
    },
  });

  const banMutation = useMutation({
    mutationFn: async () => {
      const endpoint = client.admin.users({ id: user.id });
      const { error } = user.banned
        ? await endpoint.unban.post()
        : await endpoint.ban.post({});
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(user.banned ? "User unbanned" : "User banned");
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.users.all() });
      setBanConfirmOpen(false);
    },
    onError: (error: any) => {
      toast.error(
        String(
          error?.value?.message || error?.message || "Failed to update user",
        ),
      );
    },
  });

  const isCurrentUser = session?.user.id === user.id;
  const canChangeRole = user.role.slug !== Roles.PlatformOwner;
  const canUseDestructiveActions = user.role.slug !== Roles.PlatformOwner;
  const showBanAction = canUseDestructiveActions || isCurrentUser;
  const hasRevocableSessions = sessions?.some((session) => !session.isCurrent);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={(triggerProps) => (
            <Button variant="ghost" className="h-8 w-8 p-0" {...triggerProps}>
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          )}
        />
        <DropdownMenuContent align="end" className="w-[160px]">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => setDetailsOpen(true)}>
              <Eye className="mr-2 h-4 w-4" />
              View User
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSessionsOpen(true)}>
              <History className="mr-2 h-4 w-4" />
              View Sessions
            </DropdownMenuItem>
            {canChangeRole ? (
              <DropdownMenuItem
                onClick={() => {
                  setRoleSlug(user.role.slug);
                  setRoleOpen(true);
                }}
              >
                <Shield className="mr-2 h-4 w-4" />
                Change Role
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuGroup>
          {showBanAction ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                disabled={isCurrentUser}
                title={
                  isCurrentUser ? "You cannot ban your own account" : undefined
                }
                onClick={() => setBanConfirmOpen(true)}
              >
                <Ban className="mr-2 h-4 w-4" />
                {user.banned ? "Unban User" : "Ban User"}
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <Avatar className="size-12">
                <AvatarImage src={user.image ?? undefined} />
                <AvatarFallback>
                  {user.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <DialogTitle>{user.name}</DialogTitle>
                <DialogDescription>{user.email}</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="grid gap-4 py-2 sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground">Role</p>
              <p className="font-medium">{user.role.name}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Email verified</p>
              <p className="font-medium">{user.emailVerified ? "Yes" : "No"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Plan</p>
              <p className="font-medium">{user.plan}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Created</p>
              <p className="font-medium">
                {new Date(user.createdAt).toLocaleString()}
              </p>
            </div>
            <div className="sm:col-span-2">
              <p className="mb-1 text-xs text-muted-foreground">Auth methods</p>
              <AuthMethodBadges methods={user.authMethods} />
              {user.authMethods.some((method) => method.oauthConnection) ? (
                <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {user.authMethods
                    .filter((method) => method.oauthConnection)
                    .map((method) => (
                      <p key={`${method.id}:${method.oauthConnection!.id}`}>
                        {method.label}: {method.oauthConnection!.name}
                      </p>
                    ))}
                </div>
              ) : null}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={banConfirmOpen} onOpenChange={setBanConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {user.banned ? `Unban ${user.name}?` : `Ban ${user.name}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {user.banned
                ? "This restores the user's ability to sign in."
                : "This immediately blocks sign-in and invalidates application access."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant={user.banned ? "default" : "destructive"}
              disabled={banMutation.isPending}
              onClick={() => banMutation.mutate()}
            >
              {banMutation.isPending
                ? "Updating..."
                : user.banned
                  ? "Unban user"
                  : "Ban user"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={sessionsOpen} onOpenChange={setSessionsOpen}>
        <DialogContent className="max-w-2xl overflow-hidden">
          <DialogHeader>
            <DialogTitle>User Sessions - {user.name}</DialogTitle>
            <DialogDescription>
              Active devices and sessions for this user.
            </DialogDescription>
          </DialogHeader>
          <div className="min-w-0 py-4">
            {sessionsLoading ? (
              <div className="flex justify-center py-8">
                Loading sessions...
              </div>
            ) : sessions?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No sessions found.
              </div>
            ) : (
              <div className="max-h-[60vh] space-y-4 overflow-y-auto overflow-x-hidden">
                {sessions?.map((session) => (
                  <div
                    key={session.id}
                    className="min-w-0 rounded-lg border p-3 text-sm"
                  >
                    <div className="flex min-w-0 items-start justify-between gap-2 font-medium">
                      <div className="min-w-0">
                        <span className="min-w-0 truncate">
                          {getDeviceLabel(session.userAgent)}
                          {session.isCurrent ? (
                            <span className="ml-2 rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                              Current
                            </span>
                          ) : null}
                        </span>
                        <div className="mt-1 text-xs text-muted-foreground">
                          IP: {session.ipAddress || "Unknown"} - Signed in{" "}
                          {new Date(session.createdAt).toLocaleString()}
                        </div>
                      </div>
                      {!session.isCurrent ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0 text-destructive"
                          disabled={revokeSessionMutation.isPending}
                          onClick={() =>
                            revokeSessionMutation.mutate(session.id)
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Revoke session</span>
                        </Button>
                      ) : null}
                    </div>
                    <div className="mt-1 min-w-0 break-all text-xs text-muted-foreground">
                      OS: {session.userAgent || "Unknown"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="destructive"
              disabled={
                revokeAllSessionsMutation.isPending || !hasRevocableSessions
              }
              onClick={() => revokeAllSessionsMutation.mutate()}
            >
              {revokeAllSessionsMutation.isPending
                ? "Revoking..."
                : "Revoke all sessions"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={roleOpen} onOpenChange={setRoleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Role - {user.name}</DialogTitle>
            <DialogDescription>
              Assign a role to this user. Owner roles cannot be assigned here.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-4">
            <label htmlFor="user-role">Role</label>
            {rolesLoading ? (
              <div className="text-sm text-muted-foreground">
                Loading roles...
              </div>
            ) : (
              <Select
                value={roleSlug}
                onValueChange={(value) => setRoleSlug(value || user.role.slug)}
              >
                <SelectTrigger id="user-role" className="w-full">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {assignableRoles?.map((role) => (
                    <SelectItem key={role.id} value={role.slug}>
                      {role.name} ({role.slug})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <DialogFooter>
            <Button
              disabled={
                changeRoleMutation.isPending ||
                rolesLoading ||
                roleSlug === user.role.slug
              }
              onClick={() => changeRoleMutation.mutate(roleSlug)}
            >
              Save role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
