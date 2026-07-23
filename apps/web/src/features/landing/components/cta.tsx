import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { ArrowRight, ShieldCheck } from "lucide-react";

export const CTA = () => {
  return (
    <section className="py-24 bg-background border-t border-border/40 relative overflow-hidden text-left">
      <div className="container mx-auto px-4 max-w-5xl relative">
        <div className="p-10 md:p-16 rounded-3xl bg-gradient-to-b from-card via-card to-muted/40 border border-border/80 shadow-xl text-center space-y-8 relative overflow-hidden">
          {/* Subtle Background Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
            <ShieldCheck className="w-4 h-4" />
            Centralized Identity Management
          </div>

          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-foreground max-w-3xl mx-auto leading-tight">
            Ready to Sign In to Your Applications?
          </h2>

          <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            Access all connected services seamlessly with your single SSO account.
          </p>

          <div className="flex items-center justify-center pt-2">
            <Link to="/login">
              <Button size="lg" className="rounded-xl px-8 h-13 text-base font-semibold shadow-lg shadow-primary/20 gap-2 cursor-pointer">
                Sign In to SSO <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};
