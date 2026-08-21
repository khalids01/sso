import { client } from "@/lib/client";
import type {
  ApplicationWebhookDelivery,
  ApplicationWebhookEndpoint,
  ApplicationWebhookEndpointUpdate,
  UserWebhookEventType,
} from "../types";

export async function getWebhookEndpoint(applicationId: string) {
  const { data, error } = await client.admin
    .applications({ id: applicationId })
    .webhooks.get();
  if (error) throw error;
  return data as ApplicationWebhookEndpoint | null;
}

export async function updateWebhookEndpoint(input: {
  applicationId: string;
  url: string;
  enabled: boolean;
  subscribedEvents: UserWebhookEventType[];
  rotateSecret?: boolean;
}) {
  const { data, error } = await client.admin
    .applications({ id: input.applicationId })
    .webhooks.put({
      url: input.url,
      enabled: input.enabled,
      subscribedEvents: input.subscribedEvents,
      rotateSecret: input.rotateSecret,
    });
  if (error) throw error;
  return data as ApplicationWebhookEndpointUpdate;
}

export async function listWebhookDeliveries(applicationId: string) {
  const { data, error } = await client.admin
    .applications({ id: applicationId })
    .webhooks.deliveries.get({ query: { limit: 25 } });
  if (error) throw error;
  return data as ApplicationWebhookDelivery[];
}
