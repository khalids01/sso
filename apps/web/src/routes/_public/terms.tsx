import { createFileRoute } from "@tanstack/react-router";
import { LandingNav } from "@/features/landing/components/landing-nav";
import { Footer } from "@/features/landing/components/footer";
import { FileText, ShieldAlert, CheckSquare, Scale, Mail } from "lucide-react";
import { BRANDING, BRAND_SUPPORT_MAILTO } from "@/constants/branding";

export const Route = createFileRoute("/_public/terms")({
  head: () => ({
    meta: [
      {
        title: `Terms of Service | ${BRANDING.appName}`,
      },
      {
        name: "description",
        content:
          `Terms governing use of the ${BRANDING.appName} account and single sign-on service.`,
      },
    ],
    links: [
      {
        rel: "canonical",
        href: BRANDING.urls.terms,
      },
    ],
  }),
  component: TermsOfServicePage,
});

function TermsOfServicePage() {
  const lastUpdated = "July 25, 2026";

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <LandingNav />
      <main className="flex-grow pt-28 pb-20">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Header */}
          <div className="border-b border-border pb-8 mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-4">
              <FileText className="w-3.5 h-3.5" />
              Terms & Conditions
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4">
              {BRANDING.appName} Terms of Service
            </h1>
            <p className="text-muted-foreground text-sm">
              Last updated: <span className="font-medium text-foreground">{lastUpdated}</span>
            </p>
          </div>

          {/* Quick Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="bg-muted/50 border border-border p-5 rounded-xl">
              <CheckSquare className="w-6 h-6 text-primary mb-3" />
              <h3 className="font-bold mb-1 text-base">Service Access</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Centralized Single Sign-On and Access Control platform for web and mobile applications.
              </p>
            </div>
            <div className="bg-muted/50 border border-border p-5 rounded-xl">
              <ShieldAlert className="w-6 h-6 text-primary mb-3" />
              <h3 className="font-bold mb-1 text-base">Acceptable Use</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Prohibits account sharing, credential stuffing, automated abuse, or unauthorized exploitation.
              </p>
            </div>
            <div className="bg-muted/50 border border-border p-5 rounded-xl">
              <Scale className="w-6 h-6 text-primary mb-3" />
              <h3 className="font-bold mb-1 text-base">Legal Agreement</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Binding terms governing service availability, liability limits, and governance.
              </p>
            </div>
          </div>

          {/* Detailed Sections */}
          <div className="space-y-10 text-sm md:text-base leading-relaxed text-muted-foreground">
            {/* Section 1 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-foreground">1. Acceptance of Terms</h2>
              <p>
                By creating an account, signing in via password, magic link, or
                an OAuth provider, or using{" "}
                <strong>{BRANDING.appName}</strong>, the account and single
                sign-on service operated by {BRANDING.operatorName}
                (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;), you agree to
                these Terms of Service (&quot;Terms&quot;).
              </p>
              <p>
                If you are entering into these Terms on behalf of an organization or business entity, you represent that you have the authority to bind such entity to these Terms.
              </p>
            </section>

            {/* Section 2 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-foreground">2. Description of Service</h2>
              <p>
                {BRANDING.appName} provides account authentication, single
                sign-on, session management, user directory management, and
                access control for connected applications.
              </p>
            </section>

            {/* Section 3 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-foreground">3. User Account Security & Responsibilities</h2>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>Account Confidentiality:</strong> You are responsible for maintaining the confidentiality of your authentication credentials, multi-factor tokens, and session credentials.</li>
                <li><strong>Accurate Information:</strong> You agree to provide accurate and complete email and profile information when registering or signing in.</li>
                <li><strong>Unauthorized Activity:</strong> You must immediately notify {BRANDING.appName} support of unauthorized use of your account or a suspected security breach.</li>
              </ul>
            </section>

            {/* Section 4 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-foreground">4. Acceptable Use Policy</h2>
              <p>When accessing or using {BRANDING.appName}, you agree NOT to:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>Attempt to bypass, disable, or tamper with authentication protocols, rate limiters, or access control checks.</li>
                <li>Perform automated credential stuffing, brute-force login attacks, or vulnerability scanning without prior written authorization.</li>
                <li>Impersonate any individual, organization, or OAuth provider entity.</li>
                <li>Use {BRANDING.appName} for illegal activities, distributing malware, or sending unauthorized spam or phishing communications.</li>
              </ul>
            </section>

            {/* Section 5 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-foreground">5. Third-Party OAuth Integrations</h2>
              <p>
                {BRANDING.appName} integrates with third-party identity
                providers including Google, GitHub, Meta, and LinkedIn. Your
                use of a provider is also subject to that provider&apos;s
                terms. {BRANDING.operatorName} is not responsible for outages,
                scope changes, or account actions initiated by an external
                provider.
              </p>
            </section>

            {/* Section 6 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-foreground">6. Termination & Account Suspension</h2>
              <p>
                We reserve the right to suspend or terminate access to{" "}
                {BRANDING.appName} for conduct that violates these Terms,
                compromises service security, or creates legal liability for{" "}
                {BRANDING.operatorName} or connected applications.
              </p>
            </section>

            {/* Section 7 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-foreground">7. Disclaimer of Warranties & Limitation of Liability</h2>
              <p>
                {BRANDING.appName.toUpperCase()} IS PROVIDED ON AN &quot;AS
                IS&quot; AND &quot;AS AVAILABLE&quot; BASIS WITHOUT WARRANTIES
                OF ANY KIND, WHETHER EXPRESS OR IMPLIED. TO THE MAXIMUM EXTENT
                PERMITTED BY APPLICABLE LAW,{" "}
                {BRANDING.operatorName.toUpperCase()} SHALL NOT BE LIABLE FOR
                INDIRECT, INCIDENTAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES
                RESULTING FROM SERVICE INTERRUPTIONS, LOSS OF DATA, OR
                UNAUTHORIZED ACCESS.
              </p>
            </section>

            {/* Section 8 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-foreground">8. Changes to Terms</h2>
              <p>
                We may modify these Terms by posting an updated version on this
                page with a revised &quot;Last updated&quot; date. Continued use
                of {BRANDING.appName} after an update constitutes acceptance of
                the updated Terms.
              </p>
            </section>

            {/* Section 9 */}
            <section className="space-y-3 border-t border-border pt-8">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Mail className="w-5 h-5 text-primary" />
                9. Contact Information
              </h2>
              <p>
                For questions regarding these Terms of Service, please contact:
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
