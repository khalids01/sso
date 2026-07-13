import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { queryKeys } from "@/constants/query-keys";
import { client } from "@/lib/client";
import { cn } from "@/lib/utils";
import type { AdminApplication } from "../../types";

export function GrantAccessDialog(props: {
  application: AdminApplication | null;
  isLoading: boolean;
  onOpenChange: (open: boolean) => void;
  onGrant: (userId: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const usersQuery = useQuery({
    queryKey: queryKeys.admin.users.list(`application-grant:${search}`),
    enabled: Boolean(props.application),
    queryFn: async () => {
      const { data, error } = await client.admin.users.get({
        query: {
          page: 1,
          limit: 10,
          search: search || undefined,
          archived: false,
        },
      });

      if (error) {
        throw new Error("Failed to load users");
      }

      return data as {
        users: Array<{
          id: string;
          name: string;
          email: string;
          banned: boolean;
          archived: boolean;
        }>;
      };
    },
  });

  const users = usersQuery.data?.users ?? [];

  return (
    <Dialog
      open={Boolean(props.application)}
      onOpenChange={(open) => {
        if (!open) {
          setSearch("");
          setSelectedUserId(null);
        }
        props.onOpenChange(open);
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Grant access</DialogTitle>
          <DialogDescription>{props.application?.name}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            placeholder="Search users by name or email..."
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setSelectedUserId(null);
            }}
          />
          <div className="max-h-72 divide-y overflow-auto rounded-md border">
            {usersQuery.isLoading ? (
              <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                Loading users...
              </div>
            ) : users.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                No users found.
              </div>
            ) : (
              users.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  className={cn(
                    "flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm hover:bg-muted",
                    selectedUserId === user.id && "bg-muted",
                  )}
                  onClick={() => setSelectedUserId(user.id)}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">
                      {user.name}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {user.email}
                    </span>
                  </span>
                  {user.banned ? (
                    <Badge variant="destructive">banned</Badge>
                  ) : null}
                </button>
              ))
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={props.isLoading}
              onClick={() => props.onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={props.isLoading || !selectedUserId}
              onClick={() => {
                if (selectedUserId) props.onGrant(selectedUserId);
              }}
            >
              {props.isLoading ? "Granting..." : "Grant access"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
