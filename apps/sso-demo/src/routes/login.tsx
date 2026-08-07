
import "@skycanvasstudio/sso/styles.css";
import { SignIn, SkyCanvasProvider } from "@skycanvasstudio/sso/react";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});


export function LoginPage() {
  return (
    <SkyCanvasProvider>
      <SignIn returnTo="/dashboard" />
    </SkyCanvasProvider>
  );
}