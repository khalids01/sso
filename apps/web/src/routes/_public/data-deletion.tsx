import { createFileRoute } from "@tanstack/react-router";
import { LandingNav } from "@/features/landing/components/landing-nav";
import { Footer } from "@/features/landing/components/footer";
import { Trash2, ShieldCheck, ExternalLink, Mail, UserX, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_public/data-deletion")({
  component: DataDeletionPage,
});

function DataDeletionPage() {
  const lastUpdated = "July 23, 2026";

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <LandingNav />
      <main className="flex-grow pt-28 pb-20">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Header */}
          <div className="border-b border-border pb-8 mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-destructive/10 text-destructive text-xs font-semibold mb-4">
              <Trash2 className="w-3.5 h-3.5" />
              Data Privacy & Account Removal
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4">
              User Data Deletion Instructions
            </h1>
            <p className="text-muted-foreground text-sm">
              Last updated: <span className="font-medium text-foreground">{lastUpdated}</span>
            </p>
          </div>

          <p className="text-base text-muted-foreground mb-8 leading-relaxed">
            In compliance with <strong>Google OAuth Developer Policies</strong>, <strong>Meta (Facebook) Data Deletion Requirements</strong>, and global privacy standards (GDPR/CCPA), <strong>SSO</strong> provides clear, simple methods for users to delete their account data and revoke third-party permissions at any time.
          </p>

          {/* Option 1: Self Service */}
          <div className="bg-card border border-border rounded-xl p-6 mb-8 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <UserX className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">Option 1: Self-Service Account Deletion</h2>
                <p className="text-xs text-muted-foreground">Immediate deletion via your SSO dashboard</p>
              </div>
            </div>

            <ol className="list-decimal pl-6 space-y-2 text-sm text-muted-foreground">
              <li>Log in to your <strong>SSO Account</strong> dashboard.</li>
              <li>Navigate to <strong>Account Settings</strong> (or visit <code>/account</code>).</li>
              <li>Scroll down to the <strong>Danger Zone</strong> section.</li>
              <li>Click <strong>Delete Account & Data</strong> and confirm your password or magic link verification.</li>
            </ol>

            <div className="pt-2">
              <a href="/login">
                <Button variant="outline" size="sm" className="gap-2">
                  Go to Account Settings <ExternalLink className="w-3.5 h-3.5" />
                </Button>
              </a>
            </div>
          </div>

          {/* Option 2: Revoking Third-Party OAuth Access */}
          <div className="bg-card border border-border rounded-xl p-6 mb-8 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">Option 2: Revoking Access via OAuth Identity Providers</h2>
                <p className="text-xs text-muted-foreground">Remove SSO permissions directly from provider settings</p>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              If you authenticated using a third-party social provider, you can revoke access directly through their platform:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {/* Google */}
              <div className="border border-border p-4 rounded-lg bg-muted/30 space-y-2">
                <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span> Google Account
                </h3>
                <p className="text-xs text-muted-foreground">
                  Go to your Google Security settings under &quot;Third-party apps with account access&quot;, locate <strong>SSO</strong>, and click &quot;Remove Access&quot;.
                </p>
                <a 
                  href="https://myaccount.google.com/permissions" 
                  target="_blank" 
                  rel="noreferrer"
                  className="text-xs text-primary underline font-medium inline-flex items-center gap-1"
                >
                  Google Security Settings <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {/* Facebook / Meta */}
              <div className="border border-border p-4 rounded-lg bg-muted/30 space-y-2">
                <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-600"></span> Facebook / Meta Account
                </h3>
                <p className="text-xs text-muted-foreground">
                  Go to Facebook Settings & Privacy &gt; Settings &gt; Apps and Websites &gt; Select <strong>SSO</strong> &gt; Click &quot;Remove&quot;.
                </p>
                <a 
                  href="https://www.facebook.com/settings?tab=applications" 
                  target="_blank" 
                  rel="noreferrer"
                  className="text-xs text-primary underline font-medium inline-flex items-center gap-1"
                >
                  Facebook Apps Settings <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {/* GitHub */}
              <div className="border border-border p-4 rounded-lg bg-muted/30 space-y-2">
                <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-slate-700"></span> GitHub Account
                </h3>
                <p className="text-xs text-muted-foreground">
                  Go to GitHub Settings &gt; Applications &gt; Authorized OAuth Apps &gt; Find <strong>SSO</strong> &gt; Click &quot;Revoke&quot;.
                </p>
                <a 
                  href="https://github.com/settings/applications" 
                  target="_blank" 
                  rel="noreferrer"
                  className="text-xs text-primary underline font-medium inline-flex items-center gap-1"
                >
                  GitHub Applications <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {/* LinkedIn */}
              <div className="border border-border p-4 rounded-lg bg-muted/30 space-y-2">
                <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-700"></span> LinkedIn Account
                </h3>
                <p className="text-xs text-muted-foreground">
                  Go to LinkedIn Settings & Privacy &gt; Data Privacy &gt; Other Applications &gt; Permitted Services &gt; Remove <strong>SSO</strong>.
                </p>
                <a 
                  href="https://www.linkedin.com/psettings/permitted-services" 
                  target="_blank" 
                  rel="noreferrer"
                  className="text-xs text-primary underline font-medium inline-flex items-center gap-1"
                >
                  LinkedIn Permitted Services <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>

          {/* Option 3: Manual Support Request */}
          <div className="bg-card border border-border rounded-xl p-6 mb-10 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Mail className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">Option 3: Support Data Purge Request</h2>
                <p className="text-xs text-muted-foreground">Email request for complete deletion</p>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              If you are unable to access your account or wish to request full deletion of all backup logs and database records associated with your email, email our privacy administrator:
            </p>

            <div className="bg-muted p-4 rounded-lg text-foreground font-mono text-sm space-y-1">
              <p><strong>To:</strong> privacy@sso.local (or your support email)</p>
              <p><strong>Subject:</strong> Data Deletion Request - [Your Registered Email]</p>
              <p><strong>Body:</strong> Please delete my SSO account and all associated profile data.</p>
            </div>

            <p className="text-xs text-muted-foreground">
              Support data deletion requests are processed within <strong>48 to 72 hours</strong>. Confirmation will be sent upon completion.
            </p>
          </div>

          {/* Data Retained / Purged Summary */}
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-5 space-y-2 text-sm text-amber-900 dark:text-amber-200">
            <div className="flex items-center gap-2 font-bold text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-4 h-4" />
              What Happens Upon Deletion?
            </div>
            <ul className="list-disc pl-5 space-y-1 text-xs md:text-sm opacity-90">
              <li>All user profile records, names, avatars, and linked OAuth tokens are permanently removed from the database.</li>
              <li>Active session cookies across all connected applications are invalidated immediately.</li>
              <li>This action is permanent and cannot be undone.</li>
            </ul>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
