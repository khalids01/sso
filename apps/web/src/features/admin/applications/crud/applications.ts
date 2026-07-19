import { client } from "@/lib/client";
import type { AdminApplication, ApplicationAuthMethod, ApplicationRegistrationMode, ApplicationStatus } from "../types";

export type UpdateApplicationInput = {
  id: string;
  payload: {
    name?: string;
    slug?: string;
    description?: string;
    status?: ApplicationStatus;
    signInMethods?: ApplicationAuthMethod[];
    signUpMethods?: Array<"magic_link">;
    registrationMode?: ApplicationRegistrationMode;
  };
};

export class ApplicationRequestError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "ApplicationRequestError";
  }
}

export async function getApplication(id: string) {
  const { data, error } = await client.admin.applications({ id }).get();
  if (error) {
    throw new ApplicationRequestError(
      "Failed to load application",
      "status" in error ? Number(error.status) : undefined,
    );
  }
  return data as AdminApplication;
}

export async function createApplication(input: {
  name: string;
  slug?: string;
  description?: string;
  status: ApplicationStatus;
  signInMethods: ApplicationAuthMethod[];
  signUpMethods: Array<"magic_link">;
  registrationMode: ApplicationRegistrationMode;
}) {
  const { data, error } = await client.admin.applications.post(input);
  if (error) throw error;
  return data as AdminApplication;
}

export async function updateApplication(input: UpdateApplicationInput) {
  const { data, error } = await client.admin
    .applications({ id: input.id })
    .patch(input.payload);
  if (error) throw error;
  return data as AdminApplication;
}
