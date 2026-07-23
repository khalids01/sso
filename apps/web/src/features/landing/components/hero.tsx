import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import type { CSSProperties } from "react";
import { ArrowRight, Shield, Lock, Key, CheckCircle2, UserCheck, Sparkles } from "lucide-react";

const particles = Array.from({ length: 72 }, (_, index) => {
  const random = (salt: number) => {
    const value = Math.sin((index + 1) * (salt + 17) * 78.233) * 43758.5453;
    return value - Math.floor(value);
  };

  const left = random(1) * 100;
  const inwardDrift = (50 - left) * 0.45;

  return {
    left: `${left}%`,
    size: `${0.8 + random(2) * 2.2}px`,
    duration: `${11 + random(3) * 17}s`,
    delay: `${-(random(4) * 28)}s`,
    drift: `${inwardDrift - 18 + random(5) * 36}vw`,
    opacity: 0.16 + random(6) * 0.3,
  };
});

export const Hero = () => {
  return (
    <section className="relative pt-24 pb-20 md:pt-36 md:pb-28 overflow-hidden bg-background">
      {/* Background Subtle Gradient, Grid & Particles */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[10%] left-[25%] w-[450px] h-[450px] rounded-full bg-primary/10 blur-[130px] opacity-60 dark:opacity-40" />
        <div className="absolute top-[20%] right-[20%] w-[400px] h-[400px] rounded-full bg-blue-500/10 blur-[130px] opacity-50 dark:opacity-30" />
        <div className="landing-grid absolute inset-0" />
        <div className="landing-particles absolute inset-0" aria-hidden="true">
          {particles.map((particle, index) => (
            <span
              key={index}
              style={{
                left: particle.left,
                width: particle.size,
                height: particle.size,
                opacity: particle.opacity,
                animationDuration: particle.duration,
                animationDelay: particle.delay,
                "--particle-drift": particle.drift,
              } as CSSProperties}
            />
          ))}
        </div>
      </div>

      <div className="container mx-auto px-4 text-center relative z-10">
        {/* Top Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-muted/80 border border-border/80 text-xs font-medium text-foreground mb-8 shadow-xs">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <span>Unified Identity Provider & Single Sign-On</span>
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight mb-6 max-w-4xl mx-auto leading-[1.1] text-foreground">
          One Account for All <br className="hidden sm:inline" />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-blue-600 to-indigo-600 dark:from-primary dark:via-blue-400 dark:to-indigo-400">
            Your Applications
          </span>
        </h1>

        {/* Subtitle */}
        <p className="max-w-2xl mx-auto text-muted-foreground text-lg md:text-xl mb-10 leading-relaxed">
          Sign in once and gain secure, seamless access across all company services with social authentication, magic links, and centralized security control.
        </p>

        {/* Primary Single CTA Button */}
        <div className="flex items-center justify-center mb-14">
          <Link to="/login">
            <Button
              size="lg"
              className="rounded-xl px-8 h-13 text-base font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all gap-2 cursor-pointer"
            >
              Sign In to SSO <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        {/* Highlights Bar */}
        <div className="flex flex-wrap justify-center items-center gap-x-8 gap-y-3 text-xs md:text-sm font-medium text-muted-foreground mb-16">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <span>Google, GitHub, Meta & LinkedIn Auth</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <span>Passwordless Magic Link Sign-In</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <span>Centralized Session Security</span>
          </div>
        </div>

        {/* Clean SSO Portal Card Visual (No AI Terminal Slop) */}
        <div className="max-w-4xl mx-auto border border-border/80 rounded-2xl bg-card/90 shadow-2xl p-8 text-left backdrop-blur">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            {/* Left Auth Hub Preview */}
            <div className="space-y-5 w-full md:w-1/2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-base">SSO Identity Portal</h3>
                  <p className="text-xs text-muted-foreground">Centralized Authentication Service</p>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div className="p-3 rounded-lg bg-muted/60 border border-border/60 flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-emerald-500" /> Single Sign-On Access
                  </span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded text-[11px]">
                    Active
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-muted/60 border border-border/60 flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground flex items-center gap-2">
                    <Key className="w-4 h-4 text-blue-500" /> Social Identity Providers
                  </span>
                  <span className="text-muted-foreground font-mono text-[11px]">
                    Google, GitHub, Meta, LinkedIn
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-muted/60 border border-border/60 flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground flex items-center gap-2">
                    <Lock className="w-4 h-4 text-purple-500" /> Session Protection
                  </span>
                  <span className="text-muted-foreground font-mono text-[11px]">
                    Encrypted TLS 1.3
                  </span>
                </div>
              </div>
            </div>

            {/* Right Sign-In Preview Card */}
            <div className="w-full md:w-1/2 border border-border/80 rounded-xl bg-background p-6 space-y-4 shadow-sm">
              <div className="text-center space-y-1">
                <h4 className="font-bold text-foreground text-base">Sign In to Your Workspace</h4>
                <p className="text-xs text-muted-foreground">Access all connected applications</p>
              </div>

              <div className="space-y-2.5 pt-1">
                <div className="w-full h-9 rounded-lg bg-muted border border-border flex items-center justify-center text-xs font-medium text-foreground gap-2">
                  <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.29v3.15C3.26 21.3 7.31 24 12 24z"/><path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.29C.47 8.21 0 10.05 0 12s.47 3.79 1.29 5.42l3.99-3.15z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.58l3.99 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/></svg>
                  Continue with Google
                </div>
                <div className="w-full h-9 rounded-lg bg-muted border border-border flex items-center justify-center text-xs font-medium text-foreground gap-2">
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
                  Continue with GitHub
                </div>
              </div>

              <div className="relative my-2">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border"></div></div>
                <div className="relative flex justify-center text-[10px] uppercase text-muted-foreground"><span className="bg-background px-2">Or email</span></div>
              </div>

              <div className="space-y-2">
                <div className="h-8 rounded-md border border-border bg-muted/40 px-3 text-xs text-muted-foreground flex items-center">
                  you@company.com
                </div>
                <div className="h-8 rounded-md bg-primary text-primary-foreground text-xs font-semibold flex items-center justify-center">
                  Send Magic Link
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
