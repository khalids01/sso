import { Link, createFileRoute } from "@tanstack/react-router";
import { KeyRound, Layers3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-5 pt-12 md:px-8 md:pt-20">
      <Badge className="mb-6 w-fit">Two supported integrations</Badge>
      <h1 className="max-w-3xl text-5xl font-semibold leading-[1.05] tracking-[-0.045em] md:text-6xl">
        Test SkyCanvas SSO as your app would use it.
      </h1>
      <p className="mt-6 max-w-2xl text-lg leading-7 text-muted-foreground">
        The same published package powers a Clerk-like standalone setup and the
        optional Better Auth adapter.
      </p>

      <div className="mt-10 grid gap-5 md:grid-cols-2">
        <IntegrationCard
          icon={KeyRound}
          title="Clerk-like standalone"
          description="Render the packaged password form and authenticate without leaving this application."
          href="/standalone"
          action="Test embedded auth"
        />
        <IntegrationCard
          icon={Layers3}
          title="Better Auth adapter"
          description="Keep Better Auth in the consumer and delegate identity to SkyCanvas over OAuth + PKCE."
          href="/better-auth"
          action="Test Better Auth"
        />
      </div>
    </main>
  );
}

interface IntegrationCardProps {
  icon: typeof KeyRound;
  title: string;
  description: string;
  href: "/standalone" | "/better-auth";
  action: string;
}

function IntegrationCard({ icon: Icon, title, description, href, action }: IntegrationCardProps) {
  return (
    <Card className="bg-card/80">
      <CardHeader>
        <span className="mb-2 grid size-11 place-items-center rounded-xl bg-secondary">
          <Icon className="size-5 text-primary" />
        </span>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Link to={href} className={buttonVariants({ size: "lg" })}>{action}</Link>
      </CardContent>
    </Card>
  );
}
