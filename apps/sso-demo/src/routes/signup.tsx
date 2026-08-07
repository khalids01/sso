import { createFileRoute } from "@tanstack/react-router";
import "@skycanvasstudio/sso/styles.css";
import { SignUp, SkyCanvasProvider } from "@skycanvasstudio/sso/react";

export const Route = createFileRoute("/signup")({
  component: SignupPage,
});


export function SignupPage() {
  return (
    <SkyCanvasProvider>
      <SignUp returnTo="/dashboard" />
    </SkyCanvasProvider>
  );
}