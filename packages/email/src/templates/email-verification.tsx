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
import { siteConfig } from "@sso/config";
import { renderEmailTemplate } from "../render.server";

type EmailVerificationProps = { url: string };

export function EmailVerification({ url }: EmailVerificationProps) {
  return (
    <Html>
      <Head />
      <Preview>{`Verify your email for ${siteConfig.name}`}</Preview>
      <Tailwind>
        <Body className="m-0 bg-slate-100 p-0 text-slate-900">
          <Container className="my-8 overflow-hidden rounded-[16px] border border-slate-200 bg-white">
            <Section className="bg-emerald-950 px-8 py-6">
              <Text className="m-0 text-[20px] font-bold text-white">
                {siteConfig.name}
              </Text>
              <Text className="m-0 mt-1 text-[13px] text-emerald-200">
                Email verification
              </Text>
            </Section>
            <Section className="px-8 py-8">
              <Heading className="m-0 text-[26px] leading-[1.25] text-slate-950">
                Confirm your email address
              </Heading>
              <Text className="mb-0 mt-4 text-[15px] leading-[1.65] text-slate-600">
                Verify this email address to complete account setup and protect
                access to connected applications.
              </Text>
              <Section className="my-7 text-center">
                <Button
                  href={url}
                  className="rounded-[9px] bg-emerald-700 px-7 py-[13px] text-[15px] font-semibold text-white no-underline"
                >
                  Verify email address
                </Button>
              </Section>
              <Section className="rounded-[10px] border border-emerald-100 bg-emerald-50 px-4 py-3">
                <Text className="m-0 text-[13px] leading-[1.55] text-emerald-900">
                  This verification link is tied to your account. Do not forward
                  it or share it with anyone.
                </Text>
              </Section>
              <Text className="mb-0 mt-5 text-[13px] leading-[1.55] text-slate-500">
                If you did not create or sign in to an account, no action is
                required.
              </Text>
            </Section>
            <Hr className="m-0 border-slate-200" />
            <Section className="px-8 py-5 text-center">
              <Text className="m-0 text-[12px] text-slate-400">
                {`© ${new Date().getFullYear()} ${siteConfig.name}. All rights reserved.`}
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

EmailVerification.PreviewProps = {
  url: "https://example.com/api/auth/verify-email?token=example",
} satisfies EmailVerificationProps;

export const emailVerificationTemplate = async (url: string) =>
  renderEmailTemplate(<EmailVerification url={url} />);

export default EmailVerification;
