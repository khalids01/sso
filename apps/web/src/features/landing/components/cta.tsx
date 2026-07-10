import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

export const CTA = () => {
  return (
    <section className="py-24 container mx-auto px-4">
      <div className="bg-primary rounded-[3rem] p-12 md:p-24 text-center text-primary-foreground relative overflow-hidden shadow-2xl">
        {/* Decorative circles */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl" />

        <div className="relative z-10 max-w-3xl mx-auto">
          <h2 className="text-4xl md:text-6xl font-bold mb-8 tracking-tight">
            Ready to centralize access?
          </h2>
          <p className="text-primary-foreground/80 text-lg md:text-xl mb-12">
            Bring authentication, admin controls, and application access into
            one SSO control plane.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/login">
              <Button
                size="lg"
                variant="secondary"
                className="rounded-full px-10 h-14 text-lg font-bold w-full sm:w-auto transition-transform hover:scale-105 cursor-pointer"
              >
                Open SSO
              </Button>
            </Link>
            <Link to="/login">
              <Button
                size="lg"
                variant="outline"
                className="rounded-full px-10 h-14 text-lg font-bold border-primary-foreground/20 hover:bg-white/10 w-full sm:w-auto cursor-pointer"
              >
                Sign in today <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
          <p className="mt-8 text-sm text-primary-foreground/60 italic">
            No credit card required. Cancel anytime.
          </p>
        </div>
      </div>
    </section>
  );
};
