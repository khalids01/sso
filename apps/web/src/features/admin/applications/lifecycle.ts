import type { QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "@/constants/query-keys";
import { client } from "@/lib/client";
import type { PendingAction } from "./page-types";
import { getMutationErrorMessage } from "./mutation-error";

export function lifecycleCopy(action: PendingAction) {
  const name =
    "client" in action
      ? action.client.name
      : "member" in action
        ? action.member.user.email
        : action.application.name;
  const noun =
    "client" in action
      ? "client"
      : "member" in action
        ? "member"
        : "application";

  if (action.type.startsWith("suspend")) {
    return {
      title: `Suspend ${noun}`,
      description: `${name} will stay in Current but will not be allowed to access this application.`,
      actionLabel: "Suspend",
      destructive: false,
    };
  }

  if (action.type.startsWith("revoke")) {
    return {
      title: `Revoke ${noun}`,
      description: `${name} will move to Revoked and will not be allowed to access this application.`,
      actionLabel: "Revoke",
      destructive: true,
    };
  }

  if (action.type.startsWith("archive")) {
    return {
      title: `Archive ${noun}`,
      description: `${name} will move to Archived and can be restored later.`,
      actionLabel: "Archive",
      destructive: true,
    };
  }

  if (action.type.startsWith("restore")) {
    return {
      title: `Restore ${noun}`,
      description: `${name} will move back to Current with active status.`,
      actionLabel: "Restore",
      destructive: false,
    };
  }

  return {
    title: `Permanently delete ${noun}`,
    description: `${name} will be permanently deleted. This cannot be undone.`,
    actionLabel: "Permanent delete",
    destructive: true,
  };
}

export function lifecycleSuccessMessage(action: PendingAction) {
  if (action.type.startsWith("suspend")) return "Suspended";
  if (action.type.startsWith("revoke")) return "Revoked";
  if (action.type.startsWith("archive")) return "Archived";
  if (action.type.startsWith("restore")) return "Restored";
  return "Permanently deleted";
}

export async function runLifecycleAction(action: PendingAction) {
  if (action.type === "archive-application") {
    const response = await client.admin
      .applications({ id: action.application.id })
      .archive.post();
    if (response.error) throw response.error;
    return response.data;
  }

  if (action.type === "restore-application") {
    const response = await client.admin
      .applications({ id: action.application.id })
      .restore.post();
    if (response.error) throw response.error;
    return response.data;
  }

  if (action.type === "delete-application") {
    const response = await client.admin
      .applications({ id: action.application.id })
      .delete();
    if (response.error) throw response.error;
    return response.data;
  }

  if (action.type === "archive-client") {
    const response = await client.admin
      .applications({ id: action.application.id })
      .clients({ clientId: action.client.id })
      .archive.post();
    if (response.error) throw response.error;
    return response.data;
  }

  if (action.type === "restore-client") {
    const response = await client.admin
      .applications({ id: action.application.id })
      .clients({ clientId: action.client.id })
      .restore.post();
    if (response.error) throw response.error;
    return response.data;
  }

  if (action.type === "suspend-member") {
    const response = await client.admin
      .applications({ id: action.application.id })
      .members({ memberId: action.member.id })
      .suspend.post();
    if (response.error) throw response.error;
    return response.data;
  }

  if (action.type === "restore-member") {
    const response = await client.admin
      .applications({ id: action.application.id })
      .members({ memberId: action.member.id })
      .restore.post();
    if (response.error) throw response.error;
    return response.data;
  }

  if (action.type === "revoke-member") {
    const response = await client.admin
      .applications({ id: action.application.id })
      .members({ memberId: action.member.id })
      .revoke.post();
    if (response.error) throw response.error;
    return response.data;
  }

  if (action.type === "delete-member") {
    const response = await client.admin
      .applications({ id: action.application.id })
      .members({ memberId: action.member.id })
      .delete();
    if (response.error) throw response.error;
    return response.data;
  }

  const response = await client.admin
    .applications({ id: action.application.id })
    .clients({ clientId: action.client.id })
    .delete();
  if (response.error) throw response.error;
  return response.data;
}

export function invalidateApplicationClients(
  queryClient: QueryClient,
  applicationId: string,
) {
  queryClient.invalidateQueries({
    queryKey: queryKeys.admin.applications.clientsRoot(applicationId),
  });
}

export function invalidateApplicationMembers(
  queryClient: QueryClient,
  applicationId: string,
) {
  queryClient.invalidateQueries({
    queryKey: queryKeys.admin.applications.membersRoot(applicationId),
  });
}

export function showMutationError(fallback: string) {
  return (error: unknown) => {
    toast.error(getMutationErrorMessage(error, fallback));
  };
}
