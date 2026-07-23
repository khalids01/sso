import { Shield, KeyRound, Sparkles, UserCheck, Lock, Globe } from "lucide-react";

const features = [
  {
    title: "Centralized Single Sign-On",
    description:
      "Sign in once to gain secure, seamless access across all connected applications in your company ecosystem.",
    icon: <UserCheck className="h-5 w-5 text-primary" />,
  },
  {
    title: "Social Authentication",
    description:
      "Instant sign-in via Google, GitHub, Meta (Facebook), or LinkedIn OAuth providers with per-application controls.",
    icon: <Globe className="h-5 w-5 text-primary" />,
  },
  {
    title: "Passwordless Magic Links",
    description:
      "Frictionless, high-security email sign-in links delivered straight to the user's inbox.",
    icon: <KeyRound className="h-5 w-5 text-primary" />,
  },
  {
    title: "Session Security & Revocation",
    description:
      "Monitor active login sessions, view active device details, and revoke sessions instantaneously.",
    icon: <Shield className="h-5 w-5 text-primary" />,
  },
  {
    title: "Encrypted Data Protection",
    description:
      "All credentials, tokens, and OAuth keys are cryptographically secured and encrypted at rest.",
    icon: <Lock className="h-5 w-5 text-primary" />,
  },
  {
    title: "OAuth Verification Compliant",
    description:
      "Built to strictly meet Google Limited Use requirements, Meta Data Deletion callbacks, and global privacy standards.",
    icon: <Sparkles className="h-5 w-5 text-primary" />,
  },
];

export const Features = () => {
  return (
    <section id="features" className="py-24 bg-muted/30 border-t border-border/40 text-left">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-foreground">
            Everything You Need for Application Identity
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg">
            A unified identity platform delivering modern authentication, social login, and session control.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="p-7 rounded-2xl border border-border/80 bg-card hover:border-primary/50 hover:shadow-lg transition-all duration-300 group flex flex-col justify-between"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold mb-2 text-foreground">{feature.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
