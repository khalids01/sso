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

type MagicLinkEmailProps = { url: string };

export function MagicLinkEmail({ url }: MagicLinkEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{`Your secure sign-in link for ${siteConfig.name}`}</Preview>
      <Tailwind>
        <Body className="m-0 bg-slate-100 p-0 text-slate-900">
          <Container className="my-8 overflow-hidden rounded-[16px] border border-slate-200 bg-white">
            <Section className="bg-slate-950 px-8 py-6">
              <Text className="m-0 text-[20px] font-bold text-white">
                {siteConfig.name}
              </Text>
              <Text className="m-0 mt-1 text-[13px] text-slate-300">
                Secure account access
              </Text>
            </Section>
            <Section className="px-8 py-8">
              <Heading className="m-0 text-[26px] leading-[1.25] text-slate-950">
                Sign in to your account
              </Heading>
              <Text className="mb-0 mt-4 text-[15px] leading-[1.65] text-slate-600">
                Use the secure button below to finish signing in. This link is
                personal, can only be used once, and expires shortly.
              </Text>
              <Section className="my-7 text-center">
                <Button
                  href={url}
                  className="rounded-[9px] bg-slate-950 px-7 py-[13px] text-[15px] font-semibold text-white no-underline"
                >
                  Sign in securely
                </Button>
              </Section>
              <Section className="rounded-[10px] border border-slate-200 bg-slate-50 px-4 py-3">
                <Text className="m-0 text-[13px] leading-[1.55] text-slate-500">
                  If the button does not work, copy this link into your browser:
                </Text>
                <Text className="m-0 mt-2 break-all text-[12px] leading-[1.5] text-slate-800">
                  {url}
                </Text>
              </Section>
              <Text className="mb-0 mt-5 text-[13px] leading-[1.55] text-slate-500">
                Didn&apos;t request this? You can safely ignore this message.
                Your account remains secure.
              </Text>
            </Section>
            <Hr className="m-0 border-slate-200" />
            <Section className="px-8 py-5 text-center">
              <Text className="m-0 text-[12px] text-slate-400">
                {`© ${new Date().getFullYear()} ${siteConfig.name}. Security notifications are sent automatically.`}
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

MagicLinkEmail.PreviewProps = {
  url: "https://example.com/auth/magic-link?token=example",
} satisfies MagicLinkEmailProps;

export const magicLinkTemplate = async (url: string) =>
  renderEmailTemplate(<MagicLinkEmail url={url} />);

export default MagicLinkEmail;
