import { Roles } from "@sso/rbac";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UserActions } from "./user-actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AuthMethodBadges } from "../components/auth-method-badges";
import type { AdminUser } from "./types";

export function UsersListTab(props: {
  search: string;
  onSearchChange: (value: string) => void;
  users: AdminUser[];
  isLoading: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center">
        <Input
          placeholder="Filter users..."
          value={props.search}
          onChange={(event) => props.onSearchChange(event.target.value)}
          className="max-w-sm"
        />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Auth methods</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {props.isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : props.users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No users found.
                </TableCell>
              </TableRow>
            ) : (
              props.users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="size-9">
                        <AvatarImage src={user.image ?? undefined} />
                        <AvatarFallback>
                          {user.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{user.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        user.role?.slug === Roles.PlatformAdmin ||
                        user.role?.slug === Roles.PlatformOwner
                          ? "default"
                          : "secondary"
                      }
                    >
                      {user.role?.name ?? user.role?.slug ?? "User"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <AuthMethodBadges methods={user.authMethods} />
                  </TableCell>
                  <TableCell>
                    {user.banned ? (
                      <Badge variant="destructive">Banned</Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="border-green-600 text-green-600"
                      >
                        Active
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <UserActions user={user} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
