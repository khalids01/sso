import { client } from "@/lib/client";
import type { AdminApplication, ApplicationStatus } from "../../types";

export type UpdateApplicationInput = {
  id: string;
  payload: {
    name?: string;
    slug?: string;
    description?: string;
    status?: ApplicationStatus;
  };
};

export async function createApplication(input: {
  name: string;
  slug?: string;
  description?: string;
  status: ApplicationStatus;
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
