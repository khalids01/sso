import { EllipsisVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { AdminApplication, ApplicationClient } from "../../types";
import type { LifecycleFilter, PendingAction } from "../page-types";

export function ClientActionsMenu(props: {
  application: AdminApplication;
  client: ApplicationClient;
  filter: LifecycleFilter;
  onView: () => void;
  onEdit: () => void;
  onLifecycle: (action: PendingAction) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon-sm">
            <EllipsisVertical className="h-4 w-4" />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onClick={props.onView}>View</DropdownMenuItem>
        <DropdownMenuItem onClick={props.onEdit}>Edit</DropdownMenuItem>
        <DropdownMenuSeparator />
        {props.filter === "current" ? (
          <DropdownMenuItem
            variant="destructive"
            onClick={() =>
              props.onLifecycle({
                type: "archive-client",
                application: props.application,
                client: props.client,
              })
            }
          >
            Archive
          </DropdownMenuItem>
        ) : (
          <>
            <DropdownMenuItem
              onClick={() =>
                props.onLifecycle({
                  type: "restore-client",
                  application: props.application,
                  client: props.client,
                })
              }
            >
              Restore
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onClick={() =>
                props.onLifecycle({
                  type: "delete-client",
                  application: props.application,
                  client: props.client,
                })
              }
            >
              Permanent delete
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
