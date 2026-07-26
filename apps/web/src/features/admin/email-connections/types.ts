export type EmailProviderId = "resend" | "nodemailer";
export type EmailConnectionStatus = "active" | "disabled" | "archived";
export type EmailConnectionOption = {
  id: string;
  name: string;
  provider: EmailProviderId;
  status: EmailConnectionStatus;
};
export type EmailConnection = EmailConnectionOption & {
  fromName: string;
  fromAddress: string;
  replyToAddress: string | null;
  smtpHost: string | null;
  smtpPort: number | null;
  smtpSecure: boolean | null;
  smtpUsername: string | null;
  credentialVersion: number;
  applicationCount: number;
  createdAt: string;
  updatedAt: string;
};
