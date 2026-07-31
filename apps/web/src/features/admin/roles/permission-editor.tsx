import { useMemo } from "react";
import { permissionGroup, type Permission } from "@sso/rbac";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import type { PermissionCatalogEntry } from "./types";

type PermissionEditorProps = {
  catalog: PermissionCatalogEntry[];
  selected: Set<string>;
  onToggle: (permission: string, checked: boolean) => void;
  disabled?: boolean;
  size?: "default" | "lg";
};

export function PermissionEditor({
  catalog,
  selected,
  onToggle,
  disabled = false,
  size = "default",
}: PermissionEditorProps) {
  const isLarge = size === "lg";

  const grouped = useMemo(() => {
    const groups = new Map<string, PermissionCatalogEntry[]>();

    for (const entry of catalog) {
      const group = entry.group ?? permissionGroup(entry.name as Permission);
      const existing = groups.get(group) ?? [];
      existing.push(entry);
      groups.set(group, existing);
    }

    return [...groups.entries()].sort(([left], [right]) => left.localeCompare(right));
  }, [catalog]);

  return (
    <Accordion defaultValue={grouped.map(([group]) => group)}>
      {grouped.map(([group, permissions]) => (
        <AccordionItem key={group} value={group}>
          <AccordionTrigger
            className={cn(isLarge && "text-base font-medium")}
          >
            {group}
          </AccordionTrigger>
          <AccordionContent>
            <FieldGroup className="gap-3">
              {permissions.map((permission) => {
                const checked = selected.has(permission.name);

                return (
                  <Field key={permission.name} orientation="horizontal">
                    <Checkbox
                      id={permission.name}
                      checked={checked}
                      disabled={disabled}
                      onCheckedChange={(value) =>
                        onToggle(permission.name, value === true)
                      }
                    />
                    <FieldLabel
                      htmlFor={permission.name}
                      className={cn("font-normal", isLarge && "text-base")}
                    >
                      <span
                        className={cn(
                          "font-medium",
                          isLarge && "text-base font-medium",
                        )}
                      >
                        {permission.name}
                      </span>
                      {permission.description ? (
                        <span
                          className={cn(
                            "block text-muted-foreground",
                            isLarge ? "text-sm" : "text-xs",
                          )}
                        >
                          {permission.description}
                        </span>
                      ) : null}
                    </FieldLabel>
                  </Field>
                );
              })}
            </FieldGroup>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
