import { createFileRoute } from "@tanstack/react-router";
import { StandaloneSignInPage } from "@/features/standalone";

export const Route = createFileRoute("/standalone/")({
  component: StandaloneSignInPage,
});
