import { Shield, Cpu, Database, Server, RefreshCw, KeyRound, Globe2, Lock } from "lucide-react";

export const Architecture = () => {
  const specs = [
    {
      title: "OAuth 2.0 & OIDC Core",
      detail: "RFC 6749, RFC 7636 (PKCE S256), OpenID Connect Core 1.0",
      icon: <KeyRound className="w-5 h-5 text-primary" />,
      desc: "Supports authorization-code flow with PKCE, discovery documents, public JWKS verification, and 10-min RS256 tokens.",
    },
    {
      title: "Pairwise Subject Privacy",
      detail: "Algorithmically Isolated 'sub' Claims",
      icon: <Lock className="w-5 h-5 text-primary" />,
      desc: "Guarantees user privacy across connected client applications by generating unique cryptographic subjects per application client.",
    },
    {
      title: "Sub-Millisecond Redis Cache",
      detail: "Redis 7+ Key-Value Cache Engine",
      icon: <Database className="w-5 h-5 text-primary" />,
      desc: "Stores rate-limit counters, effective RBAC permissions, session revocation flags, and short-lived authorization codes.",
    },
    {
      title: "Per-App Social Federation",
      detail: "Google, GitHub, Meta, LinkedIn OAuth",
      icon: <Globe2 className="w-5 h-5 text-primary" />,
      desc: "Encrypted at rest per-client social provider credentials, enabling custom OAuth provider triggers for each reliance application.",
    },
    {
      title: "Durable Revocation Webhooks",
      detail: "HMAC Signed Event Delivery Worker",
      icon: <RefreshCw className="w-5 h-5 text-primary" />,
      desc: "Background delivery worker sends signed revocation webhooks to client backend receivers whenever sessions or roles change.",
    },
    {
      title: "Isolated Admin RBAC",
      detail: "Prisma PostgreSQL & Session Permission Guards",
      icon: <Shield className="w-5 h-5 text-primary" />,
      desc: "Platform administration and identity users stay strictly separated; non-owner admins cannot access or mutate owner accounts.",
    },
  ];

  return (
    <section id="architecture" className="py-24 bg-muted/30 border-t border-border/40 text-left">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
            <Cpu className="w-3.5 h-3.5" />
            Protocol & Architecture Specs
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-foreground">
            Built for Scale, Security & Developer Ergonomics
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg">
            Designed as a modern TypeScript monorepo with Bun, Elysia, TanStack, Prisma, and Redis.
          </p>
        </div>

        {/* Spec Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {specs.map((spec, index) => (
            <div
              key={index}
              className="p-6 rounded-2xl border border-border/80 bg-card hover:border-primary/50 hover:shadow-lg transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-5">
                  {spec.icon}
                </div>
                <h3 className="text-lg font-bold text-foreground mb-1">{spec.title}</h3>
                <span className="text-xs font-mono font-medium text-primary block mb-3">{spec.detail}</span>
                <p className="text-muted-foreground text-sm leading-relaxed">{spec.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tech Stack Bar */}
        <div className="mt-16 p-6 rounded-2xl border border-border/80 bg-card/60 flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <Server className="w-6 h-6 text-primary" />
            <div>
              <h4 className="font-bold text-sm text-foreground">Deployment-Gated Infrastructure</h4>
              <p className="text-xs text-muted-foreground">Self-hostable via Dokploy, Docker Compose, or VPS Kubernetes environments.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-muted-foreground">
            <span className="px-3 py-1 rounded-md bg-muted border border-border font-semibold text-foreground">Bun + TypeScript</span>
            <span className="px-3 py-1 rounded-md bg-muted border border-border font-semibold text-foreground">Elysia API</span>
            <span className="px-3 py-1 rounded-md bg-muted border border-border font-semibold text-foreground">TanStack Start</span>
            <span className="px-3 py-1 rounded-md bg-muted border border-border font-semibold text-foreground">Prisma + PostgreSQL</span>
            <span className="px-3 py-1 rounded-md bg-muted border border-border font-semibold text-foreground">Redis 7+</span>
          </div>
        </div>
      </div>
    </section>
  );
};
