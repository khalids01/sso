import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2 } from "lucide-react";

export const Hero = () => {
  return (
    <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-500/10 blur-[120px]" />
      </div>

      <div className="container mx-auto px-4 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted border border-border text-xs font-medium mb-6 animate-in fade-in slide-in-from-bottom-3 duration-500">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
          </span>
          Centralized Access Control
        </div>

        <h1 className="text-4xl md:text-7xl font-extrabold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/70 leading-tight">
          Manage Identity And <br />
          Access From One Place
        </h1>

        <p className="max-w-2xl mx-auto text-muted-foreground text-lg md:text-xl mb-10 animate-in fade-in slide-in-from-bottom-5 duration-700 delay-100">
          Centralized identity, access control, and SSO management for internal
          and customer-facing applications.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-5 duration-700 delay-200">
          <Link to="/login">
            <Button
              size="lg"
              className="rounded-full px-8 h-12 text-base font-semibold cursor-pointer"
            >
              Open SSO <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Link to="/login">
            <Button
              size="lg"
              variant="outline"
              className="rounded-full px-8 h-12 text-base font-semibold cursor-pointer"
            >
              View Dashboard
            </Button>
          </Link>
        </div>

        <div className="mt-16 flex flex-wrap justify-center gap-x-8 gap-y-4 text-sm text-muted-foreground animate-in fade-in duration-1000 delay-500">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span>TanStack Start + Router</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span>Better Auth + Prisma</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span>RBAC + Admin Controls</span>
          </div>
        </div>

        <div className="mt-20 relative max-w-5xl mx-auto border border-border rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-1000 delay-300">
          <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent z-10 opacity-20" />
          <img
            src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=2426&ixlib=rb-4.0.3"
            alt="Dashboard Preview"
            className="w-full h-auto grayscale-[0.2] hover:grayscale-0 transition-all duration-700"
          />
        </div>
      </div>
    </section>
  );
};
