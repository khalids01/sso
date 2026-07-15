import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { queryKeys } from "@/constants/query-keys";
import { cn } from "@/lib/utils";
import { ApplicationManagementHeader } from "../components/application-management-header";
import type { ApplicationMember } from "../types";
import { LifecycleConfirmDialog } from "../components/lifecycle-confirm-dialog";
import { MemberSegmentedFilter } from "../components/ui-controls";
import {
  ApplicationRequestError,
  getApplication,
} from "../crud/applications";
import { grantMember } from "../crud/members";
import {
  invalidateApplicationMembers,
  lifecycleSuccessMessage,
  runLifecycleAction,
  showMutationError,
} from "../lifecycle";
import type {
  MemberFilter,
  PendingAction,
} from "../page-types";
import { ApplicationMembersList } from "./components/application-members-list";
import { GrantAccessDialog } from "./components/grant-access-dialog";
import { MemberViewDialog } from "./components/member-view-dialog";

export function ApplicationMembersPage({
  applicationId,
}: {
  applicationId: string;
}) {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<MemberFilter>("current");
  const [grantOpen, setGrantOpen] = useState(false);
  const [viewMember, setViewMember] = useState<ApplicationMember | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  const applicationQuery = useQuery({
    queryKey: queryKeys.admin.applications.detail(applicationId),
    queryFn: () => getApplication(applicationId),
  });

  const application = applicationQuery.data;
  const isArchived = application?.status === "archived";

  const grantMutation = useMutation({
    mutationFn: grantMember,
    onSuccess: (_member, input) => {
      toast.success("Application access granted");
      invalidateApplicationMembers(queryClient, input.applicationId);
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.applications.all(),
      });
      setGrantOpen(false);
    },
    onError: showMutationError("Failed to grant access"),
  });

  const lifecycleMutation = useMutation({
    mutationFn: runLifecycleAction,
    onSuccess: (_result, action) => {
      toast.success(lifecycleSuccessMessage(action));
      invalidateApplicationMembers(queryClient, action.application.id);
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.applications.all(),
      });
      setPendingAction(null);
    },
    onError: showMutationError("Action failed"),
  });

  if (applicationQuery.isLoading) {
    return <ApplicationPageState message="Loading application..." />;
  }

  if (applicationQuery.isError || !application) {
    const notFound =
      applicationQuery.error instanceof ApplicationRequestError &&
      applicationQuery.error.status === 404;
    return (
      <ApplicationPageState
        destructive
        message={notFound ? "Application not found." : "Failed to load application."}
      />
    );
  }

  return (
    <div className="space-y-6">
      <ApplicationManagementHeader application={application} section="members" />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Members</h2>
          <p className="text-sm text-muted-foreground">
            Users allowed to sign in to this application.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <MemberSegmentedFilter value={filter} onChange={setFilter} />
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() =>
              queryClient.invalidateQueries({
                queryKey: queryKeys.admin.applications.membersRoot(application.id),
              })
            }
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Button
            size="sm"
            className="gap-2"
            disabled={isArchived}
            onClick={() => setGrantOpen(true)}
          >
            <UserPlus className="h-4 w-4" />
            Grant access
          </Button>
        </div>
      </div>

      {isArchived ? (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/5 px-4 py-3 text-sm text-muted-foreground">
          This application is archived. Granting access is disabled, but
          lifecycle cleanup actions remain available.
        </div>
      ) : null}

      <ApplicationMembersList
        application={application}
        filter={filter}
        onView={setViewMember}
        onLifecycle={setPendingAction}
      />

      <GrantAccessDialog
        application={grantOpen ? application : null}
        isLoading={grantMutation.isPending}
        onOpenChange={setGrantOpen}
        onGrant={(userId) =>
          grantMutation.mutate({ applicationId: application.id, userId })
        }
      />
      <MemberViewDialog
        member={viewMember}
        onOpenChange={(open) => !open && setViewMember(null)}
      />
      <LifecycleConfirmDialog
        action={pendingAction}
        isLoading={lifecycleMutation.isPending}
        onOpenChange={(open) => !open && setPendingAction(null)}
        onConfirm={() => {
          if (pendingAction) lifecycleMutation.mutate(pendingAction);
        }}
      />
    </div>
  );
}

function ApplicationPageState({
  message,
  destructive = false,
}: {
  message: string;
  destructive?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-md border px-6 py-12 text-center text-sm text-muted-foreground",
        destructive && "text-destructive",
      )}
    >
      {message}
    </div>
  );
}
