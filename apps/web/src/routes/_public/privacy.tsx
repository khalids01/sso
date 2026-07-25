import { createFileRoute } from "@tanstack/react-router";
import { LandingNav } from "@/features/landing/components/landing-nav";
import { Footer } from "@/features/landing/components/footer";
import { Shield, Lock, Eye, CheckCircle, Mail, Server } from "lucide-react";
import { BRANDING, BRAND_SUPPORT_MAILTO } from "@/constants/branding";

export const Route = createFileRoute("/_public/privacy")({
  head: () => ({
    meta: [
      {
        title: `Privacy Policy | ${BRANDING.appName}`,
      },
      {
        name: "description",
        content:
          `How ${BRANDING.appName} accesses, uses, stores, shares, and deletes account and Google Sign-In data.`,
      },
    ],
    links: [
      {
        rel: "canonical",
        href: BRANDING.urls.privacy,
      },
    ],
  }),
  component: PrivacyPolicyPage,
});

function PrivacyPolicyPage() {
  const lastUpdated = "July 25, 2026";

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <LandingNav />
      <main className="flex-grow pt-28 pb-20">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Header */}
          <div className="border-b border-border pb-8 mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-4">
              <Shield className="w-3.5 h-3.5" />
              Legal & Privacy Compliance
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4">
              {BRANDING.appName} Privacy Policy
            </h1>
            <p className="text-muted-foreground text-sm">
              Last updated: <span className="font-medium text-foreground">{lastUpdated}</span>
            </p>
          </div>

          {/* Quick Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="bg-muted/50 border border-border p-5 rounded-xl">
              <Lock className="w-6 h-6 text-primary mb-3" />
              <h3 className="font-bold mb-1 text-base">Data Protection</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Your personal data is encrypted in transit and at rest using industry-standard protocols.
              </p>
            </div>
            <div className="bg-muted/50 border border-border p-5 rounded-xl">
              <Eye className="w-6 h-6 text-primary mb-3" />
              <h3 className="font-bold mb-1 text-base">No Data Selling</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                We never sell, monetize, or share your profile data with third-party advertisers.
              </p>
            </div>
            <div className="bg-muted/50 border border-border p-5 rounded-xl">
              <Server className="w-6 h-6 text-primary mb-3" />
              <h3 className="font-bold mb-1 text-base">OAuth Compliance</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Strict adherence to Google, Meta, GitHub, and LinkedIn developer API privacy guidelines.
              </p>
            </div>
          </div>

          {/* Detailed Sections */}
          <div className="space-y-10 text-sm md:text-base leading-relaxed text-muted-foreground">
            {/* Section 1 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-foreground">1. Introduction & Service Scope</h2>
              <p>
                This Privacy Policy explains how{" "}
                <strong>{BRANDING.appName}</strong>, the account and single
                sign-on service operated by {BRANDING.operatorName}
                (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;), collects,
                uses, stores, and protects personal data when you use the
                service and its connected applications.
              </p>
              <p>
                By signing in to {BRANDING.appName} via email, magic link, or a
                third-party OAuth provider such as Google, GitHub, Meta, or
                LinkedIn, you acknowledge the data practices described in this
                policy.
              </p>
            </section>

            {/* Section 2 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-foreground">2. Information We Collect</h2>
              <p>We only collect data that is strictly necessary for providing secure authentication and access management services:</p>
              
              <div className="bg-card border border-border rounded-lg p-4 space-y-3">
                <h3 className="font-semibold text-foreground text-sm">A. Profile & Account Information</h3>
                <ul className="list-disc pl-5 space-y-1 text-xs md:text-sm">
                  <li><strong>Full Name & Email Address:</strong> Used as primary account identifiers and for authentication notifications.</li>
                  <li><strong>Profile Picture URL:</strong> Provided by your chosen OAuth provider to display your avatar.</li>
                  <li><strong>OAuth Provider Identifiers:</strong> Unique identifiers assigned by Google, GitHub, Meta, or LinkedIn to pair your provider login with your {BRANDING.appName} account.</li>
                  <li><strong>OAuth Profile Payload:</strong> The basic profile response returned under the approved identity scopes is stored for account synchronization, support, and security auditing.</li>
                </ul>
              </div>

              <div className="bg-card border border-border rounded-lg p-4 space-y-3">
                <h3 className="font-semibold text-foreground text-sm">B. Technical & System Logs</h3>
                <ul className="list-disc pl-5 space-y-1 text-xs md:text-sm">
                  <li><strong>IP Address & User-Agent:</strong> Logged for security auditing, anomaly detection, rate-limiting, and preventing unauthorized access.</li>
                  <li><strong>Session Tokens & Cookies:</strong> Encrypted secure session tokens required to maintain active logins across authorized client applications.</li>
                </ul>
              </div>
            </section>

            {/* Section 3 - Google API Compliance */}
            <section className="space-y-3 bg-primary/5 border border-primary/20 p-6 rounded-xl text-foreground">
              <div className="flex items-center gap-2 font-bold text-lg text-primary">
                <CheckCircle className="w-5 h-5" />
                Google API Services User Data Policy Disclosure
              </div>
              <p className="text-sm">
                {BRANDING.appName}&apos;s use and transfer to any other app of
                information received from Google APIs will adhere to the{" "}
                <a 
                  href="https://developers.google.com/terms/api-services-user-data-policy" 
                  target="_blank" 
                  rel="noreferrer"
                  className="underline text-primary hover:opacity-80 font-medium"
                >
                  Google API Services User Data Policy
                </a>, including the Limited Use requirements.
              </p>
              <ul className="list-disc pl-5 space-y-2 text-xs md:text-sm text-muted-foreground">
                <li>
                  We request only the basic Google scopes{" "}
                  {BRANDING.google.scopes.map((scope, index) => (
                    <span key={scope}>
                      {index > 0
                        ? index === BRANDING.google.scopes.length - 1
                          ? ", and "
                          : ", "
                        : null}
                      <code>{scope}</code>
                    </span>
                  ))}
                  . These provide your{" "}
                  {BRANDING.google.dataFields.join(", ")}.
                </li>
                <li>We use Google user data only to create or match an account, verify identity, keep profile details synchronized, and sign users in to connected applications.</li>
                <li>We do not request access to Gmail, Google Drive, Google Calendar, contacts, or other Google content.</li>
                <li>Google user data is <strong>never</strong> transferred to advertising networks or used for advertising, commercial profiling, or marketing purposes.</li>
                <li>Google user data is <strong>never</strong> used for training machine learning or AI models.</li>
              </ul>
            </section>

            {/* Section 4 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-foreground">3. How We Use Your Information</h2>
              <p>Your data is processed strictly for the following operational purposes:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>To authenticate your identity across applications connected to {BRANDING.appName}.</li>
                <li>To enforce enterprise access control, role-based permissions (RBAC), and session security.</li>
                <li>To send critical authentication emails (e.g., email verification codes, password resets, magic sign-in links).</li>
                <li>To audit security logs and detect fraudulent or unauthorized login attempts.</li>
              </ul>
            </section>

            {/* Section 5 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-foreground">4. Data Retention & Security</h2>
              <p>
                We implement robust administrative, physical, and technical security controls to safeguard your personal data:
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>Encryption:</strong> Data transmitted between your browser, {BRANDING.appName}, and connected applications is protected using HTTPS/TLS. Passwords are cryptographically hashed.</li>
                <li><strong>Session Expiration:</strong> Active authentication tokens automatically expire after inactivity and can be revoked immediately via your account settings.</li>
                <li><strong>Retention Period:</strong> Personal information is retained only as long as your account remains active. Upon account deletion, all personal profile records are permanently purged from our database.</li>
              </ul>
            </section>

            {/* Section 6 - User Rights & Data Deletion */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-foreground">5. Your Rights & Data Deletion</h2>
              <p>
                You have full control over your personal data under applicable data privacy regulations (including GDPR and CCPA):
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>Access & Export:</strong> You can view or request a copy of the profile data stored in your {BRANDING.appName} account.</li>
                <li><strong>Revoking OAuth Access:</strong> You can revoke {BRANDING.appName}&apos;s access at any time through your Google, GitHub, Meta, or LinkedIn account settings.</li>
                <li><strong>Account & Data Deletion:</strong> You can permanently delete your {BRANDING.appName} account and associated data by following the instructions on our <a href="/data-deletion" className="text-primary underline font-medium">Data Deletion Instructions</a> page or by contacting us.</li>
              </ul>
            </section>

            {/* Section 7 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-foreground">6. Third-Party OAuth Providers</h2>
              <p>
                {BRANDING.appName} supports authentication through external
                identity providers. Each provider operates under its own
                privacy policy:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-xs md:text-sm">
                <li><strong>Google:</strong> <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer" className="text-primary underline">Google Privacy Policy</a></li>
                <li><strong>GitHub:</strong> <a href="https://docs.github.com/en/site-policy/privacy-policies/github-privacy-statement" target="_blank" rel="noreferrer" className="text-primary underline">GitHub Privacy Statement</a></li>
                <li><strong>Meta / Facebook:</strong> <a href="https://www.facebook.com/privacy/policy/" target="_blank" rel="noreferrer" className="text-primary underline">Meta Privacy Policy</a></li>
                <li><strong>LinkedIn:</strong> <a href="https://www.linkedin.com/legal/privacy-policy" target="_blank" rel="noreferrer" className="text-primary underline">LinkedIn Privacy Policy</a></li>
              </ul>
            </section>

            {/* Section 8 */}
            <section className="space-y-3 border-t border-border pt-8">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Mail className="w-5 h-5 text-primary" />
                7. Contact Us
              </h2>
              <p>
                If you have any questions, concerns, or requests regarding this
                Privacy Policy or your personal data, contact:
              </p>
              <div className="bg-muted p-4 rounded-lg text-foreground font-mono text-sm space-y-1">
                <p><strong>{BRANDING.appName} Support</strong></p>
                <p>
                  Email:{" "}
                  <a
                    href={BRAND_SUPPORT_MAILTO}
                    className="text-primary underline"
                  >
                    {BRANDING.supportEmail}
                  </a>
                </p>
              </div>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
