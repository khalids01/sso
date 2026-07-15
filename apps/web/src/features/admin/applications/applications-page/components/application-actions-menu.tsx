import { EllipsisVertical } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { AdminApplication } from "../../types";
import type { LifecycleFilter, PendingAction } from "../../page-types";

export function ApplicationActionsMenu(props: {
  application: AdminApplication;
  filter: LifecycleFilter;
  canManage: boolean;
  onView: () => void;
  onEdit: () => void;
  onLifecycle: (action: PendingAction) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Actions for ${props.application.name}`}
            onClick={(event) => event.stopPropagation()}
          >
            <EllipsisVertical className="h-4 w-4" />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={props.onView}>View</DropdownMenuItem>
        {props.canManage ? (
          <DropdownMenuItem onClick={props.onEdit}>Edit</DropdownMenuItem>
        ) : null}
        <DropdownMenuItem
          render={
            <Link
              to="/admin/applications/$applicationId/clients"
              params={{ applicationId: props.application.id }}
            />
          }
        >
          Manage clients
        </DropdownMenuItem>
        <DropdownMenuItem
          render={
            <Link
              to="/admin/applications/$applicationId/members"
              params={{ applicationId: props.application.id }}
            />
          }
        >
          Manage members
        </DropdownMenuItem>
        {props.canManage && props.filter === "current" ? (
          <>
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
        ) : props.canManage ? (
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
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
