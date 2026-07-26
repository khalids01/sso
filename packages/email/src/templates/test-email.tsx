import {
  Body,
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

export function TestEmail({ connectionName }: { connectionName: string }) {
  return (
    <Html>
      <Head />
      <Preview>{`${connectionName} is ready to send email`}</Preview>
      <Tailwind>
        <Body className="m-0 bg-slate-100 p-0 text-slate-900">
          <Container className="my-8 overflow-hidden rounded-[16px] border border-slate-200 bg-white">
            <Section className="bg-slate-950 px-8 py-6">
              <Text className="m-0 text-[20px] font-bold text-white">
                {siteConfig.name}
              </Text>
            </Section>
            <Section className="px-8 py-8">
              <div className="mb-5 inline-block rounded-full bg-emerald-100 px-3 py-1 text-[12px] font-semibold text-emerald-800">
                Connection successful
              </div>
              <Heading className="m-0 text-[25px] leading-[1.3] text-slate-950">
                Your email connection is working
              </Heading>
              <Text className="mb-0 mt-4 text-[15px] leading-[1.65] text-slate-600">
                This message was delivered successfully through{" "}
                <strong>{connectionName}</strong>. It is ready to be assigned to
                applications for authentication email delivery.
              </Text>
              <Section className="mt-6 rounded-[10px] border border-slate-200 bg-slate-50 px-4 py-3">
                <Text className="m-0 text-[13px] text-slate-600">
                  No further action is required. You can return to Email Manager
                  and finish configuring your application.
                </Text>
              </Section>
            </Section>
            <Hr className="m-0 border-slate-200" />
            <Section className="px-8 py-5 text-center">
              <Text className="m-0 text-[12px] text-slate-400">
                {`Sent by ${siteConfig.name} Email Manager`}
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

TestEmail.PreviewProps = {
  connectionName: "Primary transactional email",
};

export const testEmailTemplate = async (connectionName: string) =>
  renderEmailTemplate(<TestEmail connectionName={connectionName} />);

export default TestEmail;
