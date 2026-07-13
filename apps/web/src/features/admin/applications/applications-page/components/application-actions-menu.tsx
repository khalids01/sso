import { EllipsisVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { AdminApplication } from "../../types";
import type { LifecycleFilter, PendingAction } from "../page-types";

export function ApplicationActionsMenu(props: {
  application: AdminApplication;
  filter: LifecycleFilter;
  onView: () => void;
  onEdit: () => void;
  onCreateClient: () => void;
  onLifecycle: (action: PendingAction) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={(event) => event.stopPropagation()}
          >
            <EllipsisVertical className="h-4 w-4" />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={props.onView}>View</DropdownMenuItem>
        <DropdownMenuItem onClick={props.onEdit}>Edit</DropdownMenuItem>
        {props.filter === "current" ? (
          <>
            <DropdownMenuItem onClick={props.onCreateClient}>
              Create new client
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() =>
                props.onLifecycle({
                  type: "archive-application",
                  application: props.application,
                })
              }
            >
              Archive
            </DropdownMenuItem>
          </>
        ) : (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() =>
                props.onLifecycle({
                  type: "restore-application",
                  application: props.application,
                })
              }
            >
              Restore
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onClick={() =>
                props.onLifecycle({
                  type: "delete-application",
                  application: props.application,
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
