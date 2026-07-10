import nodemailer from "nodemailer";
import { env } from "../../env/src/env.server";

export const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT ? parseInt(env.SMTP_PORT) : 587,
  secure: env.SMTP_PORT === "465",
  auth:
    env.EMAIL && env.EMAIL_PASSWORD
      ? {
          user: env.EMAIL,
          pass: env.EMAIL_PASSWORD,
        }
      : undefined,
  logger: env.NODE_ENV !== "production",
  debug: env.NODE_ENV !== "production",
});

export const sendEmail = async ({
  to,
  subject,
  html,
  text,
  from,
}: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
}) => {
  const fromName = env.EMAIL_FROM || "SSO";
  const fromAddress =
    from ?? (env.EMAIL ? `${fromName} <${env.EMAIL}>` : fromName);

  try {
    const info = await transporter.sendMail({
      from: fromAddress,
      to,
      subject,
      html,
      text,
    });
    console.log("Message sent: %s", info.messageId);
    return info;
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
};
