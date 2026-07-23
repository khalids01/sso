import { ShieldCheck, FileCheck, Lock, Eye, AlertCircle, Trash2 } from "lucide-react";
import { Link } from "@tanstack/react-router";

export const SecurityCompliance = () => {
  return (
    <section id="security" className="py-24 bg-background border-t border-border/40 text-left">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            Enterprise Security & OAuth Compliance
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-foreground">
            Strict Standards for User Data & Identity
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg">
            Built from the ground up to pass OAuth app verification and satisfy strict data protection regulations.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Card 1 */}
          <div className="p-7 rounded-2xl border border-border/80 bg-card space-y-4 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <FileCheck className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-foreground">Google Limited Use Compliant</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Fully compliant with Google API Services User Data Policy. OAuth profile scopes (<code>openid</code>, <code>profile</code>, <code>email</code>) are strictly used for identity verification and never sold or shared.
            </p>
            <div className="pt-2">
              <Link to="/privacy" className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1">
                Read Privacy Policy →
              </Link>
            </div>
          </div>

          {/* Card 2 */}
          <div className="p-7 rounded-2xl border border-border/80 bg-card space-y-4 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
              <Trash2 className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-foreground">Meta Data Deletion Callback</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Provides dedicated self-service data deletion and provider revocation workflows satisfying Meta Developers, GitHub, and LinkedIn App Review guidelines.
            </p>
            <div className="pt-2">
              <Link to="/data-deletion" className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1">
                View Data Deletion Steps →
              </Link>
            </div>
          </div>

          {/* Card 3 */}
          <div className="p-7 rounded-2xl border border-border/80 bg-card space-y-4 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-foreground">Zero Third-Party Data Sharing</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Your identity directory belongs exclusively to your platform. Personal profile data is encrypted in transit via TLS 1.3 and never monetized or exposed to ad networks.
            </p>
            <div className="pt-2">
              <Link to="/terms" className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1">
                Read Terms of Service →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
