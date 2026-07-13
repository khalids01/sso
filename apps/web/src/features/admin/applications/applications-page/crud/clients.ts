import { client } from "@/lib/client";
import type { CreateApplicationClientInput } from "../../schema";
import type { ApplicationClient } from "../../types";

export type CreateClientInput = {
  applicationId: string;
  payload: CreateApplicationClientInput;
};

export type UpdateClientInput = CreateClientInput & { clientId: string };

export async function createClient(input: CreateClientInput) {
  const { data, error } = await client.admin
    .applications({ id: input.applicationId })
    .clients.post(input.payload);
  if (error) throw error;
  return data as ApplicationClient;
}

export async function updateClient(input: UpdateClientInput) {
  const { data, error } = await client.admin
    .applications({ id: input.applicationId })
    .clients({ clientId: input.clientId })
    .patch(input.payload);
  if (error) throw error;
  return data as ApplicationClient;
}
