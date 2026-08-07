import { createFileRoute } from "@tanstack/react-router";
import { BetterAuthSignInPage } from "@/features/better-auth";

export const Route = createFileRoute("/better-auth/")({
  component: BetterAuthSignInPage,
});
