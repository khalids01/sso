import { client } from "@/lib/client";
import type {
  OAuthConnection,
  OAuthConnectionInput,
} from "./types";

const oauthConnections = client.admin["oauth-connections"];

export async function createOAuthConnection(input: OAuthConnectionInput) {
  const { data, error } = await oauthConnections.post(input);
  if (error) throw error;
  return data as OAuthConnection;
}

export async function updateOAuthConnection(input: {
  id: string;
  payload: Partial<Omit<OAuthConnectionInput, "provider">>;
}) {
  const { data, error } = await oauthConnections({ id: input.id }).patch(
    input.payload,
  );
  if (error) throw error;
  return data as OAuthConnection;
}

export async function revealOAuthConnectionSecret(id: string) {
  const { data, error } = await oauthConnections({ id }).secret.get();
  if (error) throw error;
  return (data as { clientSecret: string }).clientSecret;
}

export async function runOAuthConnectionLifecycle(input: {
  id: string;
  action: "archive" | "restore" | "delete";
}) {
  const endpoint = oauthConnections({ id: input.id });
  if (input.action === "archive") {
    const { data, error } = await endpoint.archive.post();
    if (error) throw error;
    return data;
  }
  if (input.action === "restore") {
    const { data, error } = await endpoint.restore.post();
    if (error) throw error;
    return data;
  }
  const { data, error } = await endpoint.permanent.delete();
  if (error) throw error;
  return data;
}
