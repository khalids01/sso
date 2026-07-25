import { ShieldCheck, FileCheck, Lock, Trash2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { BRANDING } from "@/constants/branding";

export const SecurityCompliance = () => {
  return (
    <section id="security" className="py-24 bg-background border-t border-border/40 text-left">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            Security & OAuth Data Protection
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-foreground">
            Strict Standards for User Data & Identity
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg">
            Clear controls and disclosures explain how identity data is
            requested, protected, retained, and deleted.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Card 1 */}
          <div className="p-7 rounded-2xl border border-border/80 bg-card space-y-4 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <FileCheck className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-foreground">
              Limited Google Profile Access
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Google OAuth profile scopes (
              {BRANDING.google.scopes.map((scope, index) => (
                <span key={scope}>
                  {index > 0 ? ", " : null}
                  <code>{scope}</code>
                </span>
              ))}
              ) are used only for
              account creation, identity verification, and sign-in. This data
              is never sold or used for advertising.
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
            <h3 className="text-lg font-bold text-foreground">
              Account and Provider Revocation
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Dedicated self-service account deletion and provider revocation
              instructions give users control over connected identity data.
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
            <h3 className="text-lg font-bold text-foreground">
              No Advertising Data Sharing
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Personal profile data is protected in transit and is not sold,
              monetized, or disclosed to advertising networks.
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
