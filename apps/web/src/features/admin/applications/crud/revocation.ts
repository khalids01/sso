import { client } from "@/lib/client";
import type {
  ApplicationRevocationDelivery,
  ApplicationRevocationEndpoint,
} from "../types";

export async function getRevocationEndpoint(applicationId: string) {
  const { data, error } = await client.admin
    .applications({ id: applicationId })
    .revocation.get();
  if (error) throw error;
  return data as ApplicationRevocationEndpoint | null;
}

export async function updateRevocationEndpoint(input: {
  applicationId: string;
  url: string;
  enabled: boolean;
}) {
  const { data, error } = await client.admin
    .applications({ id: input.applicationId })
    .revocation.put({ url: input.url, enabled: input.enabled });
  if (error) throw error;
  return data as ApplicationRevocationEndpoint;
}

export async function listRevocationDeliveries(applicationId: string) {
  const { data, error } = await client.admin
    .applications({ id: applicationId })
    .revocation.deliveries.get({ query: { limit: 25 } });
  if (error) throw error;
  return data as ApplicationRevocationDelivery[];
}

export async function retryRevocationDelivery(input: {
  applicationId: string;
  deliveryId: string;
}) {
  const { data, error } = await client.admin
    .applications({ id: input.applicationId })
    .revocation.deliveries({ deliveryId: input.deliveryId })
    .retry.post();
  if (error) throw error;
  return data;
}
