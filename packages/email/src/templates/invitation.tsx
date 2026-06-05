import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";
import { siteConfig } from "@config";

import { renderEmailTemplate } from "../render.server";

export type InvitationTemplateInput = {
  inviteUrl: string;
  inviterName: string;
  invitedEmail: string;
  roleLabel: string;
  expiresInDays?: number;
};

export function InvitationEmail({
  inviteUrl,
  inviterName,
  invitedEmail,
  roleLabel,
  expiresInDays = 7,
}: InvitationTemplateInput) {
  return (
    <Html>
      <Head />
      <Preview>{`Invitation: Join ${siteConfig.name} as ${roleLabel}`}</Preview>
      <Tailwind>
        <Body className="m-0 bg-gray-100 p-0 text-gray-900">
          <Container className="my-6 overflow-hidden rounded-[14px] border border-gray-200 bg-white">
            <Section className="bg-slate-900 px-[30px] py-[26px]">
              <Text className="m-0 text-[20px] font-bold leading-[1.2] text-gray-50">
                {siteConfig.name}
              </Text>
            </Section>

            <Section className="px-[30px] py-[30px]">
              <Heading className="m-0 mb-3 text-[24px] leading-[1.3] text-slate-900">
                {`You are invited to join ${siteConfig.name}`}
              </Heading>
              <Text className="m-0 mb-[14px] text-[16px] leading-[1.55] text-slate-700">
                Hello,
              </Text>
              <Text className="m-0 mb-[14px] text-[16px] leading-[1.55] text-slate-700">
                <strong>{inviterName}</strong> invited <strong>{invitedEmail}</strong> to
                join the workspace as <strong>{roleLabel}</strong>.
              </Text>

              <Section className="my-5 rounded-[10px] border border-slate-200 bg-slate-50 px-4 py-[14px]">
                <Text className="m-0 mb-[6px] text-[14px] leading-[1.5] text-slate-700">
                  <span className="inline-block min-w-[68px] text-slate-500">Role:</span>{" "}
                  {roleLabel}
                </Text>
                <Text className="m-0 mb-[6px] text-[14px] leading-[1.5] text-slate-700">
                  <span className="inline-block min-w-[68px] text-slate-500">Email:</span>{" "}
                  {invitedEmail}
                </Text>
                <Text className="m-0 text-[14px] leading-[1.5] text-slate-700">
                  <span className="inline-block min-w-[68px] text-slate-500">
                    Expires:
                  </span>{" "}
                  This invitation expires in {expiresInDays} days.
                </Text>
              </Section>

              <Text className="m-0 mb-[14px] text-[16px] leading-[1.55] text-slate-700">
                Click the button below to accept this invitation and complete account
                setup.
              </Text>

              <Section className="my-[26px] text-center">
                <Button
                  href={inviteUrl}
                  className="rounded-[8px] bg-gray-900 px-6 py-3 text-[15px] font-semibold text-white no-underline"
                >
                  Accept Invitation
                </Button>
              </Section>

              <Section className="mt-[22px] rounded-[8px] border border-dashed border-slate-300 bg-slate-50 p-3">
                <Text className="m-0 mb-2 text-[13px] leading-[1.5] text-slate-600">
                  If the button does not work, copy and paste this URL into your browser:
                </Text>
                <Text className="m-0 break-all text-[13px] leading-[1.4] text-slate-900">
                  {inviteUrl}
                </Text>
              </Section>

              <Text className="m-0 mt-[18px] text-[14px] leading-[1.55] text-slate-600">
                If you did not expect this invitation, you can safely ignore this email.
              </Text>
            </Section>

            <Hr className="m-0 border-gray-200" />
            <Section className="px-[30px] pb-[22px] pt-[18px] text-center">
              <Text className="m-0 text-[13px] leading-[1.4] text-slate-400">
                {`© ${new Date().getFullYear()} ${siteConfig.name}. All rights reserved.`}
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

InvitationEmail.PreviewProps = {
  inviteUrl: "https://example.com/accept-invitation?id=inv_123",
  inviterName: "A team member",
  invitedEmail: "invitee@example.com",
  roleLabel: "User",
  expiresInDays: 7,
} satisfies InvitationTemplateInput;

export const invitationTemplate = async (input: InvitationTemplateInput) =>
  renderEmailTemplate(<InvitationEmail {...input} />);

export default InvitationEmail;
