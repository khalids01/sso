import { client } from "@/lib/client";
import type { ApplicationMember } from "../types";

export type GrantMemberInput = {
  applicationId: string;
  userId: string;
};

export async function grantMember(input: GrantMemberInput) {
  const { data, error } = await client.admin
    .applications({ id: input.applicationId })
    .members.post({ userId: input.userId });
  if (error) throw error;
  return data as ApplicationMember;
}

export async function inviteApplicationMember(input: {
  applicationId: string;
  email: string;
}) {
  const { data, error } = await client.admin
    .applications({ id: input.applicationId })
    .invitations.post({ email: input.email, expiresInDays: 7 });
  if (error) throw error;
  return data;
}
