import { Badge } from "@/components/ui/badge";
import { useHydrated } from "@/hooks/use-hydrated";
import {
  useAuthMethodStore,
  type RememberedAuthMethod,
} from "./auth-method-store";

export function LastUsedBadge({ method }: { method: RememberedAuthMethod }) {
  const hydrated = useHydrated();
  const lastUsedMethod = useAuthMethodStore((state) => state.lastUsedMethod);

  if (!hydrated || lastUsedMethod !== method) return null;

  return (
    <Badge variant="secondary" className="text-[10px] font-normal">
      Last used
    </Badge>
  );
}
