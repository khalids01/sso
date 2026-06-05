import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { Input } from "@/components/ui/input";
import { PermissionEditor } from "./permission-editor";
import type { PermissionCatalogEntry } from "./types";

type CreateRoleDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (input: {
    slug: string;
    name: string;
    permissions?: string[];
  }) => void;
  isLoading: boolean;
};

export function CreateRoleDialog({
  open,
  onOpenChange,
  onCreate,
  isLoading,
}: CreateRoleDialogProps) {
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data: catalog } = useQuery({
    queryKey: queryKeys.admin.roles.permissions(),
    queryFn: async () => {
      const { data, error } = await client.admin.roles.permissions.get();
      if (error) {
        throw new Error("Failed to load permissions");
      }
      return data as PermissionCatalogEntry[];
    },
    enabled: open,
  });

  useEffect(() => {
    if (!open) {
      setSlug("");
      setName("");
      setSelected(new Set());
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create custom role</DialogTitle>
          <DialogDescription>
            Custom roles use your own slug and permission subset. The platform.* namespace
            is reserved.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <label htmlFor="role-slug">Slug</label>
            <Input
              id="role-slug"
              placeholder="custom.support"
              value={slug}
              onChange={(event) => setSlug(event.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <label htmlFor="role-name">Name</label>
            <Input
              id="role-name"
              placeholder="Support"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          {catalog ? (
            <PermissionEditor
              catalog={catalog}
              selected={selected}
              onToggle={(permission, checked) => {
                setSelected((current) => {
                  const next = new Set(current);
                  if (checked) {
                    next.add(permission);
                  } else {
                    next.delete(permission);
                  }
                  return next;
                });
              }}
            />
          ) : null}
        </div>

        <DialogFooter>
          <Button
            disabled={isLoading || !slug.trim() || !name.trim()}
            onClick={() =>
              onCreate({
                slug: slug.trim(),
                name: name.trim(),
                permissions: selected.size > 0 ? [...selected] : undefined,
              })
            }
          >
            Create role
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
