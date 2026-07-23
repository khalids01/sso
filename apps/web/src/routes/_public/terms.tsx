import { createFileRoute } from "@tanstack/react-router";
import { LandingNav } from "@/features/landing/components/landing-nav";
import { Footer } from "@/features/landing/components/footer";
import { FileText, ShieldAlert, CheckSquare, Scale, Mail } from "lucide-react";

export const Route = createFileRoute("/_public/terms")({
  component: TermsOfServicePage,
});

function TermsOfServicePage() {
  const lastUpdated = "July 23, 2026";

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
              Terms of Service
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
                By creating an account, signing in via password, magic link, or OAuth social providers, or using any services provided by <strong>SSO</strong> (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;), you agree to be bound by these Terms of Service (&quot;Terms&quot;).
              </p>
              <p>
                If you are entering into these Terms on behalf of an organization or business entity, you represent that you have the authority to bind such entity to these Terms.
              </p>
            </section>

            {/* Section 2 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-foreground">2. Description of Service</h2>
              <p>
                SSO is a centralized Identity and Access Management (IAM) platform providing Single Sign-On, authentication token delegation, user directory management, multi-tenant application administration, and role-based access control (RBAC).
              </p>
            </section>

            {/* Section 3 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-foreground">3. User Account Security & Responsibilities</h2>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>Account Confidentiality:</strong> You are responsible for maintaining the confidentiality of your authentication credentials, multi-factor tokens, and session credentials.</li>
                <li><strong>Accurate Information:</strong> You agree to provide accurate and complete email and profile information when registering or signing in.</li>
                <li><strong>Unauthorized Activity:</strong> You must immediately notify SSO administrators of any unauthorized use of your account or any security breaches.</li>
              </ul>
            </section>

            {/* Section 4 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-foreground">4. Acceptable Use Policy</h2>
              <p>When accessing or using SSO, you agree NOT to:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>Attempt to bypass, disable, or tamper with authentication protocols, rate limiters, or access control checks.</li>
                <li>Perform automated credential stuffing, brute-force login attacks, or vulnerability scanning without prior written authorization.</li>
                <li>Impersonate any individual, organization, or OAuth provider entity.</li>
                <li>Use SSO for illegal activities, distributing malware, or sending unauthorized spam/phishing communications.</li>
              </ul>
            </section>

            {/* Section 5 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-foreground">5. Third-Party OAuth Integrations</h2>
              <p>
                SSO integrates with third-party identity providers including Google, GitHub, Meta (Facebook), and LinkedIn. Your use of third-party login mechanisms is subject to the respective terms and service conditions of those identity providers. SSO is not responsible for service outages, scope changes, or account suspensions initiated by external OAuth providers.
              </p>
            </section>

            {/* Section 6 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-foreground">6. Termination & Account Suspension</h2>
              <p>
                We reserve the right to suspend or terminate access to SSO at any time, with or without notice, for conduct that violates these Terms, compromises platform security, or creates legal liability for SSO or its client applications.
              </p>
            </section>

            {/* Section 7 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-foreground">7. Disclaimer of Warranties & Limitation of Liability</h2>
              <p>
                THE SSO SERVICE IS PROVIDED ON AN &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; BASIS WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS OR IMPLIED. TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, SSO SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES RESULTING FROM SERVICE INTERRUPTIONS, LOSS OF DATA, OR UNAUTHORIZED ACCESS.
              </p>
            </section>

            {/* Section 8 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-foreground">8. Changes to Terms</h2>
              <p>
                We reserve the right to modify these Terms at any time. Updated versions will be posted on this page with a revised &quot;Last updated&quot; date. Continued use of SSO after modifications constitutes acceptance of the updated Terms.
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
                <p><strong>SSO Legal Team</strong></p>
                <p>Email: legal@sso.local (or your designated legal/support address)</p>
              </div>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
