import { Badge } from "@/components/ui/badge";

export type UserAuthMethod = {
  id: string;
  label: string;
  oauthConnection: {
    id: string;
    name: string;
    provider: string;
  } | null;
};

export function AuthMethodBadges({ methods }: { methods: UserAuthMethod[] }) {
  if (methods.length === 0) {
    return <span className="text-xs text-muted-foreground">Not recorded</span>;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {methods.map((method) => (
        <Badge
          key={`${method.id}:${method.oauthConnection?.id ?? "default"}`}
          variant="outline"
          title={
            method.oauthConnection
              ? `${method.label} via ${method.oauthConnection.name}`
              : method.label
          }
        >
          {method.label}
        </Badge>
      ))}
    </div>
  );
}
