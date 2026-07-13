import type {
  AdminApplication,
  ApplicationClient,
  ApplicationMember,
} from "../types";

export type LifecycleFilter = "current" | "archived";
export type MemberFilter = "current" | "revoked";

export type PendingAction =
  | { type: "archive-application"; application: AdminApplication }
  | { type: "restore-application"; application: AdminApplication }
  | { type: "delete-application"; application: AdminApplication }
  | {
      type: "archive-client";
      application: AdminApplication;
      client: ApplicationClient;
    }
  | {
      type: "restore-client";
      application: AdminApplication;
      client: ApplicationClient;
    }
  | {
      type: "delete-client";
      application: AdminApplication;
      client: ApplicationClient;
    }
  | {
      type: "suspend-member";
      application: AdminApplication;
      member: ApplicationMember;
    }
  | {
      type: "restore-member";
      application: AdminApplication;
      member: ApplicationMember;
    }
  | {
      type: "revoke-member";
      application: AdminApplication;
      member: ApplicationMember;
    }
  | {
      type: "delete-member";
      application: AdminApplication;
      member: ApplicationMember;
    };
