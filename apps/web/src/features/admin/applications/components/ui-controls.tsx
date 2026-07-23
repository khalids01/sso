import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ApplicationMemberStatus, ApplicationStatus } from "../types";
import type { LifecycleFilter, MemberFilter } from "../page-types";

const statusVariant: Record<
  ApplicationStatus | ApplicationMemberStatus,
  "default" | "secondary" | "destructive"
> = {
  active: "default",
  disabled: "secondary",
  archived: "destructive",
  suspended: "secondary",
  revoked: "destructive",
};

export function SegmentedFilter({
  value,
  onChange,
}: {
  value: LifecycleFilter;
  onChange: (value: LifecycleFilter) => void;
}) {
  return (
    <div className="inline-flex rounded-md border bg-background p-1">
      <Button
        type="button"
        size="sm"
        variant={value === "current" ? "secondary" : "ghost"}
        onClick={() => onChange("current")}
      >
        Current
      </Button>
      <Button
        type="button"
        size="sm"
        variant={value === "archived" ? "secondary" : "ghost"}
        onClick={() => onChange("archived")}
      >
        Archived
      </Button>
    </div>
  );
}

export function MemberSegmentedFilter({
  value,
  onChange,
}: {
  value: MemberFilter;
  onChange: (value: MemberFilter) => void;
}) {
  return (
    <div className="inline-flex rounded-md border bg-background p-1">
      <Button
        type="button"
        size="sm"
        variant={value === "current" ? "secondary" : "ghost"}
        onClick={() => onChange("current")}
      >
        Current
      </Button>
      <Button
        type="button"
        size="sm"
        variant={value === "revoked" ? "secondary" : "ghost"}
        onClick={() => onChange("revoked")}
      >
        Revoked
      </Button>
    </div>
  );
}

export function StatusBadge({ status }: { status: ApplicationStatus }) {
  return <Badge variant={statusVariant[status]}>{status}</Badge>;
}

export function MemberStatusBadge({
  status,
}: {
  status: ApplicationMemberStatus;
}) {
  return <Badge variant={statusVariant[status]}>{status}</Badge>;
}

export function UrlList({ items }: { items: string[] }) {
  if (items.length === 0) {
    return (
      <span className="text-sm text-muted-foreground">No redirect URIs</span>
    );
  }

  return (
    <div className="grid gap-1">
      {items.slice(0, 2).map((item) => (
        <code key={item} className="break-all text-xs">
          {item}
        </code>
      ))}
      {items.length > 2 ? (
        <span className="text-xs text-muted-foreground">
          +{items.length - 2} more
        </span>
      ) : null}
    </div>
  );
}
