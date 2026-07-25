export const BRANDING = {
  appName: "SkyCanvas Studio Identity",
  operatorName: "SkyCanvas Studio",
  supportEmail: "khalidk8774@gmail.com",
  description:
    "The secure account and single sign-on service operated by SkyCanvas Studio for its connected applications.",
  urls: {
    homepage: "https://sso.skycanvasstudio.com",
    privacy: "https://sso.skycanvasstudio.com/privacy",
    terms: "https://sso.skycanvasstudio.com/terms",
    dataDeletion: "https://sso.skycanvasstudio.com/data-deletion",
  },
  google: {
    scopes: ["openid", "email", "profile"],
    dataFields: [
      "Google account identifier",
      "name",
      "email address",
      "profile picture",
    ],
  },
} as const;

export const BRAND_SUPPORT_MAILTO = `mailto:${BRANDING.supportEmail}`;
