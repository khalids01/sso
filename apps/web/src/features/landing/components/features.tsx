import { Zap, Shield, Rocket, Layers, BarChart3, Users } from "lucide-react";

const features = [
  {
    title: "Centralized Identity",
    description:
      "Manage user identities for internal tools and customer-facing applications from one control plane.",
    icon: <Zap className="h-6 w-6" />,
  },
  {
    title: "Secure by Default",
    description:
      "Built on Better Auth, Prisma, RBAC guards, protected owner rules, and safe session controls.",
    icon: <Shield className="h-6 w-6" />,
  },
  {
    title: "Application Access",
    description:
      "Prepare app-specific access, roles, scopes, and claims without mixing them into platform admin RBAC.",
    icon: <Rocket className="h-6 w-6" />,
  },
  {
    title: "Modular Architecture",
    description:
      "A modular TypeScript monorepo with clear boundaries between auth, RBAC, data, email, Redis, API, and web.",
    icon: <Layers className="h-6 w-6" />,
  },
  {
    title: "Operational Visibility",
    description:
      "Admin activity, visitor analytics, webhooks, rate-limit stats, and session device visibility are built in.",
    icon: <BarChart3 className="h-6 w-6" />,
  },
  {
    title: "Migration Ready",
    description: "Designed to replace the old production SSO while preserving the flows existing apps depend on.",
    icon: <Users className="h-6 w-6" />,
  },
];

export const Features = () => {
  return (
    <section id="features" className="py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4 tracking-tight">
            Everything needed to manage access
          </h2>
          <p className="text-muted-foreground text-lg">
            Keep identity, platform administration, and application access
            separate while managing them from one place.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="p-8 rounded-2xl border border-border bg-card hover:border-primary/50 hover:shadow-lg transition-all duration-300 group"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
              <p className="text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
