import "@skycanvasstudio/sso/styles.css";
import { SkyCanvasProvider, type SsoProviderProps } from "@skycanvasstudio/sso/react";
import { Outlet } from "@tanstack/react-router";

export function StandaloneLayout({ bootstrap }: Pick<SsoProviderProps, "bootstrap">) {
  return (
    <SkyCanvasProvider bootstrap={bootstrap}>
      <Outlet />
    </SkyCanvasProvider>
  );
}
