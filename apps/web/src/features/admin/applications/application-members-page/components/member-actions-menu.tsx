import { EllipsisVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { AdminApplication, ApplicationMember } from "../../types";
import type { MemberFilter, PendingAction } from "../../page-types";

export function MemberActionsMenu(props: {
  application: AdminApplication;
  member: ApplicationMember;
  filter: MemberFilter;
  canManage: boolean;
  onView: () => void;
  onLifecycle: (action: PendingAction) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon-sm">
            <span className="sr-only">Actions for {props.member.user.email}</span>
            <EllipsisVertical className="h-4 w-4" />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onClick={props.onView}>View</DropdownMenuItem>
        {props.canManage ? <DropdownMenuSeparator /> : null}
        {props.canManage && props.filter === "current" ? (
          <>
            {props.member.status === "active" ? (
              <DropdownMenuItem
                onClick={() =>
                  props.onLifecycle({
                    type: "suspend-member",
                    application: props.application,
                    member: props.member,
                  })
                }
              >
                Suspend
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                onClick={() =>
                  props.onLifecycle({
                    type: "restore-member",
                    application: props.application,
                    member: props.member,
                  })
                }
              >
                Restore
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              variant="destructive"
              onClick={() =>
                props.onLifecycle({
                  type: "revoke-member",
                  application: props.application,
                  member: props.member,
                })
              }
            >
              Revoke
            </DropdownMenuItem>
          </>
        ) : props.canManage ? (
          <>
            <DropdownMenuItem
              onClick={() =>
                props.onLifecycle({
                  type: "restore-member",
                  application: props.application,
                  member: props.member,
                })
              }
            >
              Restore
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onClick={() =>
                props.onLifecycle({
                  type: "delete-member",
                  application: props.application,
                  member: props.member,
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
