import {
  Body,
  Button,
  Container,
  Head,
  Html,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";

import { renderEmailTemplate } from "../render.server";

type EmailVerificationProps = {
  url: string;
};

export function EmailVerification({ url }: EmailVerificationProps) {
  return (
    <Html>
      <Head />
      <Preview>Verify your SSO email address</Preview>
      <Tailwind>
        <Body className="m-0 bg-gray-100 p-0 text-gray-800">
          <Container className="my-10 rounded-lg border border-gray-200 bg-white px-10 py-10">
            <Text className="m-0 mb-6 text-center text-2xl font-bold text-black">
              SSO
            </Text>
            <Section className="mb-4">
              <Text className="m-0 mb-3 text-base leading-[1.6] text-gray-800">
                Verify your email address to finish signing in to the application.
              </Text>
            </Section>
            <Section className="my-5 mb-8 text-center">
              <Button
                href={url}
                className="rounded-md bg-black px-6 py-3 text-sm font-semibold text-white no-underline"
              >
                Verify email
              </Button>
            </Section>
            <Text className="m-0 text-center text-xs leading-[1.4] text-gray-500">
              If you didn&apos;t request this email, you can safely ignore it.
            </Text>
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
